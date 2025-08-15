-- Fix trigger conflict: Remove blocking trigger and keep sync trigger

-- A) Remove the conflicting trigger and function that blocks assigned_workers updates
DROP TRIGGER IF EXISTS trg_block_assigned_workers ON public.projects;
DROP FUNCTION IF EXISTS public.block_assigned_workers_json();

-- B) Ensure the sync trigger is working properly (recreate if needed)
CREATE OR REPLACE FUNCTION public.update_project_assigned_workers()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path TO 'public'
AS $$
DECLARE
  worker_ids uuid[];
  worker_ids_json jsonb;
  project_uuid uuid;
BEGIN
  -- Determine which project to update
  project_uuid := COALESCE(NEW.project_id, OLD.project_id);
  
  -- Skip if no project or if this is a system operation
  IF project_uuid IS NULL OR current_setting('app.skip_worker_sync', true) = 'true' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Get all active worker IDs for this project
  SELECT ARRAY_AGG(upr.user_id) INTO worker_ids
  FROM public.user_project_role upr
  WHERE upr.project_id = project_uuid
    AND upr.role = 'worker';
  
  -- Convert to JSONB properly
  IF worker_ids IS NULL THEN
    worker_ids_json := '[]'::jsonb;
  ELSE
    worker_ids_json := to_jsonb(worker_ids);
  END IF;
  
  -- Update the project's assigned_workers field (with sync prevention)
  PERFORM set_config('app.skip_worker_sync', 'true', true);
  
  UPDATE public.projects 
  SET assigned_workers = worker_ids_json
  WHERE id = project_uuid;
  
  PERFORM set_config('app.skip_worker_sync', 'false', true);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- C) Ensure trigger exists on user_project_role
DROP TRIGGER IF EXISTS update_project_workers_trigger ON public.user_project_role;
CREATE TRIGGER update_project_workers_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.user_project_role
  FOR EACH ROW EXECUTE FUNCTION public.update_project_assigned_workers();

-- D) Clean up any data inconsistencies
-- Sync all projects to ensure assigned_workers matches user_project_role
DO $$
DECLARE
  project_record RECORD;
  worker_ids uuid[];
  worker_ids_json jsonb;
BEGIN
  -- Set sync prevention to avoid trigger recursion
  PERFORM set_config('app.skip_worker_sync', 'true', true);
  
  FOR project_record IN SELECT id FROM public.projects LOOP
    -- Get all worker IDs for this project
    SELECT ARRAY_AGG(upr.user_id) INTO worker_ids
    FROM public.user_project_role upr
    WHERE upr.project_id = project_record.id
      AND upr.role = 'worker';
    
    -- Convert to JSONB
    IF worker_ids IS NULL THEN
      worker_ids_json := '[]'::jsonb;
    ELSE
      worker_ids_json := to_jsonb(worker_ids);
    END IF;
    
    -- Update the project
    UPDATE public.projects 
    SET assigned_workers = worker_ids_json
    WHERE id = project_record.id;
  END LOOP;
  
  -- Re-enable sync
  PERFORM set_config('app.skip_worker_sync', 'false', true);
END
$$;