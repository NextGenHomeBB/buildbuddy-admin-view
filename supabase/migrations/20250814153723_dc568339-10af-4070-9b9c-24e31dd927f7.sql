-- Critical Security Fixes Migration

-- 1. Fix search_path issues in existing functions
CREATE OR REPLACE FUNCTION public.check_rate_limit_enhanced(operation_name text, max_attempts integer DEFAULT 10, window_minutes integer DEFAULT 60)
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
  current_ip := inet_client_addr()::text;
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
    -- Log rate limit violation
    INSERT INTO public.security_audit_log (
      user_id, action, table_name,
      new_values, ip_address
    ) VALUES (
      auth.uid(), 
      'RATE_LIMIT_EXCEEDED', 
      'rate_limits',
      jsonb_build_object(
        'operation', operation_name,
        'attempts', current_attempts,
        'max_allowed', max_attempts,
        'window_minutes', window_minutes
      ),
      current_ip
    );
    RETURN false;
  END IF;
  
  -- Record this attempt
  INSERT INTO public.rate_limits (user_id, operation, attempt_count, window_start, ip_address)
  VALUES (auth.uid(), operation_name, 1, now(), current_ip)
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

-- 2. Enhanced secure logging function
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
  current_ip text;
  user_role text;
BEGIN
  current_ip := inet_client_addr()::text;
  
  -- Get user role safely
  SELECT role::text INTO user_role
  FROM public.user_roles 
  WHERE user_id = auth.uid() 
  ORDER BY 
    CASE role
      WHEN 'admin' THEN 1
      WHEN 'manager' THEN 2
      WHEN 'worker' THEN 3
    END
  LIMIT 1;
  
  -- Insert security event
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
      'user_role', user_role,
      'timestamp', now(),
      'session_id', current_setting('request.jwt.claims', true)::json->>'session_id'
    ),
    current_ip
  );
  
  -- Auto-escalate critical events
  IF severity = 'critical' THEN
    -- Additional alerting logic
    RAISE WARNING 'CRITICAL SECURITY EVENT: % - Details: %', event_type, details;
  END IF;
END;
$$;

-- 3. Safe logging wrapper to prevent RLS recursion
CREATE OR REPLACE FUNCTION public.safe_log_critical_security_event(
  event_type text, 
  severity text DEFAULT 'medium', 
  details jsonb DEFAULT '{}'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  BEGIN
    PERFORM public.log_critical_security_event(event_type, severity, details);
    RETURN true;
  EXCEPTION WHEN OTHERS THEN
    -- Fail silently to prevent blocking legitimate operations
    RETURN false;
  END;
END;
$$;

-- 4. Enhanced profile security function
CREATE OR REPLACE FUNCTION public.is_hr_administrator()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  );
END;
$$;

-- 5. Secure worker rates access with data masking
CREATE OR REPLACE FUNCTION public.get_worker_rates_masked(p_worker_id uuid DEFAULT NULL)
RETURNS TABLE(
  id uuid,
  worker_id uuid,
  hourly_rate numeric,
  monthly_salary numeric,
  payment_type text,
  effective_date date,
  end_date date,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role text;
  has_access boolean := false;
BEGIN
  -- Get current user role
  user_role := public.get_current_user_role();
  
  -- Rate limiting
  IF NOT public.check_rate_limit_enhanced('worker_rates_access', 20, 60) THEN
    PERFORM public.log_critical_security_event(
      'WORKER_RATES_RATE_LIMIT_EXCEEDED',
      'high',
      jsonb_build_object(
        'target_worker_id', p_worker_id,
        'user_role', user_role
      )
    );
    RAISE EXCEPTION 'Rate limit exceeded for worker rates access';
  END IF;
  
  -- Determine access level
  has_access := (
    user_role = 'admin' OR 
    (p_worker_id IS NOT NULL AND p_worker_id = auth.uid())
  );
  
  IF NOT has_access THEN
    PERFORM public.log_critical_security_event(
      'UNAUTHORIZED_WORKER_RATES_ACCESS',
      'critical',
      jsonb_build_object(
        'target_worker_id', p_worker_id,
        'user_role', user_role
      )
    );
    RAISE EXCEPTION 'Access denied: insufficient permissions for worker rates';
  END IF;
  
  -- Log legitimate access
  PERFORM public.log_critical_security_event(
    'WORKER_RATES_SECURE_ACCESS',
    'medium',
    jsonb_build_object(
      'target_worker_id', p_worker_id,
      'user_role', user_role
    )
  );
  
  -- Return data with role-based masking
  RETURN QUERY
  SELECT 
    wr.id,
    wr.worker_id,
    CASE
      WHEN user_role = 'admin' THEN wr.hourly_rate
      WHEN wr.worker_id = auth.uid() THEN wr.hourly_rate
      ELSE NULL::numeric
    END AS hourly_rate,
    CASE
      WHEN user_role = 'admin' THEN wr.monthly_salary
      WHEN wr.worker_id = auth.uid() THEN wr.monthly_salary
      ELSE NULL::numeric
    END AS monthly_salary,
    wr.payment_type,
    wr.effective_date,
    wr.end_date,
    wr.created_at,
    wr.updated_at
  FROM public.worker_rates wr
  WHERE 
    (p_worker_id IS NULL OR wr.worker_id = p_worker_id)
    AND (user_role = 'admin' OR wr.worker_id = auth.uid())
  ORDER BY wr.effective_date DESC;
END;
$$;

-- 6. Add RLS policy to block direct access to phase_costs_vw
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'phase_costs_vw') THEN
    ALTER TABLE public.phase_costs_vw ENABLE ROW LEVEL SECURITY;
    
    -- Block all direct access to the materialized view
    DROP POLICY IF EXISTS "block_direct_access_to_phase_costs_vw" ON public.phase_costs_vw;
    CREATE POLICY "block_direct_access_to_phase_costs_vw" 
    ON public.phase_costs_vw 
    FOR ALL 
    USING (false);
  END IF;
END $$;