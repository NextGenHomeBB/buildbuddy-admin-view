-- Fix infinite recursion in user_project_role RLS policies
-- First drop all existing policies that might cause recursion
DROP POLICY IF EXISTS "Users can view their own project assignments" ON public.user_project_role;
DROP POLICY IF EXISTS "Users can manage their own project assignments" ON public.user_project_role;
DROP POLICY IF EXISTS "Admins can manage all project assignments" ON public.user_project_role;
DROP POLICY IF EXISTS "Project managers can manage assignments" ON public.user_project_role;
DROP POLICY IF EXISTS "Global admins can manage all assignments" ON public.user_project_role;
DROP POLICY IF EXISTS "Org admins can manage assignments" ON public.user_project_role;

-- Create a security definer function to check if user can access project assignments
CREATE OR REPLACE FUNCTION public.can_access_project_assignments(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- Check if user is admin or has project access
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.id = p_project_id 
    AND (
      p.manager_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.org_id = p.org_id 
        AND om.user_id = auth.uid() 
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
        AND (om.expires_at IS NULL OR om.expires_at > now())
      )
    )
  );
$$;

-- Create safe RLS policies using the security definer function
CREATE POLICY "Admins can manage all user project roles"
ON public.user_project_role
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

CREATE POLICY "Users can view their own assignments"
ON public.user_project_role
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Project access for assignments"
ON public.user_project_role
FOR ALL
USING (can_access_project_assignments(project_id))
WITH CHECK (can_access_project_assignments(project_id));

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.can_access_project_assignments(uuid) TO authenticated;