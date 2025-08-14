-- Fix for read-only transaction errors in security logging
-- Create a safe logging function that handles read-only transaction states

CREATE OR REPLACE FUNCTION public.safe_log_security_event(
  event_type text, 
  severity text DEFAULT 'medium', 
  details jsonb DEFAULT '{}'
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Attempt to log, but don't fail if we can't (e.g., read-only transaction)
  BEGIN
    INSERT INTO public.security_audit_log (
      user_id, action, table_name, 
      new_values, ip_address
    ) VALUES (
      auth.uid(), 
      event_type, 
      'security_events',
      jsonb_build_object(
        'severity', severity,
        'details', details,
        'timestamp', now()
      ),
      inet_client_addr()::text
    );
    RETURN true;
  EXCEPTION 
    WHEN OTHERS THEN
      -- Silently fail if we can't log (e.g., read-only transaction)
      RETURN false;
  END;
END;
$$;

-- Create a safe critical security event logging function
CREATE OR REPLACE FUNCTION public.safe_log_critical_security_event(
  event_type text, 
  threat_level text DEFAULT 'medium', 
  event_details jsonb DEFAULT '{}'
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Attempt to log, but don't fail if we can't
  BEGIN
    INSERT INTO public.security_audit_log (
      user_id, action, table_name, 
      new_values, ip_address
    ) VALUES (
      auth.uid(), 
      event_type, 
      'critical_security_events',
      jsonb_build_object(
        'threat_level', threat_level,
        'event_details', event_details,
        'timestamp', now(),
        'user_agent', current_setting('request.headers', true)::json->>'user-agent'
      ),
      inet_client_addr()::text
    );
    RETURN true;
  EXCEPTION 
    WHEN OTHERS THEN
      -- Silently fail if we can't log
      RETURN false;
  END;
END;
$$;

-- Update problematic RLS policies to use safe logging

-- Fix apple_credentials_owner_read_secure policy
DROP POLICY IF EXISTS "apple_credentials_owner_read_secure" ON public.apple_calendar_credentials;
CREATE POLICY "apple_credentials_owner_read_secure" 
ON public.apple_calendar_credentials
FOR SELECT 
USING (
  (user_id = auth.uid()) AND 
  (safe_log_critical_security_event(
    'APPLE_CREDENTIAL_DIRECT_TABLE_ACCESS',
    'medium',
    jsonb_build_object(
      'user_id', user_id,
      'credential_id', id,
      'access_method', 'direct_table_query',
      'warning', 'recommend_using_secure_rpc_function'
    )
  ) IS NOT NULL)
);

-- Fix apple_credentials_owner_update_secure policy
DROP POLICY IF EXISTS "apple_credentials_owner_update_secure" ON public.apple_calendar_credentials;
CREATE POLICY "apple_credentials_owner_update_secure" 
ON public.apple_calendar_credentials
FOR UPDATE 
USING (user_id = auth.uid())
WITH CHECK (
  (user_id = auth.uid()) AND 
  (safe_log_critical_security_event(
    'APPLE_CREDENTIAL_UPDATE_OPERATION',
    'medium',
    jsonb_build_object(
      'user_id', user_id,
      'credential_id', id,
      'operation_type', 'UPDATE',
      'access_method', 'direct_table_write'
    )
  ) IS NOT NULL)
);

-- Fix apple_credentials_owner_write_secure policy
DROP POLICY IF EXISTS "apple_credentials_owner_write_secure" ON public.apple_calendar_credentials;
CREATE POLICY "apple_credentials_owner_write_secure" 
ON public.apple_calendar_credentials
FOR INSERT 
WITH CHECK (
  (user_id = auth.uid()) AND 
  (safe_log_critical_security_event(
    'APPLE_CREDENTIAL_WRITE_OPERATION',
    'medium',
    jsonb_build_object(
      'user_id', user_id,
      'operation_type', 'INSERT',
      'access_method', 'direct_table_write'
    )
  ) IS NOT NULL)
);

-- Fix apple_credentials_owner_delete_secure policy
DROP POLICY IF EXISTS "apple_credentials_owner_delete_secure" ON public.apple_calendar_credentials;
CREATE POLICY "apple_credentials_owner_delete_secure" 
ON public.apple_calendar_credentials
FOR DELETE 
USING (
  (user_id = auth.uid()) AND 
  (safe_log_critical_security_event(
    'APPLE_CREDENTIAL_DELETE_OPERATION',
    'high',
    jsonb_build_object(
      'user_id', user_id,
      'credential_id', id,
      'operation_type', 'DELETE',
      'access_method', 'direct_table_delete'
    )
  ) IS NOT NULL)
);

-- Create a helper function to check if user is HR administrator safely
CREATE OR REPLACE FUNCTION public.is_hr_administrator()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  );
$$;

-- Fix hr_justified_personal_data_access policy on profiles
DROP POLICY IF EXISTS "hr_justified_personal_data_access" ON public.profiles;
CREATE POLICY "hr_justified_personal_data_access" 
ON public.profiles
FOR SELECT 
USING (
  (id = auth.uid()) OR 
  (is_hr_administrator() AND 
   safe_log_critical_security_event(
     'HR_PERSONAL_DATA_ACCESS',
     'high',
     jsonb_build_object(
       'accessed_profile', profiles.id,
       'hr_admin', auth.uid(),
       'access_reason', 'hr_administration_via_function',
       'requires_justification', true,
       'access_type', 'employee_personal_data'
     )
   ) IS NOT NULL)
);

-- Create a simple rate limiting check function that doesn't fail
CREATE OR REPLACE FUNCTION public.check_rate_limit_enhanced(
  operation_name text, 
  max_attempts integer DEFAULT 5, 
  window_minutes integer DEFAULT 15
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_attempts integer := 0;
  window_start_time timestamp with time zone;
BEGIN
  -- Get current window start time
  window_start_time := now() - (window_minutes || ' minutes')::interval;
  
  -- Try to count current attempts, but don't fail if we can't
  BEGIN
    SELECT COALESCE(SUM(attempt_count), 0) INTO current_attempts
    FROM public.rate_limits
    WHERE user_id = auth.uid() 
      AND operation = operation_name 
      AND window_start >= window_start_time;
  EXCEPTION 
    WHEN OTHERS THEN
      -- If we can't check rate limits, allow the operation
      RETURN true;
  END;
  
  -- Check if limit exceeded
  IF current_attempts >= max_attempts THEN
    RETURN false;
  END IF;
  
  -- Try to record this attempt, but don't fail if we can't
  BEGIN
    INSERT INTO public.rate_limits (user_id, operation, attempt_count, window_start)
    VALUES (auth.uid(), operation_name, 1, now())
    ON CONFLICT (user_id, operation) 
    DO UPDATE SET 
      attempt_count = public.rate_limits.attempt_count + 1,
      window_start = CASE 
        WHEN public.rate_limits.window_start < window_start_time THEN now()
        ELSE public.rate_limits.window_start
      END;
  EXCEPTION 
    WHEN OTHERS THEN
      -- If we can't record the attempt, still allow the operation
      NULL;
  END;
  
  RETURN true;
END;
$$;