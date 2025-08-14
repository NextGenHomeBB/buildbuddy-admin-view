-- Phase 1: Critical Data Protection - Secure Materialized Views and Functions

-- 1. Drop RLS blocking policies for materialized views and replace with secure functions
DROP POLICY IF EXISTS "Block direct access to project_costs_vw" ON project_costs_vw;
DROP POLICY IF EXISTS "Block direct access to security_metrics_summary" ON security_metrics_summary;

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
  severity text DEFAULT 'medium',
  details jsonb DEFAULT '{}'
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  BEGIN
    PERFORM public.log_critical_security_event(event_type, severity, details);
    RETURN true;
  EXCEPTION WHEN OTHERS THEN
    -- Log failed but don't block the operation
    RETURN true;
  END;
END;
$$;

-- 5. Create secure project costs function
CREATE OR REPLACE FUNCTION public.get_project_costs_secure(
  p_project_id uuid DEFAULT NULL
) RETURNS TABLE(
  project_id uuid,
  project_name text,
  total_labor_cost numeric,
  total_material_cost numeric,
  total_expense_cost numeric,
  total_cost numeric,
  budget numeric,
  budget_variance numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_role text;
  has_project_access boolean := false;
BEGIN
  -- Get current user role
  user_role := public.get_current_user_role();
  
  -- Rate limiting for financial data access
  IF NOT public.check_rate_limit_enhanced('project_costs_access', 10, 60) THEN
    PERFORM public.log_critical_security_event(
      'PROJECT_COSTS_RATE_LIMIT_EXCEEDED',
      'high',
      jsonb_build_object(
        'user_role', user_role,
        'project_id', p_project_id
      )
    );
    RAISE EXCEPTION 'Rate limit exceeded for project costs access';
  END IF;
  
  -- Check project access for non-admin users
  IF user_role != 'admin' AND p_project_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM user_project_role upr
      WHERE upr.user_id = auth.uid() 
      AND upr.project_id = p_project_id
      AND upr.role IN ('manager', 'admin')
    ) INTO has_project_access;
    
    IF NOT has_project_access THEN
      PERFORM public.log_critical_security_event(
        'UNAUTHORIZED_PROJECT_COSTS_ACCESS',
        'high',
        jsonb_build_object(
          'user_role', user_role,
          'project_id', p_project_id
        )
      );
      RAISE EXCEPTION 'Access denied: insufficient project permissions';
    END IF;
  END IF;
  
  -- Log access attempt
  PERFORM public.log_critical_security_event(
    'PROJECT_COSTS_SECURE_ACCESS',
    'medium',
    jsonb_build_object(
      'user_role', user_role,
      'project_id', p_project_id,
      'has_access', has_project_access OR user_role = 'admin'
    )
  );
  
  -- Return data based on access level
  RETURN QUERY
  SELECT 
    pcv.project_id,
    pcv.project_name,
    CASE
      WHEN user_role = 'admin' OR has_project_access THEN pcv.total_labor_cost
      ELSE NULL::numeric
    END,
    CASE
      WHEN user_role = 'admin' OR has_project_access THEN pcv.total_material_cost
      ELSE NULL::numeric
    END,
    CASE
      WHEN user_role = 'admin' OR has_project_access THEN pcv.total_expense_cost
      ELSE NULL::numeric
    END,
    CASE
      WHEN user_role = 'admin' OR has_project_access THEN pcv.total_cost
      ELSE NULL::numeric
    END,
    CASE
      WHEN user_role = 'admin' OR has_project_access THEN pcv.budget
      ELSE NULL::numeric
    END,
    CASE
      WHEN user_role = 'admin' OR has_project_access THEN pcv.budget_variance
      ELSE NULL::numeric
    END
  FROM project_costs_vw pcv
  WHERE 
    (user_role = 'admin' OR 
     (p_project_id IS NOT NULL AND has_project_access) OR
     EXISTS (
       SELECT 1 FROM user_project_role upr
       WHERE upr.user_id = auth.uid() 
       AND upr.project_id = pcv.project_id
       AND upr.role IN ('manager', 'admin')
     ))
    AND (p_project_id IS NULL OR pcv.project_id = p_project_id);
END;
$$;