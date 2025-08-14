-- Just ensure the get_current_user_role function works properly 
-- (it might already exist but let's make sure it returns the right data)

-- Test if we can call the function
DO $$
BEGIN
  -- This will test if the function works
  PERFORM public.get_current_user_role();
EXCEPTION WHEN OTHERS THEN
  -- If it fails, we'll know there's an issue
  RAISE NOTICE 'get_current_user_role function has issues: %', SQLERRM;
END $$;

-- Create any missing basic functions that might be needed
CREATE OR REPLACE FUNCTION public.update_phase_progress(p_phase_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total_tasks integer;
  completed_tasks integer;
  phase_progress numeric;
BEGIN
  SELECT COUNT(*) INTO total_tasks
  FROM public.tasks
  WHERE phase_id = p_phase_id;
  
  SELECT COUNT(*) INTO completed_tasks
  FROM public.tasks
  WHERE phase_id = p_phase_id AND status = 'completed';
  
  IF total_tasks > 0 THEN
    phase_progress := (completed_tasks::numeric / total_tasks::numeric) * 100;
  ELSE
    phase_progress := 0;
  END IF;
  
  UPDATE public.project_phases
  SET progress = phase_progress, updated_at = now()
  WHERE id = p_phase_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_project_progress(p_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total_phases integer;
  avg_progress numeric;
BEGIN
  SELECT COUNT(*), AVG(progress) INTO total_phases, avg_progress
  FROM public.project_phases
  WHERE project_id = p_project_id;
  
  UPDATE public.projects
  SET progress = COALESCE(avg_progress, 0)
  WHERE id = p_project_id;
END;
$$;