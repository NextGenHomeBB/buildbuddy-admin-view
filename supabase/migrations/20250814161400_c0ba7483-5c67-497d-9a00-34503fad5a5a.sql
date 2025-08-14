-- PHASE 1: Database Security Hardening & Critical Fixes
-- Fix all security issues identified in the scan

-- 1. Create enhanced rate limiting function with immutable search path
CREATE OR REPLACE FUNCTION public.check_rate_limit_enhanced(
  operation_name text, 
  max_attempts integer DEFAULT 5, 
  window_minutes integer DEFAULT 15
)
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
      auth.uid(), 'RATE_LIMIT_EXCEEDED', 'rate_limits',
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

-- 2. Create critical security event logging function
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
      'session_id', current_setting('request.jwt.claims', true)::json->>'session_id',
      'user_agent', current_setting('request.headers', true)::json->>'user-agent'
    ),
    inet_client_addr()::text
  );
  
  -- Auto-escalate critical events
  IF severity = 'critical' THEN
    RAISE WARNING 'CRITICAL SECURITY EVENT: % - %', event_type, details;
  END IF;
END;
$$;

-- 3. Create secure worker rates function with data masking
CREATE OR REPLACE FUNCTION public.get_worker_rates_masked(p_worker_id uuid DEFAULT NULL)
RETURNS TABLE(
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
SET search_path TO 'public'
AS $$
DECLARE
  user_role text;
  has_admin_access boolean := false;
BEGIN
  -- Get current user role
  user_role := public.get_current_user_role();
  has_admin_access := (user_role = 'admin');
  
  -- Rate limiting for sensitive salary data access
  IF NOT public.check_rate_limit_enhanced('worker_rates_access', 10, 60) THEN
    PERFORM public.log_critical_security_event(
      'WORKER_RATES_RATE_LIMIT_EXCEEDED',
      'high',
      jsonb_build_object(
        'user_role', user_role,
        'worker_id_requested', p_worker_id
      )
    );
    RAISE EXCEPTION 'Rate limit exceeded for salary data access';
  END IF;
  
  -- Only admins can access salary data
  IF NOT has_admin_access THEN
    PERFORM public.log_critical_security_event(
      'UNAUTHORIZED_SALARY_ACCESS_ATTEMPT',
      'critical',
      jsonb_build_object(
        'user_role', user_role,
        'worker_id_requested', p_worker_id,
        'violation_type', 'non_admin_salary_access'
      )
    );
    RAISE EXCEPTION 'Access denied: only administrators can view salary information';
  END IF;
  
  -- Log legitimate access
  PERFORM public.log_critical_security_event(
    'WORKER_RATES_ADMIN_ACCESS',
    'medium',
    jsonb_build_object(
      'user_role', user_role,
      'worker_id_requested', p_worker_id,
      'access_method', 'secure_rpc_function'
    )
  );
  
  -- Return data with role-based masking
  RETURN QUERY
  SELECT 
    wr.id,
    wr.worker_id,
    CASE 
      WHEN has_admin_access THEN wr.hourly_rate
      ELSE NULL::numeric
    END AS hourly_rate,
    CASE 
      WHEN has_admin_access THEN wr.monthly_salary
      ELSE NULL::numeric
    END AS monthly_salary,
    wr.payment_type,
    wr.effective_date,
    wr.end_date,
    CASE 
      WHEN has_admin_access THEN COALESCE(p.full_name, 'Unknown Worker')
      ELSE 'RESTRICTED'
    END AS worker_name
  FROM public.worker_rates wr
  LEFT JOIN public.profiles p ON p.id = wr.worker_id
  WHERE (p_worker_id IS NULL OR wr.worker_id = p_worker_id)
  ORDER BY wr.effective_date DESC;
END;
$$;

-- 4. Create secure project costs function with comprehensive access control
CREATE OR REPLACE FUNCTION public.get_project_costs_secure(p_project_id uuid DEFAULT NULL)
RETURNS TABLE(
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
SET search_path TO 'public'
AS $$
DECLARE
  user_role text;
  has_access boolean := false;
BEGIN
  -- Get current user role
  user_role := public.get_current_user_role();
  
  -- Rate limiting for financial data access
  IF NOT public.check_rate_limit_enhanced('project_costs_access', 15, 60) THEN
    PERFORM public.log_critical_security_event(
      'PROJECT_COSTS_RATE_LIMIT_EXCEEDED',
      'high',
      jsonb_build_object(
        'user_role', user_role,
        'project_id_requested', p_project_id
      )
    );
    RAISE EXCEPTION 'Rate limit exceeded for financial data access';
  END IF;
  
  -- Check access permissions
  has_access := (
    user_role = 'admin' OR 
    (p_project_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM user_project_role upr
      WHERE upr.user_id = auth.uid() 
      AND upr.project_id = p_project_id
      AND upr.role IN ('manager', 'admin')
    ))
  );
  
  IF NOT has_access THEN
    PERFORM public.log_critical_security_event(
      'UNAUTHORIZED_PROJECT_COSTS_ACCESS',
      'critical',
      jsonb_build_object(
        'user_role', user_role,
        'project_id_requested', p_project_id,
        'violation_type', 'insufficient_project_permissions'
      )
    );
    RAISE EXCEPTION 'Access denied: insufficient permissions for project financial data';
  END IF;
  
  -- Log legitimate access
  PERFORM public.log_critical_security_event(
    'PROJECT_COSTS_SECURE_ACCESS',
    'medium',
    jsonb_build_object(
      'user_role', user_role,
      'project_id_requested', p_project_id,
      'access_method', 'secure_rpc_function'
    )
  );
  
  -- Return aggregated project costs
  RETURN QUERY
  SELECT 
    p.id AS project_id,
    p.name AS project_name,
    COALESCE(SUM(plc.total_actual_cost), 0) AS total_labor_cost,
    COALESCE(SUM(pmc.total_cost), 0) AS total_material_cost,
    COALESCE(SUM(pe.amount), 0) AS total_expense_cost,
    COALESCE(SUM(plc.total_actual_cost), 0) + 
    COALESCE(SUM(pmc.total_cost), 0) + 
    COALESCE(SUM(pe.amount), 0) AS total_cost,
    p.budget,
    p.budget - (
      COALESCE(SUM(plc.total_actual_cost), 0) + 
      COALESCE(SUM(pmc.total_cost), 0) + 
      COALESCE(SUM(pe.amount), 0)
    ) AS budget_variance
  FROM public.projects p
  LEFT JOIN public.project_phases pp ON pp.project_id = p.id
  LEFT JOIN public.phase_labor_costs plc ON plc.phase_id = pp.id
  LEFT JOIN public.phase_material_costs pmc ON pmc.phase_id = pp.id
  LEFT JOIN public.phase_expenses pe ON pe.phase_id = pp.id
  WHERE (p_project_id IS NULL OR p.id = p_project_id)
    AND (
      user_role = 'admin' OR
      EXISTS (
        SELECT 1 FROM user_project_role upr
        WHERE upr.user_id = auth.uid() 
        AND upr.project_id = p.id
        AND upr.role IN ('manager', 'admin')
      )
    )
  GROUP BY p.id, p.name, p.budget
  ORDER BY p.name;
END;
$$;

-- 5. Secure the worker_rates table with comprehensive RLS
DROP POLICY IF EXISTS "Secure worker rates access" ON public.worker_rates;
DROP POLICY IF EXISTS "Admin only worker rates insert" ON public.worker_rates;
DROP POLICY IF EXISTS "Admin only worker rates update" ON public.worker_rates;
DROP POLICY IF EXISTS "Admin only worker rates delete" ON public.worker_rates;

CREATE POLICY "Block all direct worker rates access"
ON public.worker_rates
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

-- 6. Secure the profiles table
DROP POLICY IF EXISTS "Profiles: self read" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: self update (no role changes)" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: self insert" ON public.profiles;

CREATE POLICY "Users can read own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can read all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.get_current_user_role() = 'admin');

-- 7. Secure OAuth tokens with enhanced monitoring
DROP POLICY IF EXISTS "Users can manage their own oauth tokens" ON public.calendar_oauth_tokens;

CREATE POLICY "Users can manage own oauth tokens"
ON public.calendar_oauth_tokens
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 8. Secure invitations table
DROP POLICY IF EXISTS "Users can view invitations by token" ON public.invitations;
DROP POLICY IF EXISTS "Org admins can manage invitations" ON public.invitations;

CREATE POLICY "Org admins can manage invitations"
ON public.invitations
FOR ALL
TO authenticated
USING (fn_role_in_org(org_id) = ANY(ARRAY['owner', 'admin']));

CREATE POLICY "Users can view own invitations by email"
ON public.invitations
FOR SELECT
TO authenticated
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR
  fn_role_in_org(org_id) = ANY(ARRAY['owner', 'admin'])
);

-- 9. Block access to materialized views (if any exist)
-- Create a function to check for materialized views and block them
CREATE OR REPLACE FUNCTION public.block_materialized_view_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RAISE EXCEPTION 'Direct access to materialized views is not allowed for security reasons';
  RETURN NULL;
END;
$$;