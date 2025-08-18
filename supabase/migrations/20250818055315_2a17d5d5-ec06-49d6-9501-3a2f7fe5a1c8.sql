-- Enhanced RPC functions with organization scoping and comprehensive logging

-- First, update the assign_worker_to_project function to handle organizations better
CREATE OR REPLACE FUNCTION public.assign_worker_to_project(p_project_id uuid, p_user_id uuid, p_role text DEFAULT 'worker'::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_role TEXT;
  current_user_org_id UUID;
  project_org_id UUID;
  target_user_exists BOOLEAN;
  project_exists BOOLEAN;
  result JSONB;
BEGIN
  -- Comprehensive logging start
  RAISE NOTICE 'assign_worker_to_project called: project_id=%, user_id=%, role=%, requesting_user=%', 
    p_project_id, p_user_id, p_role, auth.uid();
  
  -- Get current user role securely - check both global and org roles
  SELECT role INTO current_user_role 
  FROM public.user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'::app_role
  LIMIT 1;
  
  RAISE NOTICE 'Global admin check result: %', current_user_role;
  
  -- Get project organization and check if it exists
  SELECT org_id INTO project_org_id FROM public.projects WHERE id = p_project_id;
  
  IF project_org_id IS NULL THEN
    RAISE NOTICE 'Project not found: %', p_project_id;
    RETURN jsonb_build_object('success', false, 'error', 'Project not found');
  END IF;
  
  RAISE NOTICE 'Project org_id: %', project_org_id;
  
  -- Get current user's organization role for this project's org
  SELECT om.org_id INTO current_user_org_id
  FROM public.organization_members om
  WHERE om.user_id = auth.uid() 
    AND om.org_id = project_org_id
    AND om.role IN ('owner', 'admin') 
    AND om.status = 'active'
  LIMIT 1;
  
  RAISE NOTICE 'User org membership check: user=%, org=%, result=%', 
    auth.uid(), project_org_id, current_user_org_id IS NOT NULL;
  
  -- Check if user has permission to assign workers
  IF current_user_role IS NULL AND current_user_org_id IS NULL THEN
    RAISE NOTICE 'Permission denied: user % is not admin globally or in org %', auth.uid(), project_org_id;
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions to assign workers. Admin or organization owner role required.');
  END IF;
  
  -- Verify target user exists
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = p_user_id) INTO target_user_exists;
  
  IF NOT target_user_exists THEN
    RAISE NOTICE 'Target user not found: %', p_user_id;
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Ensure target user is a member of the same organization
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = p_user_id 
      AND om.org_id = project_org_id 
      AND om.status = 'active'
  ) THEN
    RAISE NOTICE 'Target user % is not a member of organization %', p_user_id, project_org_id;
    RETURN jsonb_build_object('success', false, 'error', 'User is not a member of the project organization');
  END IF;
  
  -- Insert or update assignment
  INSERT INTO public.user_project_role (user_id, project_id, role, assigned_by, assigned_at)
  VALUES (p_user_id, p_project_id, p_role, auth.uid(), NOW())
  ON CONFLICT (user_id, project_id) 
  DO UPDATE SET 
    role = EXCLUDED.role,
    assigned_by = EXCLUDED.assigned_by,
    assigned_at = EXCLUDED.assigned_at;
  
  RAISE NOTICE 'Assignment successful: user=%, project=%, role=%', p_user_id, p_project_id, p_role;
  
  -- Log the assignment in audit trail
  INSERT INTO public.security_audit_log (
    user_id, action, table_name, record_id,
    new_values, ip_address
  ) VALUES (
    auth.uid(), 'WORKER_ASSIGNED_TO_PROJECT', 'user_project_role', p_project_id,
    jsonb_build_object(
      'assigned_user_id', p_user_id,
      'project_id', p_project_id,
      'role', p_role,
      'org_id', project_org_id
    ),
    inet_client_addr()::text
  );
  
  RETURN jsonb_build_object('success', true, 'message', 'Worker assigned successfully');
END;
$function$;

-- Update assign_multiple_workers_to_project to use the enhanced single assignment function
CREATE OR REPLACE FUNCTION public.assign_multiple_workers_to_project(p_project_id uuid, p_user_ids uuid[], p_role text DEFAULT 'worker'::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_id UUID;
  assignment_result JSONB;
  success_count INTEGER := 0;
  error_count INTEGER := 0;
  errors JSONB := '[]'::jsonb;
BEGIN
  RAISE NOTICE 'assign_multiple_workers_to_project called: project_id=%, user_count=%, role=%', 
    p_project_id, array_length(p_user_ids, 1), p_role;
    
  -- Assign each worker using the enhanced single assignment function
  FOREACH user_id IN ARRAY p_user_ids
  LOOP
    SELECT public.assign_worker_to_project(p_project_id, user_id, p_role) INTO assignment_result;
    
    IF (assignment_result->>'success')::boolean THEN
      success_count := success_count + 1;
      RAISE NOTICE 'Successfully assigned user %', user_id;
    ELSE
      error_count := error_count + 1;
      errors := errors || jsonb_build_object('user_id', user_id, 'error', assignment_result->>'error');
      RAISE NOTICE 'Failed to assign user %: %', user_id, assignment_result->>'error';
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Batch assignment completed: success=%, errors=%', success_count, error_count;
  
  RETURN jsonb_build_object(
    'success', error_count = 0,
    'assigned_count', success_count,
    'error_count', error_count,
    'errors', errors
  );
END;
$function$;