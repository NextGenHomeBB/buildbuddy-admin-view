-- Create a security definer function to safely check user roles without RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_role_secure(p_user_id uuid DEFAULT auth.uid())
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET row_security = off
AS $function$
DECLARE
  user_role text;
BEGIN
  -- First check for global admin role
  SELECT role::text INTO user_role
  FROM user_roles 
  WHERE user_id = p_user_id AND role = 'admin'::app_role
  LIMIT 1;
  
  IF user_role IS NOT NULL THEN
    RETURN user_role;
  END IF;
  
  -- Then check organization roles (get highest role)
  SELECT role INTO user_role
  FROM organization_members 
  WHERE user_id = p_user_id 
    AND status = 'active' 
    AND (expires_at IS NULL OR expires_at > now())
  ORDER BY CASE role
    WHEN 'owner' THEN 1
    WHEN 'admin' THEN 2
    WHEN 'manager' THEN 3
    WHEN 'worker' THEN 4
    ELSE 5
  END
  LIMIT 1;
  
  RETURN COALESCE(user_role, 'worker');
END;
$function$;

-- Create a function to check if user can access project assignments
CREATE OR REPLACE FUNCTION public.can_access_project_assignments(p_project_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET row_security = off
AS $function$
DECLARE
  user_role text;
  project_org_id uuid;
  is_org_member boolean := false;
  is_project_member boolean := false;
BEGIN
  -- Get user role safely
  user_role := public.get_user_role_secure(p_user_id);
  
  -- Admins can access everything
  IF user_role = 'admin' THEN
    RETURN true;
  END IF;
  
  -- Get project organization
  SELECT org_id INTO project_org_id
  FROM projects 
  WHERE id = p_project_id;
  
  IF project_org_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user is admin/owner in project's organization
  SELECT EXISTS(
    SELECT 1 FROM organization_members 
    WHERE user_id = p_user_id 
      AND org_id = project_org_id
      AND role IN ('owner', 'admin')
      AND status = 'active'
      AND (expires_at IS NULL OR expires_at > now())
  ) INTO is_org_member;
  
  IF is_org_member THEN
    RETURN true;
  END IF;
  
  -- Check if user is assigned to the project
  SELECT EXISTS(
    SELECT 1 FROM user_project_role 
    WHERE user_id = p_user_id AND project_id = p_project_id
  ) INTO is_project_member;
  
  RETURN is_project_member;
END;
$function$;

-- Drop existing problematic policies on user_project_role
DROP POLICY IF EXISTS "admin_can_manage_all_assignments" ON user_project_role;
DROP POLICY IF EXISTS "project_managers_can_manage_assignments" ON user_project_role;
DROP POLICY IF EXISTS "users_can_view_own_assignments" ON user_project_role;

-- Create new safe RLS policies for user_project_role
CREATE POLICY "secure_admin_can_manage_all_assignments" 
ON user_project_role 
FOR ALL 
USING (public.get_user_role_secure() = 'admin')
WITH CHECK (public.get_user_role_secure() = 'admin');

CREATE POLICY "secure_project_access_assignments" 
ON user_project_role 
FOR ALL 
USING (public.can_access_project_assignments(project_id))
WITH CHECK (public.can_access_project_assignments(project_id));

CREATE POLICY "users_can_view_own_project_assignments" 
ON user_project_role 
FOR SELECT 
USING (user_id = auth.uid());

-- Update the existing get_current_user_role function to use the secure version
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.get_user_role_secure(auth.uid());
$function$;