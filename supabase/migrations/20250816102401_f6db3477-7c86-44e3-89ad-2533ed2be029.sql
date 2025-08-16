-- Enhanced authentication functions to handle edge cases and provide fallbacks

-- Function to check rate limiting with enhanced error handling
CREATE OR REPLACE FUNCTION public.check_rate_limit_enhanced(operation_name text, max_attempts integer DEFAULT 5, window_minutes integer DEFAULT 15)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_attempts integer;
  window_start_time timestamp with time zone;
  current_ip text;
BEGIN
  -- Get current IP and window start time
  current_ip := COALESCE(inet_client_addr()::text, 'unknown');
  window_start_time := now() - (window_minutes || ' minutes')::interval;
  
  -- Clean up old rate limit records
  DELETE FROM public.rate_limits 
  WHERE window_start < window_start_time;
  
  -- Count current attempts in the window (by IP and user if available)
  SELECT COALESCE(SUM(attempt_count), 0) INTO current_attempts
  FROM public.rate_limits
  WHERE operation = operation_name 
    AND window_start >= window_start_time
    AND (
      (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
      (auth.uid() IS NULL AND ip_address = current_ip)
    );
  
  -- Check if limit exceeded
  IF current_attempts >= max_attempts THEN
    RETURN false;
  END IF;
  
  -- Record this attempt
  INSERT INTO public.rate_limits (user_id, operation, attempt_count, window_start, ip_address)
  VALUES (
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid), 
    operation_name, 
    1, 
    now(),
    current_ip
  )
  ON CONFLICT (user_id, operation) 
  DO UPDATE SET 
    attempt_count = public.rate_limits.attempt_count + 1,
    window_start = CASE 
      WHEN public.rate_limits.window_start < window_start_time THEN now()
      ELSE public.rate_limits.window_start
    END,
    ip_address = current_ip;
  
  RETURN true;
END;
$$;

-- Enhanced user role function with better error handling and fallbacks
CREATE OR REPLACE FUNCTION public.get_current_user_role_enhanced()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id uuid;
  user_role text;
  debug_info jsonb;
  session_valid boolean := false;
BEGIN
  -- Get current user ID with error handling
  BEGIN
    current_user_id := auth.uid();
    session_valid := (current_user_id IS NOT NULL);
  EXCEPTION WHEN OTHERS THEN
    current_user_id := NULL;
    session_valid := false;
  END;
  
  -- Initialize debug info
  debug_info := jsonb_build_object(
    'user_id', current_user_id,
    'session_valid', session_valid,
    'auth_function_available', true,
    'timestamp', now()
  );
  
  -- If no valid session, return worker role with debug info
  IF NOT session_valid THEN
    RETURN jsonb_build_object(
      'role', 'worker',
      'debug', debug_info,
      'fallback_reason', 'no_valid_session'
    );
  END IF;
  
  -- Check if user has global admin role
  SELECT role::text INTO user_role
  FROM public.user_roles 
  WHERE user_id = current_user_id AND role = 'admin'
  LIMIT 1;
  
  IF user_role IS NOT NULL THEN
    RETURN jsonb_build_object(
      'role', user_role,
      'debug', debug_info,
      'source', 'global_admin'
    );
  END IF;
  
  -- Check organization membership roles
  SELECT role INTO user_role
  FROM public.organization_members 
  WHERE user_id = current_user_id 
    AND status = 'active' 
    AND (expires_at IS NULL OR expires_at > now())
  ORDER BY CASE role
    WHEN 'owner' THEN 1
    WHEN 'admin' THEN 2
    WHEN 'manager' THEN 3
    WHEN 'worker' THEN 4
    ELSE 5
  END
  LIMIT 1;
  
  -- Return result with debug information
  RETURN jsonb_build_object(
    'role', COALESCE(user_role, 'worker'),
    'debug', debug_info,
    'source', CASE 
      WHEN user_role IS NOT NULL THEN 'organization_membership'
      ELSE 'default_fallback'
    END
  );
END;
$$;

-- Function to log critical security events with enhanced context
CREATE OR REPLACE FUNCTION public.log_critical_security_event(
  event_type text, 
  severity text DEFAULT 'medium', 
  details jsonb DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id uuid;
  current_ip text;
  enhanced_details jsonb;
BEGIN
  -- Safely get current user and IP
  BEGIN
    current_user_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    current_user_id := NULL;
  END;
  
  current_ip := COALESCE(inet_client_addr()::text, 'unknown');
  
  -- Enhance details with context
  enhanced_details := details || jsonb_build_object(
    'severity', severity,
    'ip_address', current_ip,
    'user_id', current_user_id,
    'timestamp', now(),
    'session_available', (current_user_id IS NOT NULL)
  );
  
  -- Log to security audit table
  INSERT INTO public.security_audit_log (
    user_id, action, table_name,
    new_values, ip_address
  ) VALUES (
    current_user_id, 
    CONCAT('CRITICAL_', UPPER(event_type)), 
    'security_events',
    enhanced_details,
    current_ip
  );
  
  -- For critical events, also log to a separate monitoring table if it exists
  IF severity = 'critical' THEN
    -- This could trigger additional alerting mechanisms
    RAISE WARNING 'Critical security event: % - Details: %', event_type, enhanced_details;
  END IF;
END;
$$;

-- Function to validate and debug authentication state
CREATE OR REPLACE FUNCTION public.debug_auth_state()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
  current_user_id uuid;
  session_info jsonb;
  role_info jsonb;
  org_memberships jsonb;
BEGIN
  -- Get current user ID
  BEGIN
    current_user_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    current_user_id := NULL;
  END;
  
  -- Build session info
  session_info := jsonb_build_object(
    'user_id', current_user_id,
    'session_valid', (current_user_id IS NOT NULL),
    'ip_address', COALESCE(inet_client_addr()::text, 'unknown'),
    'timestamp', now()
  );
  
  -- Get role information
  role_info := public.get_current_user_role_enhanced();
  
  -- Get organization memberships if user exists
  IF current_user_id IS NOT NULL THEN
    SELECT jsonb_agg(
      jsonb_build_object(
        'org_id', org_id,
        'role', role,
        'status', status,
        'expires_at', expires_at
      )
    ) INTO org_memberships
    FROM public.organization_members
    WHERE user_id = current_user_id;
  ELSE
    org_memberships := '[]'::jsonb;
  END IF;
  
  -- Compile result
  result := jsonb_build_object(
    'session', session_info,
    'role', role_info,
    'org_memberships', COALESCE(org_memberships, '[]'::jsonb),
    'debug_timestamp', now()
  );
  
  -- Log this debug check
  PERFORM public.log_critical_security_event(
    'AUTH_DEBUG_CHECK',
    'low',
    result
  );
  
  RETURN result;
END;
$$;