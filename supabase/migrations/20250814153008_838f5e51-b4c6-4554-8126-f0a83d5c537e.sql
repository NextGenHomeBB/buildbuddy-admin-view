-- Fix function conflicts and implement enhanced security functions

-- Drop existing function to avoid conflicts
DROP FUNCTION IF EXISTS public.safe_log_critical_security_event(text, text, jsonb);

-- Enhanced critical security event logging
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
      'user_agent', current_setting('request.headers', true)::json->>'user-agent',
      'session_id', current_setting('request.jwt.claims', true)::json->>'session_id'
    ),
    inet_client_addr()::text
  );
  
  -- Auto-escalate critical events
  IF severity = 'critical' THEN
    RAISE WARNING 'CRITICAL SECURITY EVENT: % - %', event_type, details;
  END IF;
END;
$$;

-- Safe logging function for policies (returns text for RLS compatibility)
CREATE OR REPLACE FUNCTION public.safe_log_critical_security_event(
  event_type text, 
  severity text DEFAULT 'medium',
  details jsonb DEFAULT '{}'
) 
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM log_critical_security_event(event_type, severity, details);
  RETURN 'logged';
EXCEPTION WHEN OTHERS THEN
  -- Fail silently in RLS context to avoid blocking operations
  RETURN 'error';
END;
$$;

-- Enhanced rate limiting function
CREATE OR REPLACE FUNCTION public.check_rate_limit_enhanced(
  operation_name text, 
  max_attempts integer DEFAULT 10, 
  window_minutes integer DEFAULT 60
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
  
  -- Count current attempts in the window for this user and IP
  SELECT COALESCE(SUM(attempt_count), 0) INTO current_attempts
  FROM public.rate_limits
  WHERE user_id = auth.uid() 
    AND operation = operation_name 
    AND window_start >= window_start_time
    AND (ip_address = current_ip OR ip_address IS NULL);
  
  -- Check if limit exceeded
  IF current_attempts >= max_attempts THEN
    -- Log rate limit violation (fail safely)
    BEGIN
      PERFORM log_critical_security_event(
        'RATE_LIMIT_EXCEEDED',
        'high',
        jsonb_build_object(
          'operation', operation_name,
          'attempts', current_attempts,
          'max_attempts', max_attempts,
          'ip_address', current_ip
        )
      );
    EXCEPTION WHEN OTHERS THEN
      -- Continue even if logging fails
      NULL;
    END;
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

-- Enhanced audit sensitive operations
CREATE OR REPLACE FUNCTION public.audit_sensitive_operation(
  operation_type text,
  table_name text,
  record_id uuid DEFAULT NULL,
  sensitive_data_accessed text[] DEFAULT ARRAY[]::text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM log_critical_security_event(
    'SENSITIVE_DATA_ACCESS',
    'medium',
    jsonb_build_object(
      'operation_type', operation_type,
      'table_name', table_name,
      'record_id', record_id,
      'sensitive_fields', sensitive_data_accessed,
      'user_role', get_current_user_role()
    )
  );
END;
$$;

-- Function to check if user is HR administrator (for profile access)
CREATE OR REPLACE FUNCTION public.is_hr_administrator()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT get_current_user_role() = 'admin';
$$;

-- Secure view for phase costs that blocks direct API access
CREATE OR REPLACE VIEW public.phase_costs_secure AS
SELECT 
  phase_id,
  project_id,
  phase_name,
  budget,
  material_cost,
  labor_cost_planned,
  labor_cost_actual,
  expense_cost,
  total_committed,
  forecast,
  variance,
  last_updated
FROM public.phase_costs_vw
WHERE 
  -- Only allow access through secure functions or to admins
  (SELECT get_current_user_role()) = 'admin'
  OR EXISTS (
    SELECT 1 FROM user_project_role upr
    WHERE upr.user_id = auth.uid() 
    AND upr.project_id = phase_costs_vw.project_id
    AND upr.role IN ('manager', 'admin')
  );

-- Add RLS to the secure view
ALTER VIEW public.phase_costs_secure ENABLE ROW LEVEL SECURITY;

-- Create policy for phase_costs_secure view
CREATE POLICY "Admins and project managers can view phase costs securely"
ON public.phase_costs_secure
FOR SELECT
USING (
  get_current_user_role() = 'admin'
  OR EXISTS (
    SELECT 1 FROM user_project_role upr
    WHERE upr.user_id = auth.uid() 
    AND upr.project_id = phase_costs_secure.project_id
    AND upr.role IN ('manager', 'admin')
  )
);

-- Update the original materialized view to be more restrictive
DROP POLICY IF EXISTS "phase_costs_vw_policy" ON public.phase_costs_vw;
CREATE POLICY "Block direct access to phase_costs_vw"
ON public.phase_costs_vw
FOR ALL
USING (false);  -- Block all direct access

-- Create secure function to access phase costs data
CREATE OR REPLACE FUNCTION public.get_phase_costs_secure(
  p_project_id uuid DEFAULT NULL,
  p_phase_id uuid DEFAULT NULL
)
RETURNS TABLE(
  phase_id uuid,
  project_id uuid,
  phase_name text,
  budget numeric,
  material_cost numeric,
  labor_cost_planned numeric,
  labor_cost_actual numeric,
  expense_cost numeric,
  total_committed numeric,
  forecast numeric,
  variance numeric,
  last_updated timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role text;
  has_project_access boolean := false;
BEGIN
  -- Get current user role
  user_role := get_current_user_role();
  
  -- Enhanced rate limiting for phase costs access
  IF NOT check_rate_limit_enhanced('phase_costs_access', 50, 60) THEN
    PERFORM log_critical_security_event(
      'PHASE_COSTS_RATE_LIMIT_EXCEEDED',
      'medium',
      jsonb_build_object(
        'user_role', user_role,
        'project_id', p_project_id,
        'phase_id', p_phase_id
      )
    );
    RAISE EXCEPTION 'Rate limit exceeded for phase costs access';
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
      PERFORM log_critical_security_event(
        'UNAUTHORIZED_PHASE_COSTS_ACCESS',
        'high',
        jsonb_build_object(
          'project_id', p_project_id,
          'user_role', user_role,
          'requesting_user', auth.uid()
        )
      );
      RAISE EXCEPTION 'Access denied: insufficient project permissions for phase costs data';
    END IF;
  END IF;
  
  -- Log legitimate access
  PERFORM log_critical_security_event(
    'PHASE_COSTS_SECURE_ACCESS',
    'low',
    jsonb_build_object(
      'user_role', user_role,
      'project_id', p_project_id,
      'phase_id', p_phase_id,
      'has_project_access', has_project_access
    )
  );
  
  -- Return phase costs data with role-based filtering
  RETURN QUERY
  SELECT 
    pcv.phase_id,
    pcv.project_id,
    pcv.phase_name,
    CASE
      WHEN user_role = 'admin' OR has_project_access THEN pcv.budget
      ELSE NULL::numeric
    END AS budget,
    CASE
      WHEN user_role = 'admin' OR has_project_access THEN pcv.material_cost
      ELSE NULL::numeric
    END AS material_cost,
    CASE
      WHEN user_role = 'admin' OR has_project_access THEN pcv.labor_cost_planned
      ELSE NULL::numeric
    END AS labor_cost_planned,
    CASE
      WHEN user_role = 'admin' OR has_project_access THEN pcv.labor_cost_actual
      ELSE NULL::numeric
    END AS labor_cost_actual,
    CASE
      WHEN user_role = 'admin' OR has_project_access THEN pcv.expense_cost
      ELSE NULL::numeric
    END AS expense_cost,
    CASE
      WHEN user_role = 'admin' OR has_project_access THEN pcv.total_committed
      ELSE NULL::numeric
    END AS total_committed,
    CASE
      WHEN user_role = 'admin' OR has_project_access THEN pcv.forecast
      ELSE NULL::numeric
    END AS forecast,
    CASE
      WHEN user_role = 'admin' OR has_project_access THEN pcv.variance
      ELSE NULL::numeric
    END AS variance,
    pcv.last_updated
  FROM public.phase_costs_vw pcv
  WHERE 
    (user_role = 'admin' OR 
     EXISTS (
       SELECT 1 FROM user_project_role upr
       WHERE upr.user_id = auth.uid() 
       AND upr.project_id = pcv.project_id
       AND upr.role IN ('manager', 'admin')
     ))
    AND (p_project_id IS NULL OR pcv.project_id = p_project_id)
    AND (p_phase_id IS NULL OR pcv.phase_id = p_phase_id)
  ORDER BY pcv.phase_name;
END;
$$;