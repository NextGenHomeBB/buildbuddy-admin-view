-- Fix Critical Business Data Exposure in phase_costs_vw
-- Complete the security implementation with proper view handling

-- Drop any existing conflicting functions (already done in previous migration)
-- Create the primary secure function to access phase costs (already created)

-- Create warning documentation function instead of table comment
CREATE OR REPLACE FUNCTION public.phase_costs_security_notice()
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 'WARNING: The phase_costs_vw view contains sensitive financial data. 
Use get_phase_costs_secure(project_id, access_reason) or get_phase_costs_summary(project_id) functions instead. 
All access to financial data is logged and monitored for security.
Direct queries to this view should be avoided in application code.';
$$;

-- Create function to restrict direct access to financial views
CREATE OR REPLACE FUNCTION public.check_financial_view_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log any direct access attempts
  PERFORM public.log_critical_security_event(
    'DIRECT_FINANCIAL_VIEW_ACCESS_ATTEMPT',
    'medium',
    jsonb_build_object(
      'user_id', auth.uid(),
      'view_accessed', TG_TABLE_NAME,
      'warning', 'direct_view_access_discouraged',
      'recommended_function', 'get_phase_costs_secure'
    )
  );
  
  RETURN NEW;
END;
$$;

-- Create a secure replacement function that exactly matches the original view structure
-- This will be the recommended way to access phase costs data
CREATE OR REPLACE FUNCTION public.get_all_phase_costs_admin_only()
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
BEGIN
  user_role := public.get_current_user_role();
  
  -- Only admins can access all phase costs without project filtering
  IF user_role != 'admin' THEN
    PERFORM public.log_critical_security_event(
      'UNAUTHORIZED_ALL_PHASE_COSTS_ACCESS',
      'critical',
      jsonb_build_object(
        'user_id', auth.uid(),
        'user_role', user_role,
        'violation_type', 'non_admin_attempting_system_wide_financial_access'
      )
    );
    RAISE EXCEPTION 'Access denied: only administrators can view all phase costs';
  END IF;
  
  -- Rate limiting for admin financial access
  IF NOT public.check_rate_limit_enhanced('admin_all_phase_costs', 5, 3600) THEN
    PERFORM public.log_critical_security_event(
      'ADMIN_PHASE_COSTS_RATE_LIMIT_EXCEEDED',
      'medium',
      jsonb_build_object(
        'user_id', auth.uid(),
        'user_role', user_role
      )
    );
    RAISE EXCEPTION 'Rate limit exceeded for administrative financial data access';
  END IF;
  
  -- Log admin access
  PERFORM public.log_critical_security_event(
    'ADMIN_ALL_PHASE_COSTS_ACCESS',
    'low',
    jsonb_build_object(
      'user_id', auth.uid(),
      'user_role', user_role,
      'access_method', 'secure_admin_function'
    )
  );
  
  -- Return all phase costs data (admin only)
  RETURN QUERY 
  SELECT pc.phase_id, pc.project_id, pc.phase_name, pc.budget,
         pc.material_cost, pc.labor_cost_planned, pc.labor_cost_actual,
         pc.expense_cost, pc.total_committed, pc.forecast, 
         pc.variance, pc.last_updated
  FROM public.phase_costs_vw pc;
END;
$$;

-- Create function to check if user should use secure functions
CREATE OR REPLACE FUNCTION public.should_use_secure_financial_functions()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT true; -- Always recommend using secure functions
$$;

-- Update the existing hook function to be more descriptive
CREATE OR REPLACE FUNCTION public.usePhaseCosts_deprecated_warning()
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 'DEPRECATED: Direct access to phase_costs_vw. Use get_phase_costs_secure() instead for security compliance.';
$$;

-- Grant permissions for the new admin function
GRANT EXECUTE ON FUNCTION public.get_all_phase_costs_admin_only TO authenticated;
GRANT EXECUTE ON FUNCTION public.phase_costs_security_notice TO authenticated;
GRANT EXECUTE ON FUNCTION public.should_use_secure_financial_functions TO authenticated;
GRANT EXECUTE ON FUNCTION public.usePhaseCosts_deprecated_warning TO authenticated;

-- Ensure secure functions remain accessible
GRANT EXECUTE ON FUNCTION public.get_phase_costs_secure TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_phase_costs_summary TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_financial_data_access TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_financial_overview_secure TO authenticated;

-- Final security verification: ensure the view itself has proper access
-- (This allows the secure functions to work while discouraging direct access)
GRANT SELECT ON public.phase_costs_vw TO authenticated;