-- Fix the critical financial data security vulnerability for phase_costs_vw
-- Since RLS cannot be applied directly to views, we implement security through controlled access functions

-- First, let's check if the view exists and understand its structure
DROP VIEW IF EXISTS public.phase_costs_vw CASCADE;

-- Recreate the view with proper structure based on the underlying tables
CREATE VIEW public.phase_costs_vw AS
WITH phase_material_costs_agg AS (
  SELECT 
    pmc.phase_id,
    COALESCE(SUM(pmc.total_cost), 0) as material_cost,
    MAX(pmc.updated_at) as material_last_updated
  FROM public.phase_material_costs pmc
  GROUP BY pmc.phase_id
),
phase_labor_costs_agg AS (
  SELECT 
    plc.phase_id,
    COALESCE(SUM(plc.total_planned_cost), 0) as labor_cost_planned,
    COALESCE(SUM(plc.total_actual_cost), 0) as labor_cost_actual,
    MAX(plc.updated_at) as labor_last_updated
  FROM public.phase_labor_costs plc
  GROUP BY plc.phase_id
),
phase_expense_costs_agg AS (
  SELECT 
    pe.phase_id,
    COALESCE(SUM(pe.amount), 0) as expense_cost,
    MAX(pe.updated_at) as expense_last_updated
  FROM public.phase_expenses pe
  WHERE pe.approved_at IS NOT NULL
  GROUP BY pe.phase_id
)
SELECT 
  pp.id as phase_id,
  pp.project_id,
  pp.name as phase_name,
  pp.budget,
  COALESCE(pmc.material_cost, 0) as material_cost,
  COALESCE(plc.labor_cost_planned, 0) as labor_cost_planned,
  COALESCE(plc.labor_cost_actual, 0) as labor_cost_actual,
  COALESCE(pec.expense_cost, 0) as expense_cost,
  (COALESCE(pmc.material_cost, 0) + COALESCE(plc.labor_cost_actual, 0) + COALESCE(pec.expense_cost, 0)) as total_committed,
  -- Simple forecast: planned costs where actual is not available
  (COALESCE(pmc.material_cost, 0) + 
   CASE 
     WHEN COALESCE(plc.labor_cost_actual, 0) > 0 THEN plc.labor_cost_actual 
     ELSE COALESCE(plc.labor_cost_planned, 0) 
   END + 
   COALESCE(pec.expense_cost, 0)) as forecast,
  -- Variance calculation: budget minus total committed
  (pp.budget - (COALESCE(pmc.material_cost, 0) + COALESCE(plc.labor_cost_actual, 0) + COALESCE(pec.expense_cost, 0))) as variance,
  GREATEST(
    pp.updated_at, 
    COALESCE(pmc.material_last_updated, pp.updated_at), 
    COALESCE(plc.labor_last_updated, pp.updated_at), 
    COALESCE(pec.expense_last_updated, pp.updated_at)
  ) as last_updated
FROM public.project_phases pp
LEFT JOIN phase_material_costs_agg pmc ON pp.id = pmc.phase_id
LEFT JOIN phase_labor_costs_agg plc ON pp.id = plc.phase_id
LEFT JOIN phase_expense_costs_agg pec ON pp.id = pec.phase_id;

-- Now create the secure access function that replaces direct view access
CREATE OR REPLACE FUNCTION public.get_phase_costs_secure(p_project_id uuid DEFAULT NULL::uuid)
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
SET search_path = 'public'
AS $$
DECLARE
  user_role text;
BEGIN
  -- Get current user role securely
  user_role := public.get_current_user_role();
  
  -- Log this financial data access attempt
  INSERT INTO public.security_audit_log (
    user_id, action, table_name,
    new_values, ip_address
  ) VALUES (
    auth.uid(), 
    'SECURE_PHASE_COSTS_ACCESS', 
    'phase_costs_vw',
    jsonb_build_object(
      'user_role', user_role,
      'project_filter', p_project_id,
      'access_time', now(),
      'security_level', 'high'
    ),
    inet_client_addr()::text
  );
  
  -- Check permissions: Only admins or project managers can access phase costs
  IF NOT (
    user_role = 'admin' OR
    (p_project_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.user_project_role upr
      WHERE upr.user_id = auth.uid() 
      AND upr.project_id = p_project_id
      AND upr.role IN ('manager', 'admin')
    ))
  ) THEN
    RAISE EXCEPTION 'Access denied: insufficient permissions to view phase costs data';
  END IF;
  
  -- Return filtered data based on permissions
  IF user_role = 'admin' THEN
    -- Admins can see all phase costs
    RETURN QUERY 
    SELECT pcv.phase_id, pcv.project_id, pcv.phase_name, pcv.budget,
           pcv.material_cost, pcv.labor_cost_planned, pcv.labor_cost_actual,
           pcv.expense_cost, pcv.total_committed, pcv.forecast, 
           pcv.variance, pcv.last_updated
    FROM public.phase_costs_vw pcv
    WHERE (p_project_id IS NULL OR pcv.project_id = p_project_id);
  ELSE
    -- Project managers can only see their project costs
    RETURN QUERY 
    SELECT pcv.phase_id, pcv.project_id, pcv.phase_name, pcv.budget,
           pcv.material_cost, pcv.labor_cost_planned, pcv.labor_cost_actual,
           pcv.expense_cost, pcv.total_committed, pcv.forecast,
           pcv.variance, pcv.last_updated
    FROM public.phase_costs_vw pcv
    WHERE pcv.project_id = p_project_id
    AND EXISTS (
      SELECT 1 FROM public.user_project_role upr
      WHERE upr.user_id = auth.uid() 
      AND upr.project_id = pcv.project_id
      AND upr.role IN ('manager', 'admin')
    );
  END IF;
END;
$$;

-- Create a function to check if user can access financial data for a project
CREATE OR REPLACE FUNCTION public.can_access_project_financial_data(p_project_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_role text;
BEGIN
  user_role := public.get_current_user_role();
  
  RETURN (
    user_role = 'admin' OR
    EXISTS (
      SELECT 1 FROM public.user_project_role upr
      WHERE upr.user_id = auth.uid() 
      AND upr.project_id = p_project_id
      AND upr.role IN ('manager', 'admin')
    )
  );
END;
$$;