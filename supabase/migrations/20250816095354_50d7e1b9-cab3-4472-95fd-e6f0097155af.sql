-- Step 1: Complete Policy Cleanup - Drop ALL existing policies on user_project_role
DROP POLICY IF EXISTS "Users can view their own project assignments" ON public.user_project_role;
DROP POLICY IF EXISTS "Users can manage their own project assignments" ON public.user_project_role;
DROP POLICY IF EXISTS "Admins can manage all project assignments" ON public.user_project_role;
DROP POLICY IF EXISTS "Project managers can manage assignments" ON public.user_project_role;
DROP POLICY IF EXISTS "Global admins can manage all assignments" ON public.user_project_role;
DROP POLICY IF EXISTS "Org admins can manage assignments" ON public.user_project_role;
DROP POLICY IF EXISTS "Admins can manage all user project roles" ON public.user_project_role;
DROP POLICY IF EXISTS "Users can view their own assignments" ON public.user_project_role;
DROP POLICY IF EXISTS "Project access for assignments" ON public.user_project_role;

-- Step 2: Create Proper Security Definer Functions
CREATE OR REPLACE FUNCTION public.user_is_global_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.user_has_project_role(p_project_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.id = p_project_id 
    AND (
      p.manager_id = p_user_id OR
      EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.org_id = p.org_id 
        AND om.user_id = p_user_id 
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
        AND (om.expires_at IS NULL OR om.expires_at > now())
      )
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.user_can_manage_project_assignments(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.user_is_global_admin() OR public.user_has_project_role(p_project_id);
$$;

-- Step 3: Implement Clean, Simple RLS Policies
CREATE POLICY "Global admins can manage all assignments"
ON public.user_project_role
FOR ALL
USING (public.user_is_global_admin())
WITH CHECK (public.user_is_global_admin());

CREATE POLICY "Users can view their own assignments"
ON public.user_project_role
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Project managers can manage assignments"
ON public.user_project_role
FOR ALL
USING (public.user_can_manage_project_assignments(project_id))
WITH CHECK (public.user_can_manage_project_assignments(project_id));

-- Step 4: Grant Proper Permissions
GRANT EXECUTE ON FUNCTION public.user_is_global_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_project_role(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_manage_project_assignments(uuid) TO authenticated;

-- Clean up the old function that's no longer needed
DROP FUNCTION IF EXISTS public.can_access_project_assignments(uuid);