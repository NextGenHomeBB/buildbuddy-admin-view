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
WHERE get_current_user_role() = 'admin'
GROUP BY pp.id, pp.project_id, pp.name, pp.description, pp.status, 
         pp.start_date, pp.end_date, pp.progress, pp.created_at, 
         p.name, p.budget;

-- Grant access to authenticated users
GRANT SELECT ON public.project_phases_v TO authenticated;