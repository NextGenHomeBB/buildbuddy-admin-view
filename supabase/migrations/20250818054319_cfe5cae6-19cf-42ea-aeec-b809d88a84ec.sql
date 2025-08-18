-- Fix worker assignment infinite recursion issue
-- Drop all existing RLS policies on user_project_role table to start clean

DROP POLICY IF EXISTS "Admins can manage all project roles" ON public.user_project_role;
DROP POLICY IF EXISTS "Project managers can manage project roles" ON public.user_project_role;
DROP POLICY IF EXISTS "Users can view project roles they have access to" ON public.user_project_role;
DROP POLICY IF EXISTS "Global admins can manage all project roles" ON public.user_project_role;
DROP POLICY IF EXISTS "Org admins can manage project roles in their org" ON public.user_project_role;
DROP POLICY IF EXISTS "Project managers can manage roles in their projects" ON public.user_project_role;
DROP POLICY IF EXISTS "Users can view roles in projects they belong to" ON public.user_project_role;
DROP POLICY IF EXISTS "admin_full_access_user_project_role" ON public.user_project_role;
DROP POLICY IF EXISTS "manager_project_access_user_project_role" ON public.user_project_role;
DROP POLICY IF EXISTS "worker_view_own_assignments" ON public.user_project_role;
DROP POLICY IF EXISTS "Admins can manage user project roles" ON public.user_project_role;
DROP POLICY IF EXISTS "Managers can manage roles for their projects" ON public.user_project_role;
DROP POLICY IF EXISTS "Workers can view their own project assignments" ON public.user_project_role;
DROP POLICY IF EXISTS "Global admin can manage all user project roles" ON public.user_project_role;
DROP POLICY IF EXISTS "Org members can view project roles in their org" ON public.user_project_role;
DROP POLICY IF EXISTS "Project managers can assign workers to their projects" ON public.user_project_role;
DROP POLICY IF EXISTS "Workers can view their project assignments" ON public.user_project_role;
DROP POLICY IF EXISTS "Admin access to user project roles" ON public.user_project_role;
DROP POLICY IF EXISTS "Manager access to user project roles" ON public.user_project_role;

-- Create simple, non-recursive RLS policies
CREATE POLICY "admin_can_manage_all_assignments" 
ON public.user_project_role 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
  )
);

CREATE POLICY "users_can_view_own_assignments" 
ON public.user_project_role 
FOR SELECT 
USING (user_id = auth.uid());

-- Create secure worker assignment function
CREATE OR REPLACE FUNCTION public.assign_worker_to_project(
  p_project_id UUID,
  p_user_id UUID,
  p_role TEXT DEFAULT 'worker'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_role TEXT;
  result JSONB;
BEGIN
  -- Get current user role securely
  SELECT role INTO current_user_role 
  FROM public.user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'::app_role
  LIMIT 1;
  
  -- Check if user has permission to assign workers
  IF current_user_role IS NULL THEN
    -- Check if user is org admin for this project
    IF NOT EXISTS (
      SELECT 1 FROM public.projects pr
      JOIN public.organization_members om ON pr.org_id = om.org_id
      WHERE pr.id = p_project_id 
      AND om.user_id = auth.uid() 
      AND om.role IN ('owner', 'admin')
      AND om.status = 'active'
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions to assign workers');
    END IF;
  END IF;
  
  -- Check if project exists
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = p_project_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Project not found');
  END IF;
  
  -- Check if user exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Insert or update assignment
  INSERT INTO public.user_project_role (user_id, project_id, role, assigned_by, assigned_at)
  VALUES (p_user_id, p_project_id, p_role, auth.uid(), NOW())
  ON CONFLICT (user_id, project_id) 
  DO UPDATE SET 
    role = EXCLUDED.role,
    assigned_by = EXCLUDED.assigned_by,
    assigned_at = EXCLUDED.assigned_at;
  
  -- Log the assignment
  INSERT INTO public.security_audit_log (
    user_id, action, table_name, record_id,
    new_values, ip_address
  ) VALUES (
    auth.uid(), 'WORKER_ASSIGNED_TO_PROJECT', 'user_project_role', p_project_id,
    jsonb_build_object(
      'assigned_user_id', p_user_id,
      'project_id', p_project_id,
      'role', p_role
    ),
    inet_client_addr()::text
  );
  
  RETURN jsonb_build_object('success', true, 'message', 'Worker assigned successfully');
END;
$$;

-- Create function to assign multiple workers
CREATE OR REPLACE FUNCTION public.assign_multiple_workers_to_project(
  p_project_id UUID,
  p_user_ids UUID[],
  p_role TEXT DEFAULT 'worker'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_id UUID;
  assignment_result JSONB;
  success_count INTEGER := 0;
  error_count INTEGER := 0;
  errors JSONB := '[]'::jsonb;
BEGIN
  -- Assign each worker
  FOREACH user_id IN ARRAY p_user_ids
  LOOP
    SELECT public.assign_worker_to_project(p_project_id, user_id, p_role) INTO assignment_result;
    
    IF (assignment_result->>'success')::boolean THEN
      success_count := success_count + 1;
    ELSE
      error_count := error_count + 1;
      errors := errors || jsonb_build_object('user_id', user_id, 'error', assignment_result->>'error');
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', error_count = 0,
    'assigned_count', success_count,
    'error_count', error_count,
    'errors', errors
  );
END;
$$;