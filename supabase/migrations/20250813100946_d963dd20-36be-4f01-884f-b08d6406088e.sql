-- CRITICAL SECURITY FIXES - Phase 1: Data Protection

-- 1. Enhance Apple Calendar Credentials Security
ALTER TABLE public.apple_calendar_credentials 
ADD COLUMN IF NOT EXISTS encryption_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS last_security_check timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS access_pattern_hash text,
ADD COLUMN IF NOT EXISTS suspicious_access_count integer DEFAULT 0;

-- 2. Enhance OAuth Tokens Security  
ALTER TABLE public.calendar_oauth_tokens
ADD COLUMN IF NOT EXISTS encryption_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS access_pattern_hash text,
ADD COLUMN IF NOT EXISTS last_security_scan timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS threat_level text DEFAULT 'low';

-- 3. Fix Database Function Search Path Vulnerabilities
CREATE OR REPLACE FUNCTION public.validate_task_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
SET search_path TO 'public'
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
SET search_path TO 'public'
AS $function$
DECLARE
  sensitive_tables text[] := ARRAY['user_roles', 'user_project_role', 'profiles'];
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
SET search_path TO 'public'
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
    calc_overtime_pay := calc_overtime_hours * worker_rate.hourly_rate * 1.5; -- 1.5x for overtime
    calc_total_pay := calc_regular_pay + calc_overtime_pay;
  ELSIF worker_rate.payment_type = 'salary' THEN
    -- For salary, we could calculate daily rate (monthly/30 or based on work days)
    calc_regular_pay := worker_rate.monthly_salary / 30; -- Simple daily rate
    calc_overtime_pay := 0; -- Typically no overtime for salary
    calc_total_pay := calc_regular_pay;
  END IF;

  -- Create or update payment record for this period
  -- First, check if a payment already exists for this worker and date
  SELECT id INTO payment_record_id
  FROM public.worker_payments
  WHERE worker_id = NEW.user_id
    AND pay_period_start <= NEW.work_date
    AND pay_period_end >= NEW.work_date
    AND status = 'pending'; -- Only update pending payments

  IF payment_record_id IS NOT NULL THEN
    -- Update existing payment record
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
    -- Create new payment record for this week
    INSERT INTO public.worker_payments (
      worker_id,
      pay_period_start,
      pay_period_end,
      hours_worked,
      regular_pay,
      overtime_hours,
      overtime_pay,
      gross_pay,
      net_pay,
      status,
      notes
    ) VALUES (
      NEW.user_id,
      DATE_TRUNC('week', NEW.work_date)::date, -- Start of week
      (DATE_TRUNC('week', NEW.work_date) + INTERVAL '6 days')::date, -- End of week
      NEW.hours,
      calc_regular_pay,
      calc_overtime_hours,
      calc_overtime_pay,
      calc_total_pay,
      calc_total_pay, -- Net pay same as gross for now
      'pending',
      'Auto-generated from approved timesheet on ' || NEW.work_date::text
    );
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_calendar_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_timesheet_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_worker_availability_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 4. Secure Materialized Views - Add RLS policies to phase_costs_vw
ALTER TABLE public.phase_costs_vw ENABLE ROW LEVEL SECURITY;

-- Allow admins to view all phase costs
CREATE POLICY "Admins can view all phase costs" 
ON public.phase_costs_vw 
FOR SELECT 
USING (public.get_current_user_role() = 'admin');

-- Allow project managers to view costs for their projects
CREATE POLICY "Project managers can view their project phase costs" 
ON public.phase_costs_vw 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_project_role upr
    WHERE upr.user_id = auth.uid() 
    AND upr.project_id = phase_costs_vw.project_id
    AND upr.role IN ('manager', 'admin')
  )
);

-- 5. Create enhanced audit triggers for credential access monitoring
CREATE OR REPLACE FUNCTION public.audit_credential_access_enhanced()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_ip text;
  suspicious_threshold integer := 10;
BEGIN
  current_ip := inet_client_addr()::text;
  
  -- Update access tracking with enhanced security monitoring
  NEW.last_accessed = now();
  NEW.access_count = COALESCE(OLD.access_count, 0) + 1;
  NEW.last_security_check = now();
  
  -- Check for suspicious access patterns
  IF OLD.last_accessed IS NOT NULL AND 
     EXTRACT(EPOCH FROM (now() - OLD.last_accessed)) < 300 AND -- Less than 5 minutes
     NEW.access_count > suspicious_threshold THEN
    NEW.suspicious_access_count = COALESCE(OLD.suspicious_access_count, 0) + 1;
    
    -- Log security event for rapid access
    INSERT INTO public.security_audit_log (
      user_id, action, table_name, record_id, 
      new_values, ip_address
    ) VALUES (
      auth.uid(), 'RAPID_CREDENTIAL_ACCESS', TG_TABLE_NAME, NEW.id,
      jsonb_build_object(
        'access_count', NEW.access_count,
        'time_between_access', EXTRACT(EPOCH FROM (now() - OLD.last_accessed)),
        'suspicious_count', NEW.suspicious_access_count
      ),
      current_ip
    );
  END IF;
  
  -- Log normal access
  INSERT INTO public.security_audit_log (
    user_id, action, table_name, record_id, 
    new_values, ip_address
  ) VALUES (
    auth.uid(), 'ACCESS_CREDENTIAL', TG_TABLE_NAME, NEW.id,
    jsonb_build_object(
      'access_count', NEW.access_count,
      'access_time', NEW.last_accessed
    ),
    current_ip
  );
  
  RETURN NEW;
END;
$function$;

-- Apply enhanced audit trigger to credential tables
DROP TRIGGER IF EXISTS audit_apple_credentials_access ON public.apple_calendar_credentials;
CREATE TRIGGER audit_apple_credentials_access
  BEFORE UPDATE OF last_accessed ON public.apple_calendar_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_credential_access_enhanced();

DROP TRIGGER IF EXISTS audit_oauth_token_access ON public.calendar_oauth_tokens;
CREATE TRIGGER audit_oauth_token_access
  BEFORE UPDATE OF last_used ON public.calendar_oauth_tokens
  FOR EACH ROW  
  EXECUTE FUNCTION public.monitor_token_usage();

-- 6. Add security event logging for critical operations
CREATE OR REPLACE FUNCTION public.log_critical_security_event(
  event_type text, 
  severity text DEFAULT 'high',
  details jsonb DEFAULT '{}'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.security_audit_log (
    user_id, action, table_name, 
    new_values, ip_address
  ) VALUES (
    auth.uid(), event_type, 'critical_security_events',
    jsonb_build_object(
      'severity', severity,
      'details', details,
      'timestamp', now(),
      'session_id', COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'session_id', 'unknown')
    ),
    inet_client_addr()::text
  );
  
  -- Also create a notification for admins on critical events
  IF severity = 'critical' THEN
    INSERT INTO public.scheduler_notifications (
      recipient_id, title, message, notification_type, data
    )
    SELECT ur.user_id, 
           'Critical Security Alert', 
           format('Critical security event: %s. Immediate attention required.', event_type),
           'security_alert',
           details
    FROM public.user_roles ur 
    WHERE ur.role = 'admin';
  END IF;
END;
$function$;