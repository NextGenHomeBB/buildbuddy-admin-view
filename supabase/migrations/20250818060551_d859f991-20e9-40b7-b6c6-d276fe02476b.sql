-- Fix infinite recursion in worker assignment RPC functions
-- Replace with simplified functions that avoid RLS policy recursion

-- Create simplified assign_worker_to_project function that bypasses problematic RLS
CREATE OR REPLACE FUNCTION public.assign_worker_to_project_simple(p_project_id uuid, p_user_id uuid, p_role text DEFAULT 'worker'::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  project_org_id UUID;
  current_user_is_admin BOOLEAN := false;
  current_user_is_org_admin BOOLEAN := false;
  target_user_in_org BOOLEAN := false;
  project_exists BOOLEAN := false;
  target_user_exists BOOLEAN := false;
BEGIN
  -- Log function start
  RAISE NOTICE 'assign_worker_to_project_simple called: project_id=%, user_id=%, role=%, requesting_user=%', 
    p_project_id, p_user_id, p_role, auth.uid();
  
  -- Check if requesting user is global admin (direct query to avoid RLS)
  SELECT EXISTS(
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  ) INTO current_user_is_admin;
  
  RAISE NOTICE 'Global admin check: %', current_user_is_admin;
  
  -- Get project organization (direct query)
  SELECT org_id INTO project_org_id 
  FROM public.projects 
  WHERE id = p_project_id;
  
  IF project_org_id IS NULL THEN
    RAISE NOTICE 'Project not found: %', p_project_id;
    RETURN jsonb_build_object('success', false, 'error', 'Project not found');
  END IF;
  
  RAISE NOTICE 'Project org_id: %', project_org_id;
  
  -- Check if requesting user is admin/owner in the project's organization (direct query)
  SELECT EXISTS(
    SELECT 1 FROM public.organization_members 
    WHERE user_id = auth.uid() 
      AND org_id = project_org_id
      AND role IN ('owner', 'admin') 
      AND status = 'active'
  ) INTO current_user_is_org_admin;
  
  RAISE NOTICE 'Org admin check: %', current_user_is_org_admin;
  
  -- Check permissions
  IF NOT current_user_is_admin AND NOT current_user_is_org_admin THEN
    RAISE NOTICE 'Permission denied: user % is not admin', auth.uid();
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions to assign workers. Admin or organization owner role required.');
  END IF;
  
  -- Check if target user exists (direct query)
  SELECT EXISTS(
    SELECT 1 FROM public.profiles WHERE id = p_user_id
  ) INTO target_user_exists;
  
  IF NOT target_user_exists THEN
    RAISE NOTICE 'Target user not found: %', p_user_id;
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Check if target user is member of the organization (direct query)
  SELECT EXISTS(
    SELECT 1 FROM public.organization_members 
    WHERE user_id = p_user_id 
      AND org_id = project_org_id 
      AND status = 'active'
  ) INTO target_user_in_org;
  
  IF NOT target_user_in_org THEN
    RAISE NOTICE 'Target user % is not in organization %', p_user_id, project_org_id;
    RETURN jsonb_build_object('success', false, 'error', 'User is not a member of the project organization');
  END IF;
  
  -- Insert or update assignment (this should work with RLS since we're using SECURITY DEFINER)
  INSERT INTO public.user_project_role (user_id, project_id, role, assigned_by, assigned_at)
  VALUES (p_user_id, p_project_id, p_role, auth.uid(), NOW())
  ON CONFLICT (user_id, project_id) 
  DO UPDATE SET 
    role = EXCLUDED.role,
    assigned_by = EXCLUDED.assigned_by,
    assigned_at = EXCLUDED.assigned_at;
  
  RAISE NOTICE 'Assignment successful: user=%, project=%, role=%', p_user_id, p_project_id, p_role;
  
  -- Log the assignment (direct insert to avoid potential RLS issues)
  BEGIN
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
      COALESCE(inet_client_addr()::text, 'unknown')
    );
  EXCEPTION WHEN OTHERS THEN
    -- If audit logging fails, continue with the assignment
    RAISE NOTICE 'Audit logging failed but assignment succeeded: %', SQLERRM;
  END;
  
  RETURN jsonb_build_object('success', true, 'message', 'Worker assigned successfully');
END;
$function$;

-- Create simplified batch assignment function
CREATE OR REPLACE FUNCTION public.assign_multiple_workers_to_project_simple(p_project_id uuid, p_user_ids uuid[], p_role text DEFAULT 'worker'::text)
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
  RAISE NOTICE 'assign_multiple_workers_to_project_simple called: project_id=%, user_count=%, role=%', 
    p_project_id, array_length(p_user_ids, 1), p_role;
    
  -- Assign each worker using the simplified single assignment function
  FOREACH user_id IN ARRAY p_user_ids
  LOOP
    SELECT public.assign_worker_to_project_simple(p_project_id, user_id, p_role) INTO assignment_result;
    
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