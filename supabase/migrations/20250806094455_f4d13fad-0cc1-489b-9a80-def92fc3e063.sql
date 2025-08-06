-- Add budget and updated_at columns to project_phases table
ALTER TABLE public.project_phases 
ADD COLUMN IF NOT EXISTS budget NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create phase_material_costs table for tracking material costs per phase
CREATE TABLE IF NOT EXISTS public.phase_material_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phase_id UUID NOT NULL,
  material_id UUID,
  material_name TEXT NOT NULL,
  material_sku TEXT,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'ordered', 'delivered', 'used')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Create phase_labor_costs table for tracking labor costs per phase
CREATE TABLE IF NOT EXISTS public.phase_labor_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phase_id UUID NOT NULL,
  worker_id UUID NOT NULL,
  hours_planned NUMERIC DEFAULT 0,
  hours_actual NUMERIC DEFAULT 0,
  hourly_rate NUMERIC NOT NULL DEFAULT 0,
  total_planned_cost NUMERIC NOT NULL DEFAULT 0,
  total_actual_cost NUMERIC NOT NULL DEFAULT 0,
  work_date DATE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create phase_expenses table for tracking other expenses per phase
CREATE TABLE IF NOT EXISTS public.phase_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phase_id UUID NOT NULL,
  expense_type TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_url TEXT,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable RLS on all new tables
ALTER TABLE public.phase_material_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phase_labor_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phase_expenses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for phase_material_costs
CREATE POLICY "Admins can manage all phase material costs"
ON public.phase_material_costs
FOR ALL
TO authenticated
USING (get_current_user_role() = 'admin');

CREATE POLICY "Project managers can manage phase material costs for their projects"
ON public.phase_material_costs
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.project_phases pp
    JOIN public.user_project_role upr ON pp.project_id = upr.project_id
    WHERE pp.id = phase_material_costs.phase_id
    AND upr.user_id = auth.uid()
    AND upr.role IN ('manager', 'admin')
  )
);

-- Create RLS policies for phase_labor_costs
CREATE POLICY "Admins can manage all phase labor costs"
ON public.phase_labor_costs
FOR ALL
TO authenticated
USING (get_current_user_role() = 'admin');

CREATE POLICY "Project managers can manage phase labor costs for their projects"
ON public.phase_labor_costs
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.project_phases pp
    JOIN public.user_project_role upr ON pp.project_id = upr.project_id
    WHERE pp.id = phase_labor_costs.phase_id
    AND upr.user_id = auth.uid()
    AND upr.role IN ('manager', 'admin')
  )
);

CREATE POLICY "Workers can view their own labor costs"
ON public.phase_labor_costs
FOR SELECT
TO authenticated
USING (worker_id = auth.uid());

-- Create RLS policies for phase_expenses
CREATE POLICY "Admins can manage all phase expenses"
ON public.phase_expenses
FOR ALL
TO authenticated
USING (get_current_user_role() = 'admin');

CREATE POLICY "Project managers can manage phase expenses for their projects"
ON public.phase_expenses
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.project_phases pp
    JOIN public.user_project_role upr ON pp.project_id = upr.project_id
    WHERE pp.id = phase_expenses.phase_id
    AND upr.user_id = auth.uid()
    AND upr.role IN ('manager', 'admin')
  )
);

-- Create comprehensive phase costs view
CREATE OR REPLACE VIEW public.phase_costs_vw AS
SELECT 
  pp.id as phase_id,
  pp.name as phase_name,
  pp.project_id,
  pp.budget,
  
  -- Material costs
  COALESCE(SUM(pmc.total_cost), 0) as material_cost,
  
  -- Labor costs (actual from timesheets + planned)
  COALESCE(SUM(plc.total_actual_cost), 0) as labor_cost_actual,
  COALESCE(SUM(plc.total_planned_cost), 0) as labor_cost_planned,
  
  -- Other expenses
  COALESCE(SUM(pe.amount), 0) as expense_cost,
  
  -- Total committed costs
  (COALESCE(SUM(pmc.total_cost), 0) + 
   COALESCE(SUM(plc.total_actual_cost), 0) + 
   COALESCE(SUM(pe.amount), 0)) as total_committed,
  
  -- Budget variance
  (pp.budget - (COALESCE(SUM(pmc.total_cost), 0) + 
                 COALESCE(SUM(plc.total_actual_cost), 0) + 
                 COALESCE(SUM(pe.amount), 0))) as variance,
  
  -- Forecast (planned labor + actual other costs)
  (COALESCE(SUM(pmc.total_cost), 0) + 
   COALESCE(SUM(plc.total_planned_cost), 0) + 
   COALESCE(SUM(pe.amount), 0)) as forecast,
  
  -- Last updated
  GREATEST(
    pp.updated_at,
    COALESCE(MAX(pmc.updated_at), pp.updated_at),
    COALESCE(MAX(plc.updated_at), pp.updated_at),
    COALESCE(MAX(pe.updated_at), pp.updated_at)
  ) as last_updated

FROM public.project_phases pp
LEFT JOIN public.phase_material_costs pmc ON pp.id = pmc.phase_id
LEFT JOIN public.phase_labor_costs plc ON pp.id = plc.phase_id  
LEFT JOIN public.phase_expenses pe ON pp.id = pe.phase_id
GROUP BY pp.id, pp.name, pp.project_id, pp.budget, pp.updated_at;

-- Add triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION public.update_phase_costs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for project_phases
CREATE TRIGGER update_project_phases_updated_at
  BEFORE UPDATE ON public.project_phases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_phase_costs_updated_at();

-- Triggers for cost tables
CREATE TRIGGER update_phase_material_costs_updated_at
  BEFORE UPDATE ON public.phase_material_costs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_phase_costs_updated_at();

CREATE TRIGGER update_phase_labor_costs_updated_at
  BEFORE UPDATE ON public.phase_labor_costs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_phase_costs_updated_at();

CREATE TRIGGER update_phase_expenses_updated_at
  BEFORE UPDATE ON public.phase_expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_phase_costs_updated_at();