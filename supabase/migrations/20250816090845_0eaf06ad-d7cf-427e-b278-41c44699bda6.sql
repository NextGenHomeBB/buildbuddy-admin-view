-- Fix column ambiguity in assign_workers_to_project function by renaming variable
DROP FUNCTION IF EXISTS public.assign_workers_to_project(uuid, uuid[], uuid);

CREATE OR REPLACE FUNCTION public.assign_workers_to_project(p_project_id uuid, p_worker_ids uuid[], p_admin_id uuid)
 RETURNS TABLE(assignment_id uuid, user_id uuid, project_id uuid, role text, assigned_by uuid, assigned_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
DECLARE
  current_worker_id uuid;
  inserted_count integer := 0;
BEGIN
  -- Comprehensive input validation
  IF p_project_id IS NULL THEN
    RAISE EXCEPTION 'Project ID cannot be null';
  END IF;
  
  IF p_worker_ids IS NULL OR array_length(p_worker_ids, 1) = 0 THEN
    RAISE EXCEPTION 'Worker IDs array cannot be null or empty';
  END IF;
  
  IF p_admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin ID cannot be null';
  END IF;
  
  -- Validate project exists
  IF NOT EXISTS (SELECT 1 FROM public.projects proj WHERE proj.id = p_project_id) THEN
    RAISE EXCEPTION 'Project with ID % does not exist', p_project_id;
  END IF;
  
  -- Validate all worker IDs exist in profiles
  FOR current_worker_id IN SELECT unnest(p_worker_ids)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM public.profiles prof WHERE prof.id = current_worker_id) THEN
      RAISE EXCEPTION 'Worker with ID % does not exist', current_worker_id;
    END IF;
  END LOOP;
  
  -- Process each worker assignment
  FOREACH current_worker_id IN ARRAY p_worker_ids
  LOOP
    INSERT INTO public.user_project_role (
      user_id,
      project_id,
      role,
      assigned_by,
      assigned_at
    ) VALUES (
      current_worker_id,
      p_project_id,
      'worker',
      p_admin_id,
      now()
    )
    ON CONFLICT ON CONSTRAINT user_project_role_user_id_project_id_key
    DO UPDATE SET
      role = EXCLUDED.role,
      assigned_by = EXCLUDED.assigned_by,
      assigned_at = EXCLUDED.assigned_at;
    
    inserted_count := inserted_count + 1;
  END LOOP;
  
  -- Return the assigned records
  RETURN QUERY
  SELECT 
    upr.id as assignment_id,
    upr.user_id,
    upr.project_id,
    upr.role,
    upr.assigned_by,
    upr.assigned_at
  FROM public.user_project_role upr
  WHERE upr.project_id = p_project_id 
    AND upr.user_id = ANY(p_worker_ids);
    
  RAISE NOTICE 'Successfully processed % worker assignments for project %', inserted_count, p_project_id;
END;
$function$;