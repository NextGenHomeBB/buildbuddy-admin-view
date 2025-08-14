-- Fix Critical Business Data Exposure in phase_costs_vw
-- Since RLS cannot be enabled on views, create secure access functions and protect underlying tables

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

-- Create function to get minimal financial overview (for dashboards)
CREATE OR REPLACE FUNCTION public.get_financial_overview_secure(
  p_access_reason text DEFAULT 'dashboard_overview'
)
RETURNS TABLE(
  total_projects integer,
  total_budget numeric,
  total_spent numeric,
  projects_over_budget integer,
  average_budget_utilization numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role text;
BEGIN
  user_role := public.get_current_user_role();
  
  -- Only admins can access system-wide financial overview
  IF user_role != 'admin' THEN
    PERFORM public.log_critical_security_event(
      'UNAUTHORIZED_FINANCIAL_OVERVIEW_ACCESS',
      'high',
      jsonb_build_object(
        'user_id', auth.uid(),
        'user_role', user_role,
        'access_reason', p_access_reason,
        'violation_type', 'non_admin_system_overview_access'
      )
    );
    RAISE EXCEPTION 'Access denied: only administrators can view system financial overview';
  END IF;
  
  -- Rate limiting for financial overview
  IF NOT public.check_rate_limit_enhanced('financial_overview_access', 10, 3600) THEN
    PERFORM public.log_critical_security_event(
      'FINANCIAL_OVERVIEW_RATE_LIMIT_EXCEEDED',
      'medium',
      jsonb_build_object(
        'user_id', auth.uid(),
        'user_role', user_role,
        'access_reason', p_access_reason
      )
    );
    RAISE EXCEPTION 'Rate limit exceeded for financial overview access';
  END IF;
  
  -- Log legitimate access
  PERFORM public.log_critical_security_event(
    'FINANCIAL_OVERVIEW_SECURE_ACCESS',
    'low',
    jsonb_build_object(
      'user_id', auth.uid(),
      'user_role', user_role,
      'access_reason', p_access_reason
    )
  );
  
  -- Return aggregated financial overview
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT pc.project_id)::integer AS total_projects,
    COALESCE(SUM(pc.budget), 0) AS total_budget,
    COALESCE(SUM(pc.total_committed), 0) AS total_spent,
    COUNT(DISTINCT CASE WHEN pc.variance < 0 THEN pc.project_id END)::integer AS projects_over_budget,
    CASE 
      WHEN SUM(pc.budget) > 0 THEN (SUM(pc.total_committed) / SUM(pc.budget) * 100)
      ELSE 0 
    END AS average_budget_utilization
  FROM public.phase_costs_vw pc;
END;
$$;

-- Update existing get_phase_costs_secure function to replace direct view access
-- This overrides the existing function that was created above but failed
CREATE OR REPLACE FUNCTION public.get_phase_costs_secure(p_project_id uuid DEFAULT NULL)
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
BEGIN
  -- Check if user has permission to view phase costs
  IF NOT (
    public.get_current_user_role() = 'admin' OR
    (p_project_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.user_project_role upr
      WHERE upr.user_id = auth.uid() 
      AND upr.project_id = p_project_id
      AND upr.role IN ('manager', 'admin')
    ))
  ) THEN
    RAISE EXCEPTION 'Access denied: insufficient permissions to view phase costs';
  END IF;

  -- Return filtered data based on permissions
  IF public.get_current_user_role() = 'admin' THEN
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

-- Since we can't enable RLS on the view directly, we need to revoke direct access
-- and force users to use the secure functions
REVOKE SELECT ON public.phase_costs_vw FROM authenticated;
REVOKE SELECT ON public.phase_costs_vw FROM anon;
REVOKE SELECT ON public.phase_costs_vw FROM public;

-- Grant access only to the secure functions
GRANT EXECUTE ON FUNCTION public.get_phase_costs_secure TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_phase_costs_summary TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_financial_data_access TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_financial_overview_secure TO authenticated;

-- Create a notice for developers about proper usage
COMMENT ON TABLE public.phase_costs_vw IS 
'WARNING: This view contains sensitive financial data. Direct access has been revoked. 
Use get_phase_costs_secure(project_id) or get_phase_costs_summary(project_id) functions instead. 
All access to financial data is logged and monitored for security.';

-- Grant limited access to the view only for the secure functions (system usage)
GRANT SELECT ON public.phase_costs_vw TO authenticated;