-- Fix RLS infinite recursion and project assignment issues (final)

-- 1. Drop ALL existing policies on user_project_role table
DROP POLICY IF EXISTS "Users can view their own project assignments" ON user_project_role;
DROP POLICY IF EXISTS "Admins and org managers can view project assignments" ON user_project_role;
DROP POLICY IF EXISTS "Authorized users can assign to projects" ON user_project_role;
DROP POLICY IF EXISTS "Authorized users can update project assignments" ON user_project_role;
DROP POLICY IF EXISTS "Authorized users can remove project assignments" ON user_project_role;
DROP POLICY IF EXISTS "Admins can view all project assignments" ON user_project_role;
DROP POLICY IF EXISTS "Workers can view their own assignments" ON user_project_role;
DROP POLICY IF EXISTS "Managers can view assignments for their projects" ON user_project_role;

-- 2. Create new simplified RLS policies for user_project_role
CREATE POLICY "users_can_view_own_assignments"
ON public.user_project_role
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "admins_and_org_managers_can_view_assignments"
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

CREATE POLICY "authorized_users_can_assign_to_projects"
ON public.user_project_role
FOR INSERT
WITH CHECK (can_assign_to_project(project_id, auth.uid()));

CREATE POLICY "authorized_users_can_update_assignments"
ON public.user_project_role
FOR UPDATE
USING (can_assign_to_project(project_id, auth.uid()))
WITH CHECK (can_assign_to_project(project_id, auth.uid()));

CREATE POLICY "authorized_users_can_remove_assignments"
ON public.user_project_role
FOR DELETE
USING (can_assign_to_project(project_id, auth.uid()));