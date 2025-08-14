-- Comprehensive Security Fix: Address all critical security vulnerabilities (Part 2)
-- This migration fixes 13+ security issues identified in the security review

-- PHASE 1: Drop and recreate problematic function
DROP FUNCTION IF EXISTS public.safe_log_critical_security_event(text, text, jsonb);

-- PHASE 1: Fix SECURITY DEFINER function vulnerabilities
-- Add proper search_path to all SECURITY DEFINER functions to prevent search path attacks

-- Fix existing SECURITY DEFINER functions with proper search paths
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

-- PHASE 2: Create enhanced rate limiting and audit logging functions
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
  WHERE (user_id = auth.uid() OR ip_address = current_ip)
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

CREATE OR REPLACE FUNCTION public.log_critical_security_event(
  event_type text,
  threat_level text DEFAULT 'medium',
  details jsonb DEFAULT '{}'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  INSERT INTO public.security_audit_log (
    user_id, action, table_name, 
    new_values, ip_address
  ) VALUES (
    auth.uid(), event_type, 'security_events',
    jsonb_build_object(
      'threat_level', threat_level,
      'details', details,
      'timestamp', now()
    ),
    coalesce(inet_client_addr()::text, 'unknown')
  );
END;
$function$;

-- Safe wrapper for logging that won't fail
CREATE OR REPLACE FUNCTION public.safe_log_critical_security_event(
  event_type text,
  threat_level text DEFAULT 'medium',
  details jsonb DEFAULT '{}'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  BEGIN
    PERFORM public.log_critical_security_event(event_type, threat_level, details);
    RETURN jsonb_build_object('logged', true);
  EXCEPTION WHEN OTHERS THEN
    -- Fail silently but return indication of failure
    RETURN jsonb_build_object('logged', false, 'error', SQLERRM);
  END;
END;
$function$;

-- PHASE 3: Add missing column to rate_limits table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rate_limits' AND column_name = 'ip_address'
  ) THEN
    ALTER TABLE public.rate_limits ADD COLUMN ip_address text;
  END IF;
END $$;

-- PHASE 4: Create secure wrapper functions for materialized views access
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
    PERFORM public.log_critical_security_event(
      'PROJECT_COSTS_RATE_LIMIT_EXCEEDED',
      'high',
      jsonb_build_object('user_role', user_role, 'project_id', p_project_id)
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
        'critical',
        jsonb_build_object('user_role', user_role, 'project_id', p_project_id)
      );
      RAISE EXCEPTION 'Access denied: insufficient project permissions';
    END IF;
  END IF;
  
  -- Log access attempt
  PERFORM public.log_critical_security_event(
    'PROJECT_COSTS_SECURE_ACCESS',
    'medium',
    jsonb_build_object('user_role', user_role, 'project_id', p_project_id)
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
-- Remove public access to materialized views
REVOKE ALL ON public.phase_costs_vw FROM PUBLIC;
REVOKE ALL ON public.phase_costs_vw FROM authenticated;
REVOKE ALL ON public.phase_costs_vw FROM anon;

-- Grant access only to service role for internal operations
GRANT SELECT ON public.phase_costs_vw TO service_role;

-- Grant execute permissions on secure wrapper functions
GRANT EXECUTE ON FUNCTION public.get_project_costs_secure(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit_enhanced(text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_critical_security_event(text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.safe_log_critical_security_event(text, text, jsonb) TO authenticated;