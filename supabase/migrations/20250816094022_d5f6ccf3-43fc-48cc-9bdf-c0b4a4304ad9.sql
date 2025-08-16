-- Fix infinite recursion in projects RLS policies
-- Drop all existing problematic policies on projects table
DROP POLICY IF EXISTS "Admin full access to projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can read all projects" ON public.projects;
DROP POLICY IF EXISTS "Users can read their assigned projects" ON public.projects;

-- Create a simple, non-recursive security definer function for project access
CREATE OR REPLACE FUNCTION public.can_access_project(project_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  -- Check if user is global admin
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = $2 AND ur.role = 'admin'::app_role
  ) OR
  -- Check if user is assigned to project
  EXISTS (
    SELECT 1 FROM user_project_role upr
    WHERE upr.project_id = $1 AND upr.user_id = $2
  ) OR
  -- Check if user is org admin/owner for this project
  EXISTS (
    SELECT 1 FROM projects p
    JOIN organization_members om ON p.org_id = om.org_id
    WHERE p.id = $1 
    AND om.user_id = $2 
    AND om.role IN ('owner', 'admin')
    AND om.status = 'active'
    AND (om.expires_at IS NULL OR om.expires_at > now())
  );
$$;

-- Create simplified RLS policies using the security definer function
CREATE POLICY "Users can view accessible projects"
ON public.projects
FOR SELECT
TO authenticated
USING (public.can_access_project(id, auth.uid()));

CREATE POLICY "Global admins can manage all projects"
ON public.projects
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM user_roles ur
  WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
))
WITH CHECK (EXISTS (
  SELECT 1 FROM user_roles ur
  WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
));

CREATE POLICY "Org admins can manage org projects"
ON public.projects
FOR ALL
TO authenticated
USING (
  org_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.org_id = projects.org_id
    AND om.user_id = auth.uid()
    AND om.role IN ('owner', 'admin')
    AND om.status = 'active'
    AND (om.expires_at IS NULL OR om.expires_at > now())
  )
)
WITH CHECK (
  org_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.org_id = projects.org_id
    AND om.user_id = auth.uid()
    AND om.role IN ('owner', 'admin')
    AND om.status = 'active'
    AND (om.expires_at IS NULL OR om.expires_at > now())
  )
);