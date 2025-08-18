-- Create a new worker assignment function that completely bypasses RLS
CREATE OR REPLACE FUNCTION public.assign_worker_bypass_rls(p_project_id uuid, p_user_id uuid, p_role text DEFAULT 'worker'::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET row_security = off
AS $function$
DECLARE
  current_user_id uuid;
  is_admin boolean := false;
  project_org_id uuid;
  user_in_org boolean := false;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not authenticated');
  END IF;
  
  -- Check if user is global admin (bypass RLS by setting row_security = off)
  SELECT EXISTS(
    SELECT 1 FROM user_roles 
    WHERE user_id = current_user_id AND role = 'admin'::app_role
  ) INTO is_admin;
  
  -- Get project organization (bypass RLS)
  SELECT org_id INTO project_org_id 
  FROM projects 
  WHERE id = p_project_id;
  
  IF project_org_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Project not found');
  END IF;
  
  -- Check if current user is admin/owner in project org (bypass RLS)
  IF NOT is_admin THEN
    SELECT EXISTS(
      SELECT 1 FROM organization_members 
      WHERE user_id = current_user_id 
        AND org_id = project_org_id
        AND role IN ('owner', 'admin') 
        AND status = 'active'
    ) INTO is_admin;
    
    IF NOT is_admin THEN
      RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions');
    END IF;
  END IF;
  
  -- Check if target user is in the organization (bypass RLS)
  SELECT EXISTS(
    SELECT 1 FROM organization_members 
    WHERE user_id = p_user_id 
      AND org_id = project_org_id 
      AND status = 'active'
  ) INTO user_in_org;
  
  IF NOT user_in_org THEN
    RETURN jsonb_build_object('success', false, 'error', 'User is not a member of the project organization');
  END IF;
  
  -- Direct insert/update with RLS disabled
  INSERT INTO user_project_role (user_id, project_id, role, assigned_by, assigned_at)
  VALUES (p_user_id, p_project_id, p_role, current_user_id, NOW())
  ON CONFLICT (user_id, project_id) 
  DO UPDATE SET 
    role = EXCLUDED.role,
    assigned_by = EXCLUDED.assigned_by,
    assigned_at = EXCLUDED.assigned_at;
  
  RETURN jsonb_build_object('success', true, 'message', 'Worker assigned successfully');
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'sqlstate', SQLSTATE);
END;
$function$;