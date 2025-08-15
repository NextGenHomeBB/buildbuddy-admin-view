-- Create a secure function to assign workers to projects
-- This function uses SECURITY DEFINER to bypass RLS policies
CREATE OR REPLACE FUNCTION public.assign_workers_to_project(
  p_project_id uuid,
  p_worker_ids uuid[],
  p_admin_id uuid
)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  project_id uuid,
  role text,
  assigned_by uuid,
  assigned_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  worker_id uuid;
  result_record RECORD;
BEGIN
  -- Log the assignment attempt
  RAISE NOTICE 'Assigning % workers to project % by admin %', array_length(p_worker_ids, 1), p_project_id, p_admin_id;
  
  -- Validate inputs
  IF p_project_id IS NULL THEN
    RAISE EXCEPTION 'Project ID cannot be null';
  END IF;
  
  IF p_worker_ids IS NULL OR array_length(p_worker_ids, 1) = 0 THEN
    RAISE EXCEPTION 'Worker IDs cannot be null or empty';
  END IF;
  
  IF p_admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin ID cannot be null';
  END IF;
  
  -- Process each worker assignment
  FOREACH worker_id IN ARRAY p_worker_ids
  LOOP
    -- Insert or update the assignment
    INSERT INTO public.user_project_role (
      user_id,
      project_id,
      role,
      assigned_by,
      assigned_at
    ) VALUES (
      worker_id,
      p_project_id,
      'worker',
      p_admin_id,
      now()
    )
    ON CONFLICT (user_id, project_id) 
    DO UPDATE SET
      role = EXCLUDED.role,
      assigned_by = EXCLUDED.assigned_by,
      assigned_at = EXCLUDED.assigned_at;
  END LOOP;
  
  -- Return the assigned records
  RETURN QUERY
  SELECT 
    upr.id,
    upr.user_id,
    upr.project_id,
    upr.role,
    upr.assigned_by,
    upr.assigned_at
  FROM public.user_project_role upr
  WHERE upr.project_id = p_project_id 
    AND upr.user_id = ANY(p_worker_ids);
END;
$$;