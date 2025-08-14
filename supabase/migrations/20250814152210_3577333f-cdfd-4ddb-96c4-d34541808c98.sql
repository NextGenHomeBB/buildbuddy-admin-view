-- Comprehensive Security Fix: Final implementation addressing all critical vulnerabilities
-- This migration implements secure patterns without conflicting with existing functions

-- PHASE 1: Fix SECURITY DEFINER functions by adding proper search_path to prevent search path attacks
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.user_has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = _user_id AND role = _role
  );
$function$;

CREATE OR REPLACE FUNCTION public.fn_is_member(p_org uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  SELECT EXISTS (
    SELECT 1 
    FROM public.organization_members m
    WHERE m.org_id = p_org 
    AND m.user_id = auth.uid()
    AND m.status = 'active'
    AND (m.expires_at IS NULL OR now() < m.expires_at)
  );
$function$;

CREATE OR REPLACE FUNCTION public.fn_role_in_org(p_org uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  SELECT m.role 
  FROM public.organization_members m
  WHERE m.org_id = p_org 
  AND m.user_id = auth.uid()
  AND m.status = 'active'
  AND (m.expires_at IS NULL OR now() < m.expires_at)
  LIMIT 1;
$function$;

-- PHASE 2: Add missing IP address column to rate_limits table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rate_limits' AND column_name = 'ip_address'
  ) THEN
    ALTER TABLE public.rate_limits ADD COLUMN ip_address text;
  END IF;
END $$;

-- PHASE 3: Create enhanced rate limiting function with proper security
CREATE OR REPLACE FUNCTION public.check_rate_limit_enhanced(
  operation_name text, 
  max_attempts integer DEFAULT 5, 
  window_minutes integer DEFAULT 15
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  current_attempts integer;
  window_start_time timestamp with time zone;
  current_ip text;
BEGIN
  current_ip := coalesce(inet_client_addr()::text, 'unknown');
  window_start_time := now() - (window_minutes || ' minutes')::interval;
  
  -- Clean up old rate limit records
  DELETE FROM public.rate_limits 
  WHERE window_start < window_start_time;
  
  -- Count current attempts in the window for this user and IP
  SELECT COALESCE(SUM(attempt_count), 0) INTO current_attempts
  FROM public.rate_limits
  WHERE (user_id = auth.uid() OR coalesce(ip_address, '') = current_ip)
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
        'limit', max_attempts,
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
    ip_address = current_ip,
    window_start = CASE 
      WHEN public.rate_limits.window_start < window_start_time THEN now()
      ELSE public.rate_limits.window_start
    END;
  
  RETURN true;
END;
$function$;

-- PHASE 4: Create secure wrapper function for materialized views access
-- This addresses the "exposed materialized views" security vulnerability
CREATE OR REPLACE FUNCTION public.get_project_costs_secure(
  p_project_id uuid DEFAULT NULL
) RETURNS TABLE(
  phase_id uuid,
  project_id uuid,
  phase_name text,
  budget numeric,
  material_cost numeric,
  labor_cost_planned numeric,
  labor_cost_actual numeric,
  expense_cost numeric,
  total_committed numeric,
  variance numeric,
  forecast numeric,
  last_updated timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  user_role text;
  has_project_access boolean := false;
BEGIN
  -- Get current user role
  user_role := public.get_current_user_role();
  
  -- Rate limiting for sensitive data access
  IF NOT public.check_rate_limit_enhanced('project_costs_access', 30, 60) THEN
    -- Log rate limit exceeded
    INSERT INTO public.security_audit_log (
      user_id, action, table_name, 
      new_values, ip_address
    ) VALUES (
      auth.uid(), 'PROJECT_COSTS_RATE_LIMIT_EXCEEDED', 'security_events',
      jsonb_build_object(
        'threat_level', 'high',
        'user_role', user_role, 
        'project_id', p_project_id
      ),
      coalesce(inet_client_addr()::text, 'unknown')
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
      -- Log unauthorized access attempt
      INSERT INTO public.security_audit_log (
        user_id, action, table_name, 
        new_values, ip_address
      ) VALUES (
        auth.uid(), 'UNAUTHORIZED_PROJECT_COSTS_ACCESS', 'security_events',
        jsonb_build_object(
          'threat_level', 'critical',
          'user_role', user_role, 
          'project_id', p_project_id
        ),
        coalesce(inet_client_addr()::text, 'unknown')
      );
      RAISE EXCEPTION 'Access denied: insufficient project permissions';
    END IF;
  END IF;
  
  -- Log legitimate access
  INSERT INTO public.security_audit_log (
    user_id, action, table_name, 
    new_values, ip_address
  ) VALUES (
    auth.uid(), 'PROJECT_COSTS_SECURE_ACCESS', 'security_events',
    jsonb_build_object(
      'threat_level', 'medium',
      'user_role', user_role, 
      'project_id', p_project_id
    ),
    coalesce(inet_client_addr()::text, 'unknown')
  );
  
  -- Return data based on access level
  RETURN QUERY
  SELECT 
    pcv.phase_id,
    pcv.project_id,
    pcv.phase_name,
    pcv.budget,
    pcv.material_cost,
    pcv.labor_cost_planned,
    pcv.labor_cost_actual,
    pcv.expense_cost,
    pcv.total_committed,
    pcv.variance,
    pcv.forecast,
    pcv.last_updated
  FROM public.phase_costs_vw pcv
  WHERE 
    (user_role = 'admin' OR 
     (p_project_id IS NOT NULL AND has_project_access) OR
     (p_project_id IS NULL AND user_role = 'admin'))
    AND (p_project_id IS NULL OR pcv.project_id = p_project_id)
  ORDER BY pcv.phase_name;
END;
$function$;

-- PHASE 5: Secure the materialized views by revoking direct access
-- This prevents unauthorized API access to materialized views
REVOKE ALL ON public.phase_costs_vw FROM PUBLIC;
REVOKE ALL ON public.phase_costs_vw FROM authenticated;
REVOKE ALL ON public.phase_costs_vw FROM anon;

-- Grant access only to service role for internal operations
GRANT SELECT ON public.phase_costs_vw TO service_role;

-- Secure security_metrics_summary if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'security_metrics_summary'
  ) THEN
    REVOKE ALL ON public.security_metrics_summary FROM PUBLIC;
    REVOKE ALL ON public.security_metrics_summary FROM authenticated;
    REVOKE ALL ON public.security_metrics_summary FROM anon;
    GRANT SELECT ON public.security_metrics_summary TO service_role;
  END IF;
END $$;

-- PHASE 6: Grant execute permissions on secure wrapper functions
GRANT EXECUTE ON FUNCTION public.get_project_costs_secure(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit_enhanced(text, integer, integer) TO authenticated;

-- PHASE 7: Add security documentation comments
COMMENT ON FUNCTION public.get_project_costs_secure IS 'SECURITY FIX: Secure wrapper for phase_costs_vw materialized view with proper access controls, rate limiting, and audit logging. Prevents unauthorized API access to sensitive financial data.';
COMMENT ON FUNCTION public.check_rate_limit_enhanced IS 'SECURITY FIX: Enhanced rate limiting with IP tracking and audit logging to prevent abuse and DDoS attacks.';
COMMENT ON FUNCTION public.get_current_user_role IS 'SECURITY FIX: Added search_path protection to prevent search path injection attacks.';
COMMENT ON FUNCTION public.user_has_role IS 'SECURITY FIX: Added search_path protection to prevent search path injection attacks.';
COMMENT ON FUNCTION public.fn_is_member IS 'SECURITY FIX: Added search_path protection to prevent search path injection attacks.';
COMMENT ON FUNCTION public.fn_role_in_org IS 'SECURITY FIX: Added search_path protection to prevent search path injection attacks.';