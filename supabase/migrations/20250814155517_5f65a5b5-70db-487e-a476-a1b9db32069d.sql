-- Phase 1: Critical Data Protection - Fix function conflicts and implement security

-- 1. Drop conflicting functions first
DROP FUNCTION IF EXISTS public.safe_log_critical_security_event(text,text,jsonb);

-- 2. Create comprehensive rate limiting and security functions
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
  
  -- Clean up old rate limit records
  DELETE FROM public.rate_limits 
  WHERE window_start < window_start_time;
  
  -- Count current attempts in the window
  SELECT COALESCE(SUM(attempt_count), 0) INTO current_attempts
  FROM public.rate_limits
  WHERE user_id = auth.uid() 
    AND operation = operation_name 
    AND window_start >= window_start_time;
  
  -- Check if limit exceeded
  IF current_attempts >= max_attempts THEN
    RETURN false;
  END IF;
  
  -- Record this attempt
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

-- 3. Create critical security event logging function
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
    user_id, action, table_name,
    new_values, ip_address
  ) VALUES (
    auth.uid(), 
    CONCAT('CRITICAL_', UPPER(event_type)), 
    'security_events',
    jsonb_build_object(
      'severity', severity,
      'details', details,
      'timestamp', now(),
      'user_agent', current_setting('request.headers', true)::json->>'user-agent'
    ),
    inet_client_addr()::text
  );
END;
$$;

-- 4. Create safe logging function that doesn't fail
CREATE OR REPLACE FUNCTION public.safe_log_critical_security_event(
  event_type text,
  severity_level text DEFAULT 'medium',
  event_details jsonb DEFAULT '{}'
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  BEGIN
    PERFORM public.log_critical_security_event(event_type, severity_level, event_details);
    RETURN true;
  EXCEPTION WHEN OTHERS THEN
    -- Log failed but don't block the operation
    RETURN true;
  END;
END;
$$;

-- 5. Create secure worker rates function with masking
CREATE OR REPLACE FUNCTION public.get_worker_rates_masked(
  p_worker_id uuid DEFAULT NULL
) RETURNS TABLE(
  id uuid,
  worker_id uuid,
  hourly_rate numeric,
  monthly_salary numeric,
  payment_type text,
  effective_date date,
  end_date date,
  worker_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_role text;
  has_access boolean := false;
BEGIN
  -- Get current user role
  user_role := public.get_current_user_role();
  
  -- Rate limiting for salary data access
  IF NOT public.check_rate_limit_enhanced('worker_rates_access', 15, 60) THEN
    PERFORM public.log_critical_security_event(
      'WORKER_RATES_RATE_LIMIT_EXCEEDED',
      'high',
      jsonb_build_object(
        'user_role', user_role,
        'worker_id', p_worker_id
      )
    );
    RAISE EXCEPTION 'Rate limit exceeded for worker rates access';
  END IF;
  
  -- Determine access level
  has_access := (user_role = 'admin' OR auth.uid() = p_worker_id);
  
  -- Log access attempt
  PERFORM public.log_critical_security_event(
    'WORKER_RATES_MASKED_ACCESS',
    'high',
    jsonb_build_object(
      'user_role', user_role,
      'worker_id', p_worker_id,
      'self_access', auth.uid() = p_worker_id,
      'has_full_access', has_access
    )
  );
  
  -- Return data with appropriate masking
  RETURN QUERY
  SELECT 
    wr.id,
    wr.worker_id,
    CASE
      WHEN has_access THEN wr.hourly_rate
      ELSE NULL::numeric
    END,
    CASE
      WHEN has_access THEN wr.monthly_salary  
      ELSE NULL::numeric
    END,
    wr.payment_type,
    wr.effective_date,
    wr.end_date,
    CASE
      WHEN has_access THEN p.full_name
      ELSE concat(left(p.full_name, 3), '***')
    END
  FROM public.worker_rates wr
  LEFT JOIN public.profiles p ON p.id = wr.worker_id
  WHERE 
    (user_role = 'admin' OR 
     wr.worker_id = auth.uid() OR
     (p_worker_id IS NOT NULL AND wr.worker_id = p_worker_id))
    AND (p_worker_id IS NULL OR wr.worker_id = p_worker_id)
  ORDER BY wr.effective_date DESC;
END;
$$;