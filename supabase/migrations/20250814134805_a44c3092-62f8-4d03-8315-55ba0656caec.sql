-- Secure the phase_costs_vw view with Row Level Security
-- This addresses the critical security finding about financial data exposure

-- Enable RLS on the phase_costs_vw view
ALTER TABLE public.phase_costs_vw ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to access all phase costs
CREATE POLICY "Admins can view all phase costs" 
ON public.phase_costs_vw 
FOR SELECT 
USING (public.get_current_user_role() = 'admin');

-- Create policy for project managers to access only their project phase costs
CREATE POLICY "Project managers can view their project phase costs" 
ON public.phase_costs_vw 
FOR SELECT 
USING (
  public.get_current_user_role() = 'manager' 
  AND EXISTS (
    SELECT 1 FROM public.user_project_role upr
    WHERE upr.user_id = auth.uid() 
    AND upr.project_id = phase_costs_vw.project_id
    AND upr.role IN ('manager', 'admin')
  )
);

-- Create policy for workers to view phase costs for projects they're assigned to (read-only)
CREATE POLICY "Workers can view phase costs for assigned projects" 
ON public.phase_costs_vw 
FOR SELECT 
USING (
  public.get_current_user_role() = 'worker' 
  AND EXISTS (
    SELECT 1 FROM public.user_project_role upr
    WHERE upr.user_id = auth.uid() 
    AND upr.project_id = phase_costs_vw.project_id
  )
);

-- Log this security enhancement
INSERT INTO public.security_audit_log (
  user_id, action, table_name, 
  new_values, ip_address
) VALUES (
  NULL, -- System action
  'RLS_POLICY_ADDED_FOR_FINANCIAL_DATA', 
  'phase_costs_vw',
  jsonb_build_object(
    'security_enhancement', 'Added RLS policies to phase_costs_vw',
    'policies_created', 3,
    'access_levels', ARRAY['admin_full', 'manager_project_scoped', 'worker_read_only'],
    'issue_resolved', 'Database View Exposes Financial Data Without Protection'
  ),
  NULL
);