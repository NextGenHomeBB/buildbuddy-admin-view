-- Fix infinite recursion by dropping existing function first
DROP FUNCTION IF EXISTS public.can_access_project(uuid, uuid);

-- Create a security definer function to check project access without recursion
CREATE OR REPLACE FUNCTION public.can_access_project(project_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
  -- Check if user is global admin
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = user_uuid AND role = 'admin'::public.app_role
  ) OR
  -- Check if user is org admin/owner for this project
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.organization_members om ON p.org_id = om.org_id
    WHERE p.id = project_uuid 
    AND om.user_id = user_uuid 
    AND om.role IN ('owner', 'admin')
    AND om.status = 'active'
  );
$$;

-- Fix infinite recursion in user_project_role RLS policies
DROP POLICY IF EXISTS "Users can access projects they are assigned to" ON user_project_role;
DROP POLICY IF EXISTS "Admins can manage all project assignments" ON user_project_role;
DROP POLICY IF EXISTS "Project managers can manage project assignments" ON user_project_role;

-- Create simple, non-recursive RLS policies for user_project_role
CREATE POLICY "Global admins manage all project roles"
ON public.user_project_role
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role
  )
);

CREATE POLICY "Users view own project assignments"
ON public.user_project_role
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Project access via can_access_project function"
ON public.user_project_role
FOR ALL
USING (public.can_access_project(project_id, auth.uid()))
WITH CHECK (public.can_access_project(project_id, auth.uid()));

-- Ensure RLS is enabled
ALTER TABLE public.user_project_role ENABLE ROW LEVEL SECURITY;