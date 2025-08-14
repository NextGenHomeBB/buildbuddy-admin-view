-- Final Security Hardening: Fix remaining function search path issues
-- This addresses the remaining WARN level security findings

-- Fix all remaining SECURITY DEFINER functions that need search_path protection
CREATE OR REPLACE FUNCTION public.update_calendar_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_timesheet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  -- Set initial sync status
  NEW.sync_status = 'pending';
  NEW.synced_at = NULL;
  NEW.sync_error = NULL;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_document_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  UPDATE public.documents 
  SET 
    subtotal = (
      SELECT COALESCE(SUM(line_total), 0) 
      FROM public.document_lines 
      WHERE document_id = COALESCE(NEW.document_id, OLD.document_id)
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.document_id, OLD.document_id);
  
  -- Update total_amount (subtotal + tax)
  UPDATE public.documents 
  SET 
    tax_amount = subtotal * (tax_rate / 100),
    total_amount = subtotal + (subtotal * (tax_rate / 100))
  WHERE id = COALESCE(NEW.document_id, OLD.document_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.assign_document_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  -- Only assign number if not already set
  IF NEW.document_number IS NULL OR NEW.document_number = '' THEN
    NEW.document_number := public.next_document_number(NEW.document_type);
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_timer_overlap(p_user_id uuid, p_start_time timestamp with time zone DEFAULT now(), p_exclude_id uuid DEFAULT NULL::uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.security_audit_log (user_id, action, table_name, record_id, new_values, ip_address)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, NEW.id, row_to_json(NEW), coalesce(inet_client_addr()::text, 'unknown'));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.security_audit_log (user_id, action, table_name, record_id, old_values, new_values, ip_address)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, NEW.id, row_to_json(OLD), row_to_json(NEW), coalesce(inet_client_addr()::text, 'unknown'));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.security_audit_log (user_id, action, table_name, record_id, old_values, ip_address)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, OLD.id, row_to_json(OLD), coalesce(inet_client_addr()::text, 'unknown'));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_shift_overlap(p_worker_id uuid, p_start_time timestamp with time zone, p_end_time timestamp with time zone, p_exclude_shift_id uuid DEFAULT NULL::uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

CREATE OR REPLACE FUNCTION public.validate_task_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

CREATE OR REPLACE FUNCTION public.notify_shift_proposals(proposal_count integer, target_date date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

-- Add comments indicating security hardening completion
COMMENT ON FUNCTION public.update_calendar_updated_at IS 'SECURITY FIX: Added search_path protection to prevent search path injection attacks.';
COMMENT ON FUNCTION public.handle_new_timesheet IS 'SECURITY FIX: Added search_path protection to prevent search path injection attacks.';
COMMENT ON FUNCTION public.update_document_totals IS 'SECURITY FIX: Added search_path protection to prevent search path injection attacks.';
COMMENT ON FUNCTION public.assign_document_number IS 'SECURITY FIX: Added search_path protection to prevent search path injection attacks.';
COMMENT ON FUNCTION public.check_timer_overlap IS 'SECURITY FIX: Added search_path protection to prevent search path injection attacks.';
COMMENT ON FUNCTION public.audit_trigger_function IS 'SECURITY FIX: Added search_path protection to prevent search path injection attacks.';
COMMENT ON FUNCTION public.check_shift_overlap IS 'SECURITY FIX: Added search_path protection to prevent search path injection attacks.';
COMMENT ON FUNCTION public.validate_task_assignment IS 'SECURITY FIX: Added search_path protection to prevent search path injection attacks.';
COMMENT ON FUNCTION public.notify_shift_proposals IS 'SECURITY FIX: Added search_path protection to prevent search path injection attacks.';