-- Fix the remaining Security Definer View issue
-- Replace phase_costs_vw with a secure alternative

-- Drop the existing view that bypasses RLS
DROP VIEW IF EXISTS phase_costs_vw CASCADE;

-- Create a secure view that respects the current user's RLS context
-- This view will only show data that the current user has access to
CREATE VIEW phase_costs_vw WITH (security_invoker=true) AS
SELECT 
    pp.id AS phase_id,
    pp.project_id,
    pp.name AS phase_name,
    pp.budget,
    COALESCE(material_costs.total_cost, (0)::numeric) AS material_cost,
    COALESCE(labor_costs.planned_cost, (0)::numeric) AS labor_cost_planned,
    COALESCE(labor_costs.actual_cost, (0)::numeric) AS labor_cost_actual,
    COALESCE(expense_costs.total_cost, (0)::numeric) AS expense_cost,
    ((COALESCE(material_costs.total_cost, (0)::numeric) + COALESCE(labor_costs.actual_cost, (0)::numeric)) + COALESCE(expense_costs.total_cost, (0)::numeric)) AS total_committed,
    pp.budget AS forecast,
    (pp.budget - ((COALESCE(material_costs.total_cost, (0)::numeric) + COALESCE(labor_costs.actual_cost, (0)::numeric)) + COALESCE(expense_costs.total_cost, (0)::numeric))) AS variance,
    GREATEST(pp.updated_at, COALESCE(material_costs.last_updated, pp.updated_at), COALESCE(labor_costs.last_updated, pp.updated_at), COALESCE(expense_costs.last_updated, pp.updated_at)) AS last_updated
FROM project_phases pp
LEFT JOIN (
    SELECT 
        phase_id,
        sum(total_cost) AS total_cost,
        max(updated_at) AS last_updated
    FROM phase_material_costs
    GROUP BY phase_id
) material_costs ON (pp.id = material_costs.phase_id)
LEFT JOIN (
    SELECT 
        phase_id,
        sum(total_planned_cost) AS planned_cost,
        sum(total_actual_cost) AS actual_cost,
        max(updated_at) AS last_updated
    FROM phase_labor_costs
    GROUP BY phase_id
) labor_costs ON (pp.id = labor_costs.phase_id)
LEFT JOIN (
    SELECT 
        phase_id,
        sum(amount) AS total_cost,
        max(updated_at) AS last_updated
    FROM phase_expenses
    GROUP BY phase_id
) expense_costs ON (pp.id = expense_costs.phase_id);

-- Add RLS to the new view (inherited from underlying tables)
ALTER VIEW phase_costs_vw OWNER TO postgres;

-- Add explanatory comment
COMMENT ON VIEW phase_costs_vw IS 'Secure phase costs view that respects RLS policies of underlying tables. Use get_phase_costs_secure() function for additional access control.';