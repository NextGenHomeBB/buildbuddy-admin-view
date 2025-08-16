-- Fix RLS infinite recursion and project assignment issues

-- 1. Drop problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Users can view their assigned projects" ON user_project_role;
DROP POLICY IF EXISTS "Users can be assigned to projects by admins" ON user_project_role;
DROP POLICY IF EXISTS "Project managers can assign users to their projects" ON user_project_role;

-- 2. Create security definer function to check project assignment permissions
CREATE OR REPLACE FUNCTION public.can_assign_to_project(p_project_id uuid, p_assigner_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  assigner_role text;
  project_org_id uuid;
  assigner_org_role text;
BEGIN
  -- Get assigner's global role
  SELECT role::text INTO assigner_role
  FROM public.user_roles 
  WHERE user_id = p_assigner_id 
  LIMIT 1;
  
  -- Global admins can assign anyone to any project
  IF assigner_role = 'admin' THEN
    RETURN true;
  END IF;
  
  -- Get project's organization
  SELECT org_id INTO project_org_id
  FROM public.projects 
  WHERE id = p_project_id;
  
  -- If project has no org_id, only global admins can assign
  IF project_org_id IS NULL THEN
    RETURN assigner_role = 'admin';
  END IF;
  
  -- Check if assigner is org admin/owner for this project's org
  SELECT role INTO assigner_org_role
  FROM public.organization_members
  WHERE user_id = p_assigner_id 
    AND org_id = project_org_id
    AND status = 'active'
    AND (expires_at IS NULL OR expires_at > now());
  
  RETURN assigner_org_role IN ('owner', 'admin');
END;
$$;

-- 3. Create simplified RLS policies for user_project_role
CREATE POLICY "Users can view their own project assignments"
ON public.user_project_role
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins and org managers can view project assignments"
ON public.user_project_role
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  ) OR
  EXISTS (
    SELECT 1 
    FROM public.projects p
    JOIN public.organization_members om ON p.org_id = om.org_id
    WHERE p.id = user_project_role.project_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
      AND om.status = 'active'
      AND (om.expires_at IS NULL OR om.expires_at > now())
  )
);

CREATE POLICY "Authorized users can assign to projects"
ON public.user_project_role
FOR INSERT
WITH CHECK (can_assign_to_project(project_id, auth.uid()));

CREATE POLICY "Authorized users can update project assignments"
ON public.user_project_role
FOR UPDATE
USING (can_assign_to_project(project_id, auth.uid()))
WITH CHECK (can_assign_to_project(project_id, auth.uid()));

CREATE POLICY "Authorized users can remove project assignments"
ON public.user_project_role
FOR DELETE
USING (can_assign_to_project(project_id, auth.uid()));

-- 4. Update existing projects to have proper org_id
-- Set all projects without org_id to the default organization
UPDATE public.projects 
SET org_id = (
  SELECT value::uuid 
  FROM public.app_settings 
  WHERE key = 'DEFAULT_ORG_ID'
)
WHERE org_id IS NULL;

-- 5. Create helper function to check if user can access project
CREATE OR REPLACE FUNCTION public.can_access_project(p_project_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role text;
  project_org_id uuid;
BEGIN
  -- Get user's global role
  SELECT role::text INTO user_role
  FROM public.user_roles 
  WHERE user_id = p_user_id 
  LIMIT 1;
  
  -- Global admins can access any project
  IF user_role = 'admin' THEN
    RETURN true;
  END IF;
  
  -- Check if user is assigned to the project
  IF EXISTS (
    SELECT 1 FROM public.user_project_role
    WHERE user_id = p_user_id AND project_id = p_project_id
  ) THEN
    RETURN true;
  END IF;
  
  -- Check if user is org member for this project's organization
  SELECT org_id INTO project_org_id
  FROM public.projects 
  WHERE id = p_project_id;
  
  IF project_org_id IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE user_id = p_user_id 
        AND org_id = project_org_id
        AND status = 'active'
        AND (expires_at IS NULL OR expires_at > now())
    );
  END IF;
  
  RETURN false;
END;
$$;