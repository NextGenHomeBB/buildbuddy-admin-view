-- Fix task creation and assignment issues

-- 1. Add org_id to tasks table to support org-scoped RLS
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS org_id uuid;

-- 2. Create index for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_org_id ON public.tasks(org_id);

-- 3. Update existing tasks to have org_id from their projects
UPDATE public.tasks 
SET org_id = projects.org_id
FROM public.projects 
WHERE tasks.project_id = projects.id
AND tasks.org_id IS NULL;

-- 4. Fix the RLS policies for tasks to be more permissive for task creation
-- Drop the problematic INSERT policy
DROP POLICY IF EXISTS "Tasks: create access for authorized users" ON public.tasks;

-- Create a new, more permissive INSERT policy for tasks
CREATE POLICY "Tasks: create access for authorized users" 
ON public.tasks 
FOR INSERT 
WITH CHECK (
  -- Admins can create any task
  get_current_user_role() = 'admin' 
  OR 
  -- Organization members can create tasks for their org projects
  (
    org_id IS NOT NULL AND fn_is_member(org_id)
  )
  OR
  -- Users can create tasks for projects they have access to
  (
    project_id IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM user_project_role upr
      WHERE upr.user_id = auth.uid() 
      AND upr.project_id = tasks.project_id 
      AND upr.role IN ('manager', 'admin', 'worker')
    )
  )
  OR
  -- Users can create unassigned tasks (no project/org)
  (project_id IS NULL AND org_id IS NULL)
);

-- 5. Create trigger to auto-set org_id when creating tasks with project_id
CREATE OR REPLACE FUNCTION public.auto_set_task_org_id()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path TO 'public'
AS $$
BEGIN
  -- If project_id is set but org_id is not, get org_id from project
  IF NEW.project_id IS NOT NULL AND NEW.org_id IS NULL THEN
    SELECT p.org_id INTO NEW.org_id
    FROM public.projects p
    WHERE p.id = NEW.project_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS set_task_org_id_trigger ON public.tasks;
CREATE TRIGGER set_task_org_id_trigger
  BEFORE INSERT OR UPDATE ON public.tasks
  FOR EACH ROW 
  EXECUTE FUNCTION public.auto_set_task_org_id();

-- 6. Ensure the current user is properly assigned to the default organization
-- This fixes the authentication/organization access issue
DO $$
DECLARE
  default_org_uuid uuid;
  current_user_uuid uuid;
BEGIN
  -- Get default org from settings
  SELECT value::uuid INTO default_org_uuid 
  FROM public.app_settings 
  WHERE key = 'DEFAULT_ORG_ID';
  
  -- Get current user
  SELECT auth.uid() INTO current_user_uuid;
  
  -- If we have both, ensure user is member of default org
  IF default_org_uuid IS NOT NULL AND current_user_uuid IS NOT NULL THEN
    INSERT INTO public.organization_members (org_id, user_id, role, status)
    VALUES (default_org_uuid, current_user_uuid, 'admin', 'active')
    ON CONFLICT (org_id, user_id) DO UPDATE SET
      status = 'active',
      role = CASE 
        WHEN organization_members.role = 'owner' THEN 'owner'
        ELSE 'admin'
      END;
  END IF;
END
$$;