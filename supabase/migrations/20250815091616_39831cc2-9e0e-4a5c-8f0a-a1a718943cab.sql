-- Fix task creation and worker assignment issues
-- Step 1: Update projects to have org_id from default organization
UPDATE public.projects 
SET org_id = (
  SELECT value::uuid 
  FROM public.app_settings 
  WHERE key = 'DEFAULT_ORG_ID' 
  LIMIT 1
)
WHERE org_id IS NULL;

-- Step 2: Update tasks to have org_id based on their project
UPDATE public.tasks 
SET org_id = p.org_id
FROM public.projects p
WHERE tasks.project_id = p.id 
AND tasks.org_id IS NULL;

-- Step 3: Create user_project_role entries for admin users on all projects
INSERT INTO public.user_project_role (user_id, project_id, role, org_id)
SELECT 
  ur.user_id,
  p.id as project_id,
  'admin' as role,
  p.org_id
FROM public.user_roles ur
CROSS JOIN public.projects p
WHERE ur.role = 'admin'
ON CONFLICT (user_id, project_id) DO NOTHING;

-- Step 4: Create user_project_role entries for organization members on all projects in their org
INSERT INTO public.user_project_role (user_id, project_id, role, org_id)
SELECT 
  om.user_id,
  p.id as project_id,
  CASE 
    WHEN om.role IN ('owner', 'admin') THEN 'admin'
    WHEN om.role = 'manager' THEN 'manager' 
    ELSE 'worker'
  END as role,
  p.org_id
FROM public.organization_members om
CROSS JOIN public.projects p
WHERE om.org_id = p.org_id 
AND om.status = 'active'
AND (om.expires_at IS NULL OR om.expires_at > now())
ON CONFLICT (user_id, project_id) DO NOTHING;

-- Step 5: Update tasks table to automatically set org_id from project
CREATE OR REPLACE FUNCTION public.set_task_org_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Set org_id from the project if not already set
  IF NEW.org_id IS NULL AND NEW.project_id IS NOT NULL THEN
    SELECT org_id INTO NEW.org_id 
    FROM public.projects 
    WHERE id = NEW.project_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists and create new one
DROP TRIGGER IF EXISTS trigger_set_task_org_id ON public.tasks;
CREATE TRIGGER trigger_set_task_org_id
  BEFORE INSERT OR UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_task_org_id();

-- Step 6: Verify assignment permissions for tasks - allow users to assign tasks to workers with project access
CREATE OR REPLACE FUNCTION public.check_task_assignee()
RETURNS TRIGGER AS $$
BEGIN
  -- Skip check if no assignee
  IF NEW.assignee IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Skip check for admin users
  IF EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RETURN NEW;
  END IF;
  
  -- Check if assignee has access to the project
  IF NEW.project_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.user_project_role upr
    WHERE upr.user_id = NEW.assignee 
    AND upr.project_id = NEW.project_id
  ) THEN
    RAISE EXCEPTION 'Cannot assign task to user without project access';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists and create new one
DROP TRIGGER IF EXISTS trigger_check_task_assignee ON public.tasks;
CREATE TRIGGER trigger_check_task_assignee
  BEFORE INSERT OR UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.check_task_assignee();