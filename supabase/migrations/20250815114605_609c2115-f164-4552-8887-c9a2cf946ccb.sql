-- Fix data synchronization issue between user_project_role and projects.assigned_workers

-- First, sync the projects.assigned_workers with current user_project_role data
UPDATE public.projects 
SET assigned_workers = (
  SELECT COALESCE(jsonb_agg(upr.user_id), '[]'::jsonb)
  FROM public.user_project_role upr
  WHERE upr.project_id = projects.id 
  AND upr.role = 'worker'
);

-- Create an improved trigger function that prevents infinite loops
CREATE OR REPLACE FUNCTION public.sync_project_workers_v2()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  worker_ids uuid[];
  worker_ids_json jsonb;
  project_uuid uuid;
BEGIN
  -- Get the project ID from the operation
  project_uuid := COALESCE(NEW.project_id, OLD.project_id);
  
  -- Skip if no project or if we're in a sync operation
  IF project_uuid IS NULL OR current_setting('app.skip_worker_sync', true) = 'true' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Set sync flag to prevent recursion
  PERFORM set_config('app.skip_worker_sync', 'true', true);
  
  -- Get all worker IDs for this project
  SELECT ARRAY_AGG(upr.user_id) INTO worker_ids
  FROM public.user_project_role upr
  WHERE upr.project_id = project_uuid
    AND upr.role = 'worker';
  
  -- Convert to JSONB
  worker_ids_json := COALESCE(to_jsonb(worker_ids), '[]'::jsonb);
  
  -- Update the projects table
  UPDATE public.projects 
  SET assigned_workers = worker_ids_json
  WHERE id = project_uuid;
  
  -- Clear sync flag
  PERFORM set_config('app.skip_worker_sync', 'false', true);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Drop the old trigger if it exists
DROP TRIGGER IF EXISTS update_project_assigned_workers_trigger ON public.user_project_role;

-- Create the new trigger
CREATE TRIGGER sync_project_workers_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.user_project_role
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_project_workers_v2();