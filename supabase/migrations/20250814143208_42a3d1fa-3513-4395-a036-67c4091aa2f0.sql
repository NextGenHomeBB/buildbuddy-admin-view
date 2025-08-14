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