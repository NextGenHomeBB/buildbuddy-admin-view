-- Drop everything with CASCADE to handle dependencies
DROP TRIGGER IF EXISTS update_project_workers_trigger ON public.user_project_role CASCADE;
DROP FUNCTION IF EXISTS public.update_project_assigned_workers() CASCADE;
DROP POLICY IF EXISTS "Users can read their assigned projects" ON public.projects;

-- Remove the assigned_workers JSONB field from projects table
ALTER TABLE public.projects DROP COLUMN IF EXISTS assigned_workers CASCADE;

-- Recreate the projects read policy using only user_project_role table
CREATE POLICY "Users can read their assigned projects" 
ON public.projects 
FOR SELECT 
USING (
  get_current_user_role() = 'admin' OR
  EXISTS (
    SELECT 1 FROM user_project_role upr
    WHERE upr.user_id = auth.uid() 
    AND upr.project_id = projects.id
  )
);

-- Improve task creation RLS policy to be more permissive
DROP POLICY IF EXISTS "Users can create tasks for accessible projects" ON public.tasks;

CREATE POLICY "Users can create tasks for accessible projects" 
ON public.tasks 
FOR INSERT 
WITH CHECK (
  get_current_user_role() = 'admin' OR
  EXISTS (
    SELECT 1 FROM user_project_role upr
    WHERE upr.user_id = auth.uid() 
    AND upr.project_id = tasks.project_id
    AND upr.role IN ('manager', 'admin')
  ) OR
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = tasks.project_id
    AND (p.manager_id = auth.uid() OR get_current_user_role() = 'admin')
  )
);