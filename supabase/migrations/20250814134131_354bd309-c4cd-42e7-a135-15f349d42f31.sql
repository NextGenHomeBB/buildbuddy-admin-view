-- Fix Critical Business Data Exposure in phase_costs_vw
-- Enable RLS and create secure access policies for sensitive financial data

-- Enable Row Level Security on the phase_costs_vw view
ALTER TABLE public.phase_costs_vw ENABLE ROW LEVEL SECURITY;

-- Create secure function to access phase costs with proper authorization
CREATE OR REPLACE FUNCTION public.get_phase_costs_secure(
  p_project_id uuid DEFAULT NULL,
  p_access_reason text DEFAULT 'financial_review'
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
  user_role := public.get_current_user_role();
  
  -- Rate limiting for financial data access
  IF NOT public.check_rate_limit_enhanced('phase_costs_access', 20, 3600) THEN
    PERFORM public.log_critical_security_event(
      'PHASE_COSTS_RATE_LIMIT_EXCEEDED',
      'high',
      jsonb_build_object(
        'user_id', auth.uid(),
        'user_role', user_role,
        'project_id', p_project_id,
        'access_reason', p_access_reason
      )
    );
    RAISE EXCEPTION 'Rate limit exceeded for financial data access';
  END IF;
  
  -- Check if user has permission to view phase costs
  IF user_role = 'admin' THEN
    has_project_access := true;
  ELSIF p_project_id IS NOT NULL THEN
    -- Check if user has manager access to specific project
    SELECT EXISTS (
      SELECT 1 FROM public.user_project_role upr
      WHERE upr.user_id = auth.uid() 
      AND upr.project_id = p_project_id
      AND upr.role IN ('manager', 'admin')
    ) INTO has_project_access;
  ELSE
    -- If no specific project requested, deny access for non-admins
    has_project_access := false;
  END IF;
  
  -- Deny access if user doesn't have proper permissions
  IF NOT has_project_access THEN
    PERFORM public.log_critical_security_event(
      'UNAUTHORIZED_PHASE_COSTS_ACCESS_ATTEMPT',
      'critical',
      jsonb_build_object(
        'user_id', auth.uid(),
        'user_role', user_role,
        'project_id', p_project_id,
        'access_reason', p_access_reason,
        'violation_type', 'insufficient_financial_permissions'
      )
    );
    RAISE EXCEPTION 'Access denied: insufficient permissions to view financial data';
  END IF;
  
  -- Log legitimate financial data access
  PERFORM public.log_critical_security_event(
    'PHASE_COSTS_SECURE_ACCESS',
    'medium',
    jsonb_build_object(
      'user_id', auth.uid(),
      'user_role', user_role,
      'project_id', p_project_id,
      'access_reason', p_access_reason,
      'access_method', 'secure_rpc_function'
    )
  );
  
  -- Return filtered data based on permissions
  IF user_role = 'admin' THEN
    -- Admins can see all phase costs
    RETURN QUERY 
    SELECT pc.phase_id, pc.project_id, pc.phase_name, pc.budget,
           pc.material_cost, pc.labor_cost_planned, pc.labor_cost_actual,
           pc.expense_cost, pc.total_committed, pc.forecast, 
           pc.variance, pc.last_updated
    FROM public.phase_costs_vw pc
    WHERE (p_project_id IS NULL OR pc.project_id = p_project_id);
  ELSE
    -- Project managers can only see their project costs
    RETURN QUERY 
    SELECT pc.phase_id, pc.project_id, pc.phase_name, pc.budget,
           pc.material_cost, pc.labor_cost_planned, pc.labor_cost_actual,
           pc.expense_cost, pc.total_committed, pc.forecast,
           pc.variance, pc.last_updated
    FROM public.phase_costs_vw pc
    WHERE pc.project_id = p_project_id
    AND EXISTS (
      SELECT 1 FROM public.user_project_role upr
      WHERE upr.user_id = auth.uid() 
      AND upr.project_id = pc.project_id
      AND upr.role IN ('manager', 'admin')
    );
  END IF;
END;
$$;

-- Create function for summary financial data (less sensitive)
CREATE OR REPLACE FUNCTION public.get_phase_costs_summary(
  p_project_id uuid,
  p_access_reason text DEFAULT 'project_overview'
)
RETURNS TABLE(
  project_id uuid,
  total_phases integer,
  total_budget numeric,
  total_actual_cost numeric,
  budget_utilization_percent numeric,
  phases_over_budget integer
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
  user_role := public.get_current_user_role();
  
  -- Check project access
  IF user_role = 'admin' THEN
    has_project_access := true;
  ELSE
    -- Check if user has any role in the project
    SELECT EXISTS (
      SELECT 1 FROM public.user_project_role upr
      WHERE upr.user_id = auth.uid() 
      AND upr.project_id = p_project_id
    ) INTO has_project_access;
  END IF;
  
  IF NOT has_project_access THEN
    PERFORM public.log_critical_security_event(
      'UNAUTHORIZED_PHASE_SUMMARY_ACCESS',
      'medium',
      jsonb_build_object(
        'user_id', auth.uid(),
        'user_role', user_role,
        'project_id', p_project_id,
        'access_reason', p_access_reason
      )
    );
    RAISE EXCEPTION 'Access denied: no access to project financial summary';
  END IF;
  
  -- Log access to summary data
  PERFORM public.log_critical_security_event(
    'PHASE_COSTS_SUMMARY_ACCESS',
    'low',
    jsonb_build_object(
      'user_id', auth.uid(),
      'user_role', user_role,
      'project_id', p_project_id,
      'access_reason', p_access_reason
    )
  );
  
  -- Return aggregated data
  RETURN QUERY 
  SELECT 
    p_project_id,
    COUNT(*)::integer AS total_phases,
    COALESCE(SUM(pc.budget), 0) AS total_budget,
    COALESCE(SUM(pc.total_committed), 0) AS total_actual_cost,
    CASE 
      WHEN SUM(pc.budget) > 0 THEN (SUM(pc.total_committed) / SUM(pc.budget) * 100)
      ELSE 0 
    END AS budget_utilization_percent,
    COUNT(CASE WHEN pc.variance < 0 THEN 1 END)::integer AS phases_over_budget
  FROM public.phase_costs_vw pc
  WHERE pc.project_id = p_project_id;
END;
$$;

-- Create RLS policies for phase_costs_vw
-- Policy 1: Admins can view all financial data with logging
CREATE POLICY "phase_costs_admin_access"
ON public.phase_costs_vw
FOR SELECT
USING (
  public.get_current_user_role() = 'admin'
  AND (
    -- Log admin access to financial data
    public.log_critical_security_event(
      'PHASE_COSTS_ADMIN_DIRECT_ACCESS',
      'medium',
      jsonb_build_object(
        'user_id', auth.uid(),
        'project_id', project_id,
        'phase_id', phase_id,
        'access_method', 'direct_table_query',
        'warning', 'recommend_using_secure_rpc_function'
      )
    ) IS NOT NULL
  )
);

-- Policy 2: Project managers can view costs for their assigned projects only
CREATE POLICY "phase_costs_project_manager_access"
ON public.phase_costs_vw
FOR SELECT
USING (
  public.get_current_user_role() IN ('manager', 'worker')
  AND EXISTS (
    SELECT 1 FROM public.user_project_role upr
    WHERE upr.user_id = auth.uid() 
    AND upr.project_id = phase_costs_vw.project_id
    AND upr.role IN ('manager', 'admin')
  )
  AND (
    -- Log project manager access to financial data
    public.log_critical_security_event(
      'PHASE_COSTS_MANAGER_DIRECT_ACCESS',
      'medium',
      jsonb_build_object(
        'user_id', auth.uid(),
        'project_id', project_id,
        'phase_id', phase_id,
        'user_role', public.get_current_user_role(),
        'access_method', 'direct_table_query',
        'warning', 'recommend_using_secure_rpc_function'
      )
    ) IS NOT NULL
  )
);

-- Create monitoring trigger for direct access to phase_costs_vw
CREATE OR REPLACE FUNCTION public.monitor_phase_costs_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role text;
  access_count integer;
BEGIN
  user_role := public.get_current_user_role();
  
  -- Count recent access attempts
  SELECT COUNT(*) INTO access_count
  FROM public.security_audit_log
  WHERE user_id = auth.uid()
    AND action LIKE '%PHASE_COSTS%'
    AND timestamp > now() - INTERVAL '1 hour';
  
  -- Flag high-frequency access as suspicious
  IF access_count > 50 THEN
    PERFORM public.log_critical_security_event(
      'SUSPICIOUS_PHASE_COSTS_ACCESS_PATTERN',
      'high',
      jsonb_build_object(
        'user_id', auth.uid(),
        'user_role', user_role,
        'access_count_last_hour', access_count,
        'project_id', NEW.project_id,
        'phase_id', NEW.phase_id,
        'threat_level', 'potential_data_scraping'
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Note: Cannot create triggers on views, but policies will handle logging

-- Create function to validate financial data access permissions
CREATE OR REPLACE FUNCTION public.validate_financial_data_access(
  operation_type text,
  target_project_id uuid DEFAULT NULL,
  access_justification text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role text;
  has_access boolean := false;
BEGIN
  user_role := public.get_current_user_role();
  
  -- Validate access justification is provided
  IF access_justification IS NULL OR access_justification = '' THEN
    PERFORM public.log_critical_security_event(
      'FINANCIAL_ACCESS_NO_JUSTIFICATION',
      'medium',
      jsonb_build_object(
        'operation_type', operation_type,
        'user_id', auth.uid(),
        'user_role', user_role,
        'target_project_id', target_project_id
      )
    );
    RETURN false;
  END IF;
  
  -- Check permissions based on role
  IF user_role = 'admin' THEN
    has_access := true;
  ELSIF target_project_id IS NOT NULL THEN
    -- Check project-specific access
    SELECT EXISTS (
      SELECT 1 FROM public.user_project_role upr
      WHERE upr.user_id = auth.uid() 
      AND upr.project_id = target_project_id
      AND upr.role IN ('manager', 'admin')
    ) INTO has_access;
  END IF;
  
  -- Log the access validation
  PERFORM public.log_critical_security_event(
    'FINANCIAL_ACCESS_VALIDATION',
    CASE WHEN has_access THEN 'low' ELSE 'high' END,
    jsonb_build_object(
      'operation_type', operation_type,
      'user_id', auth.uid(),
      'user_role', user_role,
      'target_project_id', target_project_id,
      'access_justification', access_justification,
      'access_granted', has_access
    )
  );
  
  RETURN has_access;
END;
$$;

-- Grant necessary permissions
GRANT SELECT ON public.phase_costs_vw TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_phase_costs_secure TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_phase_costs_summary TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_financial_data_access TO authenticated;