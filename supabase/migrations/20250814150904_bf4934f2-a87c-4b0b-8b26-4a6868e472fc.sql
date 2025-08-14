-- Drop existing conflicting functions first
DROP FUNCTION IF EXISTS public.safe_log_critical_security_event(text, text, jsonb);

-- Create the missing get_current_user_role RPC function that frontend expects
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT role::text 
  FROM public.user_roles 
  WHERE user_id = auth.uid() 
  ORDER BY 
    CASE role
      WHEN 'admin' THEN 1
      WHEN 'manager' THEN 2
      WHEN 'worker' THEN 3
    END
  LIMIT 1;
$$;

-- Create missing helper functions for security monitoring
CREATE OR REPLACE FUNCTION public.check_rate_limit_enhanced(operation_name text, max_attempts integer DEFAULT 10, window_minutes integer DEFAULT 60)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_attempts integer;
  window_start_time timestamp with time zone;
BEGIN
  window_start_time := now() - (window_minutes || ' minutes')::interval;
  
  DELETE FROM public.rate_limits 
  WHERE window_start < window_start_time;
  
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

-- Create safe logging function with correct parameters
CREATE OR REPLACE FUNCTION public.safe_log_critical_security_event(event_type text, severity text DEFAULT 'medium'::text, details jsonb DEFAULT '{}'::jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  BEGIN
    INSERT INTO public.security_audit_log (
      user_id, action, table_name, 
      new_values, ip_address
    ) VALUES (
      auth.uid(), event_type, 'security_events',
      jsonb_build_object(
        'severity', severity,
        'details', details,
        'timestamp', now()
      ),
      inet_client_addr()::text
    );
    RETURN true;
  EXCEPTION WHEN OTHERS THEN
    RETURN false;
  END;
END;
$$;

-- Create log critical security event function
CREATE OR REPLACE FUNCTION public.log_critical_security_event(event_type text, severity text DEFAULT 'medium'::text, details jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    user_id, action, table_name, 
    new_values, ip_address
  ) VALUES (
    auth.uid(), event_type, 'security_events',
    jsonb_build_object(
      'severity', severity,
      'details', details,
      'timestamp', now()
    ),
    inet_client_addr()::text
  );
END;
$$;

-- Create is_hr_administrator function
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