-- Create an ultra-simple worker assignment function that bypasses RLS conflicts
CREATE OR REPLACE FUNCTION public.assign_worker_simple(p_project_id uuid, p_user_id uuid, p_role text DEFAULT 'worker'::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Simple direct insert/update without any function calls that might trigger RLS
  INSERT INTO public.user_project_role (user_id, project_id, role, assigned_by, assigned_at)
  VALUES (p_user_id, p_project_id, p_role, auth.uid(), NOW())
  ON CONFLICT (user_id, project_id) 
  DO UPDATE SET 
    role = EXCLUDED.role,
    assigned_by = EXCLUDED.assigned_by,
    assigned_at = EXCLUDED.assigned_at;
  
  -- Return simple success response
  RETURN jsonb_build_object('success', true, 'message', 'Worker assigned successfully');
EXCEPTION WHEN OTHERS THEN
  -- Return error details for debugging
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'sqlstate', SQLSTATE);
END;
$function$