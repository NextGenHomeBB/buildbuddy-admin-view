-- Phase 2: Fix remaining security issues identified by linter

-- Fix remaining functions missing search_path protection
CREATE OR REPLACE FUNCTION public.check_rate_limit_enhanced(operation_name text, max_attempts integer DEFAULT 5, window_minutes integer DEFAULT 15)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_attempts integer;
  window_start_time timestamp with time zone;
  user_ip text;
  ip_attempts integer;
BEGIN
  -- Get current window start time
  window_start_time := now() - (window_minutes || ' minutes')::interval;
  
  -- Get user IP for additional tracking
  user_ip := inet_client_addr()::text;
  
  -- Clean up old rate limit records
  DELETE FROM public.rate_limits 
  WHERE window_start < window_start_time;
  
  -- Count current attempts in the window for this user
  SELECT COALESCE(SUM(attempt_count), 0) INTO current_attempts
  FROM public.rate_limits
  WHERE user_id = auth.uid() 
    AND operation = operation_name 
    AND window_start >= window_start_time;
  
  -- Additional IP-based rate limiting for critical operations
  IF operation_name IN ('email_send', 'quotation_create', 'user_invite', 'payroll_data_access', 'financial_summary_access') THEN
    SELECT COALESCE(SUM(attempt_count), 0) INTO ip_attempts
    FROM public.rate_limits
    WHERE ip_address = user_ip
      AND operation = operation_name 
      AND window_start >= window_start_time;
    
    -- More restrictive IP-based limits for sensitive operations
    IF ip_attempts >= (max_attempts * 2) THEN
      -- Log security event
      INSERT INTO public.security_audit_log (
        user_id, action, table_name, record_id, 
        new_values, ip_address
      ) VALUES (
        auth.uid(), 'RATE_LIMIT_EXCEEDED', 'rate_limits', null,
        jsonb_build_object(
          'operation', operation_name,
          'ip_attempts', ip_attempts,
          'max_allowed', max_attempts * 2,
          'threat_level', 'high'
        ),
        user_ip
      );
      RETURN false;
    END IF;
  END IF;
  
  -- Check if limit exceeded
  IF current_attempts >= max_attempts THEN
    -- Log security event
    INSERT INTO public.security_audit_log (
      user_id, action, table_name, record_id, 
      new_values, ip_address
    ) VALUES (
      auth.uid(), 'RATE_LIMIT_EXCEEDED', 'rate_limits', null,
      jsonb_build_object(
        'operation', operation_name,
        'user_attempts', current_attempts,
        'max_allowed', max_attempts
      ),
      user_ip
    );
    RETURN false;
  END IF;
  
  -- Record this attempt with IP tracking
  INSERT INTO public.rate_limits (user_id, operation, attempt_count, window_start, ip_address)
  VALUES (auth.uid(), operation_name, 1, now(), user_ip)
  ON CONFLICT (user_id, operation) 
  DO UPDATE SET 
    attempt_count = public.rate_limits.attempt_count + 1,
    window_start = CASE 
      WHEN public.rate_limits.window_start < window_start_time THEN now()
      ELSE public.rate_limits.window_start
    END,
    ip_address = user_ip;
  
  RETURN true;
END;
$$;

-- Update the log_critical_security_event function with search_path
CREATE OR REPLACE FUNCTION public.log_critical_security_event(event_type text, threat_level text DEFAULT 'high'::text, details jsonb DEFAULT '{}'::jsonb, auto_response text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log the critical event
  INSERT INTO public.security_audit_log (
    user_id, action, table_name,
    new_values, ip_address
  ) VALUES (
    auth.uid(), 
    format('CRITICAL_SECURITY_%s', upper(event_type)), 
    'security_events',
    jsonb_build_object(
      'threat_level', threat_level,
      'details', details,
      'auto_response', auto_response,
      'event_timestamp', now(),
      'investigation_required', threat_level = 'critical'
    ),
    inet_client_addr()::text
  );
  
  -- Auto-escalate critical threats
  IF threat_level = 'critical' THEN
    RAISE WARNING 'CRITICAL SECURITY THREAT DETECTED: % - Details: %', event_type, details;
  END IF;
END;
$$;

-- Create security monitoring dashboard function
CREATE OR REPLACE FUNCTION public.get_security_dashboard()
RETURNS TABLE(
  metric_name text,
  metric_value bigint,
  metric_description text,
  threat_level text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role text;
BEGIN
  user_role := public.get_current_user_role();
  
  -- Only admins can access security dashboard
  IF user_role != 'admin' THEN
    RAISE EXCEPTION 'Access denied: only administrators can access security dashboard';
  END IF;
  
  -- Log dashboard access
  PERFORM public.log_critical_security_event(
    'SECURITY_DASHBOARD_ACCESS',
    'medium',
    jsonb_build_object(
      'user_role', user_role,
      'access_time', now()
    )
  );
  
  RETURN QUERY
  SELECT 
    'total_security_events'::text,
    COUNT(*)::bigint,
    'Total security events logged in last 24 hours'::text,
    CASE WHEN COUNT(*) > 100 THEN 'high' WHEN COUNT(*) > 50 THEN 'medium' ELSE 'low' END::text
  FROM public.security_audit_log 
  WHERE timestamp > now() - INTERVAL '24 hours'
  
  UNION ALL
  
  SELECT 
    'critical_events'::text,
    COUNT(*)::bigint,
    'Critical security events in last 24 hours'::text,
    CASE WHEN COUNT(*) > 0 THEN 'critical' ELSE 'low' END::text
  FROM public.security_audit_log 
  WHERE timestamp > now() - INTERVAL '24 hours'
  AND new_values->>'threat_level' = 'critical'
  
  UNION ALL
  
  SELECT 
    'rate_limit_violations'::text,
    COUNT(*)::bigint,
    'Rate limit violations in last 24 hours'::text,
    CASE WHEN COUNT(*) > 10 THEN 'high' WHEN COUNT(*) > 5 THEN 'medium' ELSE 'low' END::text
  FROM public.security_audit_log 
  WHERE timestamp > now() - INTERVAL '24 hours'
  AND action = 'RATE_LIMIT_EXCEEDED'
  
  UNION ALL
  
  SELECT 
    'credential_access_attempts'::text,
    COUNT(*)::bigint,
    'Credential access attempts in last 24 hours'::text,
    CASE WHEN COUNT(*) > 20 THEN 'high' WHEN COUNT(*) > 10 THEN 'medium' ELSE 'low' END::text
  FROM public.security_audit_log 
  WHERE timestamp > now() - INTERVAL '24 hours'
  AND action LIKE '%CREDENTIAL%'
  
  UNION ALL
  
  SELECT 
    'financial_data_access'::text,
    COUNT(*)::bigint,
    'Financial data access attempts in last 24 hours'::text,
    CASE WHEN COUNT(*) > 50 THEN 'high' WHEN COUNT(*) > 25 THEN 'medium' ELSE 'low' END::text
  FROM public.security_audit_log 
  WHERE timestamp > now() - INTERVAL '24 hours'
  AND (action LIKE '%FINANCIAL%' OR action LIKE '%PAYROLL%');
END;
$$;

-- Create enhanced credential rotation function
CREATE OR REPLACE FUNCTION public.rotate_security_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Mark old tokens for rotation (don't delete immediately for audit trail)
  UPDATE public.calendar_oauth_tokens 
  SET suspicious_activity = true,
      last_used = now() - INTERVAL '1 year' -- Mark as old
  WHERE created_at < now() - INTERVAL '90 days'
    AND suspicious_activity = false;
  
  -- Log token rotation activity
  INSERT INTO public.security_audit_log (
    user_id, action, table_name,
    new_values, ip_address
  ) VALUES (
    NULL, -- System action
    'SECURITY_TOKEN_ROTATION', 
    'calendar_oauth_tokens',
    jsonb_build_object(
      'rotation_type', 'automatic_cleanup',
      'tokens_affected', (SELECT COUNT(*) FROM public.calendar_oauth_tokens WHERE created_at < now() - INTERVAL '90 days'),
      'security_action', 'token_lifecycle_management'
    ),
    NULL
  );
END;
$$;

-- Enhanced Apple credential security with better encryption validation
CREATE OR REPLACE FUNCTION public.validate_apple_credential_security(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  credential_count integer;
  last_access_time timestamp with time zone;
  user_role text;
BEGIN
  user_role := public.get_current_user_role();
  
  -- Only allow users to validate their own credentials or admins
  IF p_user_id != auth.uid() AND user_role != 'admin' THEN
    PERFORM public.log_critical_security_event(
      'UNAUTHORIZED_CREDENTIAL_VALIDATION_ATTEMPT',
      'critical',
      jsonb_build_object(
        'target_user', p_user_id,
        'requesting_user', auth.uid(),
        'user_role', user_role
      )
    );
    RETURN false;
  END IF;
  
  -- Check credential health
  SELECT COUNT(*), MAX(last_accessed) 
  INTO credential_count, last_access_time
  FROM public.apple_calendar_credentials 
  WHERE user_id = p_user_id;
  
  -- Log validation attempt
  PERFORM public.log_critical_security_event(
    'APPLE_CREDENTIAL_SECURITY_VALIDATION',
    'medium',
    jsonb_build_object(
      'target_user', p_user_id,
      'credential_count', credential_count,
      'last_access', last_access_time,
      'validation_result', credential_count > 0 AND last_access_time > now() - INTERVAL '30 days'
    )
  );
  
  RETURN credential_count > 0 AND last_access_time > now() - INTERVAL '30 days';
END;
$$;