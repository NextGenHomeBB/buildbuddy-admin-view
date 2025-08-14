-- Security hardening: Add SET search_path = 'public' to functions missing this protection
-- This prevents search path manipulation attacks

-- Fix handle_new_timesheet function
CREATE OR REPLACE FUNCTION public.handle_new_timesheet()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Set initial sync status
  NEW.sync_status = 'pending';
  NEW.synced_at = NULL;
  NEW.sync_error = NULL;
  
  RETURN NEW;
END;
$function$;

-- Fix update_calendar_updated_at function
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

-- Fix set_document_payments_defaults function
CREATE OR REPLACE FUNCTION public.set_document_payments_defaults()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.created_by IS NULL THEN
      NEW.created_by := auth.uid();
    END IF;
    NEW.created_at := now();
    NEW.updated_at := now();
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$function$;

-- Fix add_creator_to_members function
CREATE OR REPLACE FUNCTION public.add_creator_to_members()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.organization_members(org_id, user_id, role)
  values (new.id, new.created_by, 'org_admin')
  on conflict do nothing;
  return new;
end; 
$function$;

-- Fix refresh_document_payment_status function
CREATE OR REPLACE FUNCTION public.refresh_document_payment_status(p_document_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_paid numeric := 0;
  v_total numeric := 0;
BEGIN
  SELECT COALESCE(SUM(amount),0) INTO v_paid
  FROM public.document_payments
  WHERE document_id = p_document_id;

  SELECT total_amount INTO v_total FROM public.documents WHERE id = p_document_id;

  UPDATE public.documents
  SET amount_paid = v_paid,
      payment_status = CASE 
        WHEN v_paid >= v_total AND v_total > 0 THEN 'paid'
        WHEN v_paid > 0 THEN 'partial'
        ELSE 'pending'
      END,
      paid_at = CASE WHEN v_paid >= v_total AND v_total > 0 THEN now() ELSE paid_at END,
      updated_at = now()
  WHERE id = p_document_id;
END;
$function$;

-- Fix next_document_number function
CREATE OR REPLACE FUNCTION public.next_document_number(doc_type text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_year INTEGER;
  next_num INTEGER;
  prefix TEXT;
  result TEXT;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  
  -- Check if we need to reset for new year
  UPDATE public.document_sequences 
  SET current_number = 0, year = current_year, updated_at = now()
  WHERE document_type = doc_type AND year < current_year;
  
  -- Get and increment the next number atomically
  UPDATE public.document_sequences 
  SET current_number = current_number + 1, updated_at = now()
  WHERE document_type = doc_type AND year = current_year
  RETURNING current_number, prefix INTO next_num, prefix;
  
  -- Format: PREFIX-YEAR-NUMBER (e.g., Q-2024-001)
  result := prefix || '-' || current_year || '-' || LPAD(next_num::TEXT, 3, '0');
  
  RETURN result;
END;
$function$;

-- Fix document_payments_changed function
CREATE OR REPLACE FUNCTION public.document_payments_changed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.refresh_document_payment_status(COALESCE(NEW.document_id, OLD.document_id));
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Fix check_timer_overlap function
CREATE OR REPLACE FUNCTION public.check_timer_overlap(p_user_id uuid, p_start_time timestamp with time zone DEFAULT now(), p_exclude_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if user has any open timer (end_at IS NULL)
  IF EXISTS (
    SELECT 1 
    FROM public.time_logs 
    WHERE user_id = p_user_id 
      AND end_at IS NULL 
      AND (p_exclude_id IS NULL OR id != p_exclude_id)
  ) THEN
    RETURN FALSE; -- Overlap found
  END IF;
  
  RETURN TRUE; -- No overlap
END;
$function$;

-- Fix audit_trigger_function
CREATE OR REPLACE FUNCTION public.audit_trigger_function()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.security_audit_log (user_id, action, table_name, record_id, new_values, ip_address)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, NEW.id, row_to_json(NEW), inet_client_addr()::text);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.security_audit_log (user_id, action, table_name, record_id, old_values, new_values, ip_address)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, NEW.id, row_to_json(OLD), row_to_json(NEW), inet_client_addr()::text);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.security_audit_log (user_id, action, table_name, record_id, old_values, ip_address)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, OLD.id, row_to_json(OLD), inet_client_addr()::text);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

-- Fix check_shift_overlap function
CREATE OR REPLACE FUNCTION public.check_shift_overlap(p_worker_id uuid, p_start_time timestamp with time zone, p_end_time timestamp with time zone, p_exclude_shift_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Check for overlapping shifts for the same worker
  IF EXISTS (
    SELECT 1 
    FROM public.shifts 
    WHERE worker_id = p_worker_id 
      AND status IN ('confirmed', 'proposed')
      AND (p_exclude_shift_id IS NULL OR id != p_exclude_shift_id)
      AND (
        (start_time <= p_start_time AND end_time > p_start_time) OR
        (start_time < p_end_time AND end_time >= p_end_time) OR
        (start_time >= p_start_time AND end_time <= p_end_time)
      )
  ) THEN
    RETURN FALSE; -- Overlap found
  END IF;
  
  RETURN TRUE; -- No overlap
END;
$function$;

-- Fix validate_task_assignment function
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

-- Fix notify_shift_proposals function
CREATE OR REPLACE FUNCTION public.notify_shift_proposals(proposal_count integer, target_date date)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  admin_user RECORD;
BEGIN
  -- Notify all admin users
  FOR admin_user IN 
    SELECT DISTINCT ur.user_id 
    FROM public.user_roles ur 
    WHERE ur.role = 'admin'
  LOOP
    INSERT INTO public.scheduler_notifications (
      recipient_id,
      title,
      message,
      data
    ) VALUES (
      admin_user.user_id,
      'New Shift Proposals Available',
      format('%s shift proposals have been generated for %s. Please review and confirm.', 
             proposal_count, target_date::text),
      json_build_object(
        'proposal_count', proposal_count,
        'target_date', target_date,
        'action_url', '/admin/schedule/auto'
      )::jsonb
    );
  END LOOP;
END;
$function$;

-- Fix update_timesheet_updated_at function
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

-- Fix validate_role_assignment function
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

-- Fix enhanced_credential_audit function
CREATE OR REPLACE FUNCTION public.enhanced_credential_audit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Update access tracking
  NEW.last_accessed = now();
  NEW.access_count = COALESCE(OLD.access_count, 0) + 1;
  
  -- Log high-priority access attempt
  INSERT INTO public.security_audit_log (
    user_id, action, table_name, record_id, 
    new_values, ip_address
  ) VALUES (
    auth.uid(), 'CREDENTIAL_ACCESS_HIGH_RISK', 'apple_calendar_credentials', NEW.id,
    jsonb_build_object(
      'access_count', NEW.access_count,
      'access_time', NEW.last_accessed,
      'credential_type', 'apple_calendar',
      'security_level', 'critical'
    ),
    inet_client_addr()::text
  );
  
  RETURN NEW;
END;
$function$;

-- Fix get_my_tasks function
CREATE OR REPLACE FUNCTION public.get_my_tasks()
 RETURNS TABLE(id uuid, title text, description text, status text, priority text, assigned_worker_id uuid, due_date timestamp without time zone, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.title,
    t.description,
    t.status,
    t.priority,
    t.assignee as assigned_worker_id,
    t.completed_at::timestamp without time zone as due_date,
    t.created_at,
    t.updated_at
  FROM public.tasks t
  WHERE t.assignee = auth.uid()
  ORDER BY t.created_at DESC;
END;
$function$;

-- Add enhanced security monitoring function
CREATE OR REPLACE FUNCTION public.get_security_dashboard_metrics()
 RETURNS TABLE(
   total_events integer,
   critical_events integer,
   events_last_24h integer,
   failed_logins integer,
   rate_limit_violations integer,
   threat_level text
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  total_count integer := 0;
  critical_count integer := 0;
  recent_count integer := 0;
  failed_login_count integer := 0;
  rate_limit_count integer := 0;
  calculated_threat_level text := 'low';
BEGIN
  -- Only allow admins to access
  IF NOT user_has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  -- Count total security events
  SELECT COUNT(*) INTO total_count
  FROM public.security_audit_log
  WHERE timestamp > now() - INTERVAL '7 days';

  -- Count critical events
  SELECT COUNT(*) INTO critical_count
  FROM public.security_audit_log
  WHERE timestamp > now() - INTERVAL '7 days'
    AND (action LIKE '%CRITICAL%' OR action LIKE '%HIGH_RISK%');

  -- Count events in last 24 hours
  SELECT COUNT(*) INTO recent_count
  FROM public.security_audit_log
  WHERE timestamp > now() - INTERVAL '24 hours';

  -- Count failed login attempts
  SELECT COUNT(*) INTO failed_login_count
  FROM public.security_audit_log
  WHERE timestamp > now() - INTERVAL '24 hours'
    AND action LIKE '%LOGIN_FAILED%';

  -- Count rate limit violations
  SELECT COUNT(*) INTO rate_limit_count
  FROM public.security_audit_log
  WHERE timestamp > now() - INTERVAL '24 hours'
    AND action LIKE '%RATE_LIMIT%';

  -- Calculate threat level
  IF critical_count > 10 OR rate_limit_count > 50 THEN
    calculated_threat_level := 'critical';
  ELSIF critical_count > 5 OR recent_count > 100 THEN
    calculated_threat_level := 'high';
  ELSIF critical_count > 0 OR recent_count > 50 THEN
    calculated_threat_level := 'medium';
  END IF;

  RETURN QUERY SELECT 
    total_count,
    critical_count,
    recent_count,
    failed_login_count,
    rate_limit_count,
    calculated_threat_level;
END;
$function$;

-- Create function to rotate security tokens (admin only)
CREATE OR REPLACE FUNCTION public.rotate_security_tokens()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  rotated_count integer := 0;
BEGIN
  -- Only allow admins
  IF NOT user_has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  -- Log the token rotation attempt
  INSERT INTO public.security_audit_log (
    user_id, action, table_name,
    new_values, ip_address
  ) VALUES (
    auth.uid(), 'SECURITY_TOKEN_ROTATION_INITIATED', 'security_operations',
    jsonb_build_object(
      'initiated_by', auth.uid(),
      'rotation_time', now(),
      'operation_type', 'token_rotation'
    ),
    inet_client_addr()::text
  );

  -- Update acceptance tokens for documents (force regeneration)
  UPDATE public.documents 
  SET acceptance_token = gen_random_uuid()::text,
      updated_at = now()
  WHERE acceptance_token IS NOT NULL;
  
  GET DIAGNOSTICS rotated_count = ROW_COUNT;

  -- Mark OAuth tokens as suspicious for review
  UPDATE public.calendar_oauth_tokens
  SET suspicious_activity = true,
      updated_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'tokens_rotated', rotated_count,
    'message', 'Security tokens have been rotated successfully'
  );
END;
$function$;