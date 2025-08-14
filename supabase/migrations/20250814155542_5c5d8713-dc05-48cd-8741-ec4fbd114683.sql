-- Phase 1: Critical Data Protection - Remove dependent policies and implement security

-- 1. Drop dependent policies first
DROP POLICY IF EXISTS "hr_justified_personal_data_access" ON profiles;
DROP POLICY IF EXISTS "block_direct_select_force_rpc_usage" ON apple_calendar_credentials;
DROP POLICY IF EXISTS "block_direct_insert_force_rpc_usage" ON apple_calendar_credentials;
DROP POLICY IF EXISTS "block_direct_update_force_rpc_usage" ON apple_calendar_credentials;
DROP POLICY IF EXISTS "block_direct_delete_force_rpc_usage" ON apple_calendar_credentials;
DROP POLICY IF EXISTS "block_direct_salary_select_force_rpc_usage" ON worker_rates;
DROP POLICY IF EXISTS "block_direct_salary_insert_force_rpc_usage" ON worker_rates;
DROP POLICY IF EXISTS "block_direct_salary_update_force_rpc_usage" ON worker_rates;
DROP POLICY IF EXISTS "block_direct_salary_delete_force_rpc_usage" ON worker_rates;

-- 2. Drop conflicting functions
DROP FUNCTION IF EXISTS public.safe_log_critical_security_event(text,text,jsonb) CASCADE;

-- 3. Create comprehensive rate limiting and security functions
CREATE OR REPLACE FUNCTION public.check_rate_limit_enhanced(
  operation_name text,
  max_attempts integer DEFAULT 5,
  window_minutes integer DEFAULT 15
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_attempts integer;
  window_start_time timestamp with time zone;
BEGIN
  window_start_time := now() - (window_minutes || ' minutes')::interval;
  
  DELETE FROM public.rate_limits WHERE window_start < window_start_time;
  
  SELECT COALESCE(SUM(attempt_count), 0) INTO current_attempts
  FROM public.rate_limits
  WHERE user_id = auth.uid() 
    AND operation = operation_name 
    AND window_start >= window_start_time;
  
  IF current_attempts >= max_attempts THEN
    RETURN false;
  END IF;
  
  INSERT INTO public.rate_limits (user_id, operation, attempt_count, window_start)
  VALUES (auth.uid(), operation_name, 1, now())
  ON CONFLICT (user_id, operation) 
  DO UPDATE SET 
    attempt_count = public.rate_limits.attempt_count + 1,
    window_start = CASE 
      WHEN public.rate_limits.window_start < window_start_time THEN now()
      ELSE public.rate_limits.window_start
    END;
  
  RETURN true;
END;
$$;

-- 4. Create critical security event logging function
CREATE OR REPLACE FUNCTION public.log_critical_security_event(
  event_type text,
  severity text DEFAULT 'medium',
  details jsonb DEFAULT '{}'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    user_id, action, table_name, new_values, ip_address
  ) VALUES (
    auth.uid(), 
    CONCAT('CRITICAL_', UPPER(event_type)), 
    'security_events',
    jsonb_build_object(
      'severity', severity,
      'details', details,
      'timestamp', now()
    ),
    inet_client_addr()::text
  );
END;
$$;