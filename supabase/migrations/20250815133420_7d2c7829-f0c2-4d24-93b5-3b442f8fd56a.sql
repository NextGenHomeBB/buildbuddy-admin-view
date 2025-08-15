-- Remove the assigned_workers JSONB field from projects table
ALTER TABLE public.projects DROP COLUMN IF EXISTS assigned_workers;

-- Drop the trigger that was syncing assigned_workers
DROP TRIGGER IF EXISTS update_project_assigned_workers_trigger ON public.user_project_role;

-- Drop the function that was syncing assigned_workers
DROP FUNCTION IF EXISTS public.update_project_assigned_workers();

-- Improve task creation RLS policy to be more permissive
DROP POLICY IF EXISTS "Admins and managers can create tasks" ON public.tasks;

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

-- Update task assignment policy to allow assigning tasks to any project worker
DROP POLICY IF EXISTS "Users can update their own assigned tasks" ON public.tasks;

CREATE POLICY "Task assignment and updates" 
ON public.tasks 
FOR UPDATE 
USING (
  get_current_user_role() = 'admin' OR
  assignee = auth.uid() OR
  EXISTS (
    SELECT 1 FROM user_project_role upr
    WHERE upr.user_id = auth.uid() 
    AND upr.project_id = tasks.project_id
    AND upr.role IN ('manager', 'admin')
  )
)
WITH CHECK (
  get_current_user_role() = 'admin' OR
  assignee = auth.uid() OR
  EXISTS (
    SELECT 1 FROM user_project_role upr
    WHERE upr.user_id = auth.uid() 
    AND upr.project_id = tasks.project_id
    AND upr.role IN ('manager', 'admin')
  )
);