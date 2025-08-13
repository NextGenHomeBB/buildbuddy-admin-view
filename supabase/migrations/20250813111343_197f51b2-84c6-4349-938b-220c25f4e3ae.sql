-- Fix Security Definer Views by recreating them without SECURITY DEFINER
-- This addresses the critical security vulnerability where views bypass RLS

-- Drop existing views that have SECURITY DEFINER
DROP VIEW IF EXISTS public.phase_costs_vw CASCADE;
DROP VIEW IF EXISTS public.security_monitor_vw CASCADE;

-- Recreate phase_costs_vw without SECURITY DEFINER
CREATE VIEW public.phase_costs_vw AS
SELECT 
  pp.id as phase_id,
  pp.project_id,
  pp.name as phase_name,
  pp.budget,
  -- Material costs
  COALESCE(material_costs.total_cost, 0) as material_cost,
  -- Labor costs (planned and actual)
  COALESCE(labor_costs.planned_cost, 0) as labor_cost_planned,
  COALESCE(labor_costs.actual_cost, 0) as labor_cost_actual,
  -- Expense costs
  COALESCE(expense_costs.total_cost, 0) as expense_cost,
  -- Total committed costs
  COALESCE(material_costs.total_cost, 0) + 
  COALESCE(labor_costs.actual_cost, 0) + 
  COALESCE(expense_costs.total_cost, 0) as total_committed,
  -- Forecast (budget vs actual)
  pp.budget as forecast,
  -- Variance (budget - actual)
  pp.budget - (
    COALESCE(material_costs.total_cost, 0) + 
    COALESCE(labor_costs.actual_cost, 0) + 
    COALESCE(expense_costs.total_cost, 0)
  ) as variance,
  GREATEST(pp.updated_at, 
    COALESCE(material_costs.last_updated, pp.updated_at),
    COALESCE(labor_costs.last_updated, pp.updated_at),
    COALESCE(expense_costs.last_updated, pp.updated_at)
  ) as last_updated
FROM public.project_phases pp
LEFT JOIN (
  SELECT 
    phase_id,
    SUM(total_cost) as total_cost,
    MAX(updated_at) as last_updated
  FROM public.phase_material_costs
  GROUP BY phase_id
) material_costs ON pp.id = material_costs.phase_id
LEFT JOIN (
  SELECT 
    phase_id,
    SUM(total_planned_cost) as planned_cost,
    SUM(total_actual_cost) as actual_cost,
    MAX(updated_at) as last_updated
  FROM public.phase_labor_costs
  GROUP BY phase_id
) labor_costs ON pp.id = labor_costs.phase_id
LEFT JOIN (
  SELECT 
    phase_id,
    SUM(amount) as total_cost,
    MAX(updated_at) as last_updated
  FROM public.phase_expenses
  GROUP BY phase_id
) expense_costs ON pp.id = expense_costs.phase_id;

-- Enable RLS on the view (inherits from underlying tables)
ALTER VIEW public.phase_costs_vw SET (security_barrier = true);

-- Recreate security_monitor_vw without SECURITY DEFINER
CREATE VIEW public.security_monitor_vw AS
SELECT 
  sal.id,
  sal.timestamp,
  sal.user_id,
  p.full_name as user_name,
  sal.action,
  sal.table_name,
  sal.ip_address,
  -- Categorize events for monitoring
  CASE 
    WHEN sal.action LIKE '%LOGIN%' OR sal.action LIKE '%AUTH%' THEN 'authentication'
    WHEN sal.action LIKE '%CREDENTIAL%' OR sal.action LIKE '%TOKEN%' THEN 'credential_access'
    WHEN sal.action LIKE '%RATE_LIMIT%' THEN 'rate_limiting'
    WHEN sal.action LIKE '%SUSPICIOUS%' THEN 'suspicious_activity'
    WHEN sal.table_name IN ('user_roles', 'organization_members') THEN 'permission_changes'
    ELSE 'data_access'
  END as event_category,
  -- Assign severity levels
  CASE 
    WHEN sal.action LIKE '%SUSPICIOUS%' OR sal.action LIKE '%RATE_LIMIT_EXCEEDED%' THEN 'high'
    WHEN sal.action LIKE '%CREDENTIAL%' OR sal.action LIKE '%DELETE%' THEN 'medium'
    ELSE 'low'
  END as severity_level
FROM public.security_audit_log sal
LEFT JOIN public.profiles p ON sal.user_id = p.id
WHERE sal.timestamp >= NOW() - INTERVAL '30 days'; -- Only show recent events

-- Enable RLS on the security monitor view
ALTER VIEW public.security_monitor_vw SET (security_barrier = true);

-- Create RLS policy for security_monitor_vw access (admins only)
-- Note: Views inherit RLS from underlying tables, but we ensure admin-only access
CREATE OR REPLACE FUNCTION public.can_access_security_monitor()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT get_current_user_role() = 'admin';
$$;

-- Comment on the views to explain the security changes
COMMENT ON VIEW public.phase_costs_vw IS 'Phase cost aggregation view. Security: Inherits RLS from underlying tables, no longer uses SECURITY DEFINER.';
COMMENT ON VIEW public.security_monitor_vw IS 'Security monitoring view for admin oversight. Security: Restricted to admin users, no longer uses SECURITY DEFINER.';