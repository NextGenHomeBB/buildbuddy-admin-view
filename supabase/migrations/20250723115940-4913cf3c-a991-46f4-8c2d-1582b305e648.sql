-- Create RLS-safe view for project phases
CREATE OR REPLACE VIEW public.project_phases_v AS
SELECT 
    pp.id,
    pp.project_id,
    pp.name,
    pp.description,
    pp.status,
    pp.start_date,
    pp.end_date,
    pp.progress,
    pp.created_at,
    p.name as project_name,
    p.budget as project_budget,
    COUNT(t.id) as total_tasks,
    COUNT(t.id) FILTER (WHERE t.status = 'done') as completed_tasks
FROM public.project_phases pp
LEFT JOIN public.projects p ON p.id = pp.project_id
LEFT JOIN public.tasks t ON t.phase_id = pp.id
GROUP BY pp.id, pp.project_id, pp.name, pp.description, pp.status, 
         pp.start_date, pp.end_date, pp.progress, pp.created_at, 
         p.name, p.budget;

-- Enable RLS on the view
ALTER VIEW public.project_phases_v SET (security_barrier = true);

-- Create RLS policy for the view
CREATE POLICY "Admin access to project phases view"
ON public.project_phases_v
FOR SELECT
USING (get_current_user_role() = 'admin');

-- Grant access to authenticated users
GRANT SELECT ON public.project_phases_v TO authenticated;