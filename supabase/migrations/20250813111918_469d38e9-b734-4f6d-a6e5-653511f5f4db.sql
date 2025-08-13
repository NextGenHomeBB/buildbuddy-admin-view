-- PHASE 1: CRITICAL SECURITY FIXES

-- Fix database functions with search path vulnerabilities
CREATE OR REPLACE FUNCTION public.validate_task_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- If assigning a task to someone, verify they have project access
  IF NEW.assignee IS NOT NULL AND NEW.project_id IS NOT NULL THEN
    -- Check if assignee has access to the project
    IF NOT EXISTS (
      SELECT 1 FROM public.user_project_role 
      WHERE user_id = NEW.assignee AND project_id = NEW.project_id
    ) AND NOT public.user_has_role(NEW.assignee, 'admin'::public.app_role) THEN
      RAISE EXCEPTION 'Cannot assign task to user without project access';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_role_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Prevent self-assignment of admin or manager roles unless done by an admin
  IF NEW.role IN ('admin', 'manager') AND NEW.user_id = auth.uid() THEN
    IF NOT public.user_has_role(auth.uid(), 'admin'::public.app_role) THEN
      RAISE EXCEPTION 'Users cannot assign themselves admin or manager roles';
    END IF;
  END IF;
  
  -- Only admins can assign admin role
  IF NEW.role = 'admin' AND NOT public.user_has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins can assign admin roles';
  END IF;
  
  -- Only admins or managers can assign manager role
  IF NEW.role = 'manager' AND NOT (public.user_has_role(auth.uid(), 'admin'::public.app_role) OR public.user_has_role(auth.uid(), 'manager'::public.app_role)) THEN
    RAISE EXCEPTION 'Only admins or managers can assign manager roles';
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enhanced_audit_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  sensitive_tables text[] := ARRAY['user_roles', 'user_project_role', 'profiles', 'documents', 'document_payments'];
BEGIN
  -- Log all operations on sensitive tables with additional context
  IF TG_TABLE_NAME = ANY(sensitive_tables) THEN
    INSERT INTO public.security_audit_log (
      user_id, 
      action, 
      table_name, 
      record_id, 
      old_values, 
      new_values,
      ip_address
    ) VALUES (
      auth.uid(), 
      TG_OP, 
      TG_TABLE_NAME, 
      COALESCE(NEW.id, OLD.id),
      CASE WHEN TG_OP != 'INSERT' THEN row_to_json(OLD) END,
      CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW) END,
      inet_client_addr()::text
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_create_payment_from_shift()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  worker_rate RECORD;
  calc_regular_hours NUMERIC := 0;
  calc_overtime_hours NUMERIC := 0;
  calc_regular_pay NUMERIC := 0;
  calc_overtime_pay NUMERIC := 0;
  calc_total_pay NUMERIC := 0;
  payment_record_id UUID;
BEGIN
  -- Only process if timesheet is approved and we have actual hours worked
  IF NEW.approval_status != 'approved' OR NEW.hours IS NULL OR NEW.hours <= 0 THEN
    RETURN NEW;
  END IF;

  -- Get the current active rate for this worker
  SELECT * INTO worker_rate
  FROM public.worker_rates wr
  WHERE wr.worker_id = NEW.user_id
    AND wr.effective_date <= NEW.work_date
    AND (wr.end_date IS NULL OR wr.end_date >= NEW.work_date)
  ORDER BY wr.effective_date DESC
  LIMIT 1;

  -- If no rate found, skip payment creation
  IF worker_rate IS NULL THEN
    RETURN NEW;
  END IF;

  -- Calculate regular and overtime hours (over 8 hours = overtime)
  IF NEW.hours > 8 THEN
    calc_regular_hours := 8;
    calc_overtime_hours := NEW.hours - 8;
  ELSE
    calc_regular_hours := NEW.hours;
    calc_overtime_hours := 0;
  END IF;

  -- Calculate pay based on payment type
  IF worker_rate.payment_type = 'hourly' THEN
    calc_regular_pay := calc_regular_hours * worker_rate.hourly_rate;
    calc_overtime_pay := calc_overtime_hours * worker_rate.hourly_rate * 1.5;
    calc_total_pay := calc_regular_pay + calc_overtime_pay;
  ELSIF worker_rate.payment_type = 'salary' THEN
    calc_regular_pay := worker_rate.monthly_salary / 30;
    calc_overtime_pay := 0;
    calc_total_pay := calc_regular_pay;
  END IF;

  -- Create or update payment record for this period
  SELECT id INTO payment_record_id
  FROM public.worker_payments
  WHERE worker_id = NEW.user_id
    AND pay_period_start <= NEW.work_date
    AND pay_period_end >= NEW.work_date
    AND status = 'pending';

  IF payment_record_id IS NOT NULL THEN
    UPDATE public.worker_payments
    SET 
      hours_worked = COALESCE(hours_worked, 0) + NEW.hours,
      regular_pay = COALESCE(worker_payments.regular_pay, 0) + calc_regular_pay,
      overtime_hours = COALESCE(worker_payments.overtime_hours, 0) + calc_overtime_hours,
      overtime_pay = COALESCE(worker_payments.overtime_pay, 0) + calc_overtime_pay,
      gross_pay = COALESCE(worker_payments.gross_pay, 0) + calc_total_pay,
      net_pay = COALESCE(worker_payments.gross_pay, 0) + calc_total_pay - COALESCE(deductions, 0),
      updated_at = NOW()
    WHERE id = payment_record_id;
  ELSE
    INSERT INTO public.worker_payments (
      worker_id, pay_period_start, pay_period_end, hours_worked,
      regular_pay, overtime_hours, overtime_pay, gross_pay, net_pay,
      status, notes
    ) VALUES (
      NEW.user_id,
      DATE_TRUNC('week', NEW.work_date)::date,
      (DATE_TRUNC('week', NEW.work_date) + INTERVAL '6 days')::date,
      NEW.hours, calc_regular_pay, calc_overtime_hours, calc_overtime_pay,
      calc_total_pay, calc_total_pay, 'pending',
      'Auto-generated from approved timesheet on ' || NEW.work_date::text
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Enhanced calendar credential security
CREATE OR REPLACE FUNCTION public.monitor_credential_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  current_ip text;
  recent_access_count integer;
BEGIN
  current_ip := inet_client_addr()::text;
  
  -- Count recent access attempts from different IPs
  SELECT COUNT(DISTINCT ip_address) INTO recent_access_count
  FROM public.security_audit_log
  WHERE user_id = auth.uid()
    AND action = 'ACCESS_CREDENTIAL'
    AND timestamp > now() - INTERVAL '1 hour';
  
  -- Flag suspicious activity if accessed from more than 3 different IPs in 1 hour
  IF recent_access_count > 3 THEN
    INSERT INTO public.security_audit_log (
      user_id, action, table_name, record_id,
      new_values, ip_address
    ) VALUES (
      auth.uid(), 'SUSPICIOUS_CREDENTIAL_ACCESS', 'apple_calendar_credentials', NEW.id,
      jsonb_build_object(
        'ip_count', recent_access_count,
        'current_ip', current_ip,
        'threat_level', 'high'
      ),
      current_ip
    );
  END IF;
  
  -- Update access tracking
  NEW.last_accessed = now();
  NEW.access_count = COALESCE(OLD.access_count, 0) + 1;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for enhanced credential monitoring
DROP TRIGGER IF EXISTS monitor_credential_access_trigger ON public.apple_calendar_credentials;
CREATE TRIGGER monitor_credential_access_trigger
  BEFORE UPDATE ON public.apple_calendar_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.monitor_credential_access();

-- Enhanced RLS policies for financial data protection
DROP POLICY IF EXISTS "Managers can manage documents for their projects" ON public.documents;
CREATE POLICY "Enhanced document access control" ON public.documents
FOR ALL USING (
  -- Admins have full access
  get_current_user_role() = 'admin' OR
  -- Project managers can access documents for their projects
  (get_current_user_role() = 'manager' AND EXISTS (
    SELECT 1 FROM public.user_project_role upr
    WHERE upr.user_id = auth.uid() 
    AND upr.project_id = documents.project_id
    AND upr.role IN ('manager', 'admin')
  )) OR
  -- Document creators can access their own documents
  created_by = auth.uid()
);

-- Create secure view for customer data with data masking
CREATE OR REPLACE VIEW public.secure_customer_data AS
SELECT 
  id,
  document_number,
  document_type,
  status,
  -- Mask sensitive customer data for non-admins
  CASE 
    WHEN get_current_user_role() = 'admin' THEN client_name
    ELSE CONCAT(LEFT(client_name, 3), '***')
  END as client_name,
  CASE 
    WHEN get_current_user_role() = 'admin' THEN client_email
    ELSE CONCAT(LEFT(SPLIT_PART(client_email, '@', 1), 2), '***@', SPLIT_PART(client_email, '@', 2))
  END as client_email,
  CASE 
    WHEN get_current_user_role() = 'admin' THEN client_phone
    ELSE CONCAT('***', RIGHT(client_phone, 4))
  END as client_phone,
  -- Financial data only for authorized users
  CASE 
    WHEN get_current_user_role() IN ('admin', 'manager') THEN total_amount
    ELSE NULL
  END as total_amount,
  CASE 
    WHEN get_current_user_role() IN ('admin', 'manager') THEN amount_paid
    ELSE NULL
  END as amount_paid,
  project_id,
  created_at,
  updated_at
FROM public.documents
WHERE get_current_user_role() = 'admin' OR 
      created_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.user_project_role upr
        WHERE upr.user_id = auth.uid() 
        AND upr.project_id = documents.project_id
      );

-- Enhanced security monitoring function
CREATE OR REPLACE FUNCTION public.log_high_risk_activity(
  event_type text,
  risk_level text DEFAULT 'medium',
  details jsonb DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.security_audit_log (
    user_id, action, table_name,
    new_values, ip_address
  ) VALUES (
    auth.uid(), 
    CONCAT('HIGH_RISK_', UPPER(event_type)), 
    'security_events',
    jsonb_build_object(
      'risk_level', risk_level,
      'details', details,
      'timestamp', now(),
      'user_agent', current_setting('request.headers', true)::json->>'user-agent'
    ),
    inet_client_addr()::text
  );
  
  -- Auto-escalate critical events
  IF risk_level = 'critical' THEN
    -- Additional alerting logic could go here
    RAISE WARNING 'Critical security event detected: %', event_type;
  END IF;
END;
$function$;