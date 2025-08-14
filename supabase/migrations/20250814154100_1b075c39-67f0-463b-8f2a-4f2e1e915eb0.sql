-- Fix remaining security issues from linter

-- 1. Block access to materialized views via API
DO $$
BEGIN
  -- Enable RLS on any materialized views to block API access
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'phase_costs_vw' AND table_type = 'VIEW') THEN
    EXECUTE 'ALTER MATERIALIZED VIEW IF EXISTS public.phase_costs_vw OWNER TO postgres';
    -- Since we can't enable RLS on materialized views, we'll drop and recreate as a function
    DROP MATERIALIZED VIEW IF EXISTS public.phase_costs_vw;
  END IF;
END $$;

-- 2. Create secure function to replace materialized view
CREATE OR REPLACE FUNCTION public.get_phase_costs_summary(p_project_id uuid DEFAULT NULL)
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
  -- Get current user role
  user_role := public.get_current_user_role();
  
  -- Only admins and project managers can access phase cost summaries
  IF user_role != 'admin' AND NOT EXISTS (
    SELECT 1 FROM user_project_role upr
    WHERE upr.user_id = auth.uid() 
    AND (p_project_id IS NULL OR upr.project_id = p_project_id)
    AND upr.role IN ('manager', 'admin')
  ) THEN
    RAISE EXCEPTION 'Access denied: insufficient permissions for phase cost data';
  END IF;
  
  -- Log access
  PERFORM public.log_critical_security_event(
    'PHASE_COSTS_SUMMARY_ACCESS',
    'medium',
    jsonb_build_object(
      'project_id', p_project_id,
      'user_role', user_role
    )
  );
  
  RETURN QUERY
  SELECT 
    pp.id as phase_id,
    pp.project_id,
    pp.name as phase_name,
    pp.budget,
    COALESCE(
      (SELECT SUM(pmc.total_cost) FROM phase_material_costs pmc WHERE pmc.phase_id = pp.id),
      0
    ) as material_cost,
    COALESCE(
      (SELECT SUM(plc.total_planned_cost) FROM phase_labor_costs plc WHERE plc.phase_id = pp.id),
      0
    ) as labor_cost_planned,
    COALESCE(
      (SELECT SUM(plc.total_actual_cost) FROM phase_labor_costs plc WHERE plc.phase_id = pp.id),
      0
    ) as labor_cost_actual,
    COALESCE(
      (SELECT SUM(pe.amount) FROM phase_expenses pe WHERE pe.phase_id = pp.id),
      0
    ) as expense_cost,
    COALESCE(pp.budget, 0) as total_committed,
    COALESCE(pp.budget, 0) as forecast,
    COALESCE(pp.budget, 0) - COALESCE(
      (SELECT SUM(pmc.total_cost) FROM phase_material_costs pmc WHERE pmc.phase_id = pp.id),
      0
    ) - COALESCE(
      (SELECT SUM(plc.total_actual_cost) FROM phase_labor_costs plc WHERE plc.phase_id = pp.id),
      0
    ) - COALESCE(
      (SELECT SUM(pe.amount) FROM phase_expenses pe WHERE pe.phase_id = pp.id),
      0
    ) as variance,
    pp.updated_at as last_updated
  FROM project_phases pp
  WHERE 
    (user_role = 'admin' OR EXISTS (
      SELECT 1 FROM user_project_role upr
      WHERE upr.user_id = auth.uid() 
      AND upr.project_id = pp.project_id
      AND upr.role IN ('manager', 'admin')
    ))
    AND (p_project_id IS NULL OR pp.project_id = p_project_id)
  ORDER BY pp.project_id, pp.id;
END;
$$;

-- 3. Fix functions missing search_path (update critical ones)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;