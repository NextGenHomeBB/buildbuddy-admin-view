-- Fix RLS policies on user_project_role table to prevent infinite recursion
-- Drop existing policies that might cause recursion
DROP POLICY IF EXISTS "Users can view their project assignments" ON public.user_project_role;
DROP POLICY IF EXISTS "Admin only access to user_project_role" ON public.user_project_role;
DROP POLICY IF EXISTS "Admins can manage user project roles" ON public.user_project_role;

-- Create simple, non-recursive policies for user_project_role
CREATE POLICY "user_project_role_select_policy"
ON public.user_project_role
FOR SELECT
TO authenticated
USING (
  -- Global admins can see all
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
  ) OR
  -- Users can see their own assignments
  user_id = auth.uid() OR
  -- Project managers can see assignments for their projects
  EXISTS (
    SELECT 1 FROM user_project_role upr2
    WHERE upr2.project_id = user_project_role.project_id
    AND upr2.user_id = auth.uid()
    AND upr2.role IN ('manager', 'admin')
  )
);

CREATE POLICY "user_project_role_insert_policy"
ON public.user_project_role
FOR INSERT
TO authenticated
WITH CHECK (
  -- Global admins can assign anyone
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
  ) OR
  -- Project managers can assign to their projects
  EXISTS (
    SELECT 1 FROM user_project_role upr
    WHERE upr.project_id = user_project_role.project_id
    AND upr.user_id = auth.uid()
    AND upr.role IN ('manager', 'admin')
  )
);

CREATE POLICY "user_project_role_update_policy"
ON public.user_project_role
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
  ) OR
  EXISTS (
    SELECT 1 FROM user_project_role upr
    WHERE upr.project_id = user_project_role.project_id
    AND upr.user_id = auth.uid()
    AND upr.role IN ('manager', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
  ) OR
  EXISTS (
    SELECT 1 FROM user_project_role upr
    WHERE upr.project_id = user_project_role.project_id
    AND upr.user_id = auth.uid()
    AND upr.role IN ('manager', 'admin')
  )
);

CREATE POLICY "user_project_role_delete_policy"
ON public.user_project_role
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
  ) OR
  EXISTS (
    SELECT 1 FROM user_project_role upr
    WHERE upr.project_id = user_project_role.project_id
    AND upr.user_id = auth.uid()
    AND upr.role IN ('manager', 'admin')
  )
);