-- Create materialized view for project costs with auto-refresh
CREATE MATERIALIZED VIEW IF NOT EXISTS public.project_costs_vw AS
SELECT 
  p.id as project_id,
  p.name as project_name,
  p.budget,
  p.status as project_status,
  p.created_at as project_created_at,
  -- Labor costs from approved timesheets with worker rates
  COALESCE(labor_costs.total_labor_cost, 0) as labor_cost,
  COALESCE(labor_costs.total_hours, 0) as total_hours,
  -- Material costs from project materials
  COALESCE(material_costs.total_material_cost, 0) as material_cost,
  -- Expense costs from approved worker expenses
  COALESCE(expense_costs.total_expense_cost, 0) as expense_cost,
  -- Total committed costs
  (COALESCE(labor_costs.total_labor_cost, 0) + 
   COALESCE(material_costs.total_material_cost, 0) + 
   COALESCE(expense_costs.total_expense_cost, 0)) as total_committed,
  -- Variance calculation
  CASE 
    WHEN p.budget IS NOT NULL THEN 
      p.budget - (COALESCE(labor_costs.total_labor_cost, 0) + 
                   COALESCE(material_costs.total_material_cost, 0) + 
                   COALESCE(expense_costs.total_expense_cost, 0))
    ELSE NULL 
  END as variance,
  -- Forecast (for now same as committed, can be enhanced later)
  (COALESCE(labor_costs.total_labor_cost, 0) + 
   COALESCE(material_costs.total_material_cost, 0) + 
   COALESCE(expense_costs.total_expense_cost, 0)) as forecast,
  NOW() as last_updated
FROM public.projects p
LEFT JOIN (
  -- Labor costs calculation
  SELECT 
    ts.project_id,
    SUM(
      CASE 
        WHEN wr.payment_type = 'hourly' THEN 
          CASE 
            WHEN ts.hours > 8 THEN 
              (8 * wr.hourly_rate) + ((ts.hours - 8) * wr.hourly_rate * 1.5)
            ELSE 
              ts.hours * wr.hourly_rate
          END
        WHEN wr.payment_type = 'salary' THEN 
          wr.monthly_salary / 30
        ELSE 0
      END
    ) as total_labor_cost,
    SUM(ts.hours) as total_hours
  FROM public.time_sheets ts
  LEFT JOIN public.worker_rates wr ON wr.worker_id = ts.user_id 
    AND wr.effective_date <= ts.work_date 
    AND (wr.end_date IS NULL OR wr.end_date >= ts.work_date)
  WHERE ts.approval_status = 'approved'
  GROUP BY ts.project_id
) labor_costs ON labor_costs.project_id = p.id
LEFT JOIN (
  -- Material costs calculation
  SELECT 
    pm.project_id,
    SUM(COALESCE(pm.total_cost, pm.quantity * m.unit_cost, 0)) as total_material_cost
  FROM public.project_materials pm
  LEFT JOIN public.materials m ON m.id = pm.material_id
  GROUP BY pm.project_id
) material_costs ON material_costs.project_id = p.id
LEFT JOIN (
  -- Expense costs calculation
  SELECT 
    we.project_id,
    SUM(we.amount) as total_expense_cost
  FROM public.worker_expenses we
  WHERE we.status = 'approved'
  GROUP BY we.project_id
) expense_costs ON expense_costs.project_id = p.id;

-- Create unique index for faster queries
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_costs_vw_project_id ON public.project_costs_vw (project_id);

-- Enable RLS on the materialized view
ALTER MATERIALIZED VIEW public.project_costs_vw OWNER TO postgres;

-- Create RLS policy for the materialized view
DROP POLICY IF EXISTS "Project costs view access" ON public.project_costs_vw;
CREATE POLICY "Project costs view access" ON public.project_costs_vw
FOR SELECT USING (
  get_current_user_role() = 'admin' OR
  EXISTS (
    SELECT 1 FROM public.user_project_role upr
    WHERE upr.user_id = auth.uid() 
    AND upr.project_id = project_costs_vw.project_id
    AND upr.role IN ('manager', 'admin')
  )
);

-- Set up auto-refresh using pg_cron (every 10 minutes)
SELECT cron.schedule(
  'refresh-project-costs-view',
  '*/10 * * * *',
  'REFRESH MATERIALIZED VIEW CONCURRENTLY public.project_costs_vw;'
);

-- Enable realtime for cost-related tables
ALTER TABLE public.time_sheets REPLICA IDENTITY FULL;
ALTER TABLE public.worker_expenses REPLICA IDENTITY FULL;
ALTER TABLE public.project_materials REPLICA IDENTITY FULL;
ALTER TABLE public.worker_payments REPLICA IDENTITY FULL;