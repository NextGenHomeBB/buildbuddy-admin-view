-- Fix remaining trigger functions without search_path
ALTER FUNCTION public.update_worker_availability_updated_at() SET search_path = 'public';
ALTER FUNCTION public.update_timesheet_updated_at() SET search_path = 'public';

-- Fix any remaining trigger functions
ALTER FUNCTION public.tasks_progress_trigger() SET search_path = 'public';
ALTER FUNCTION public.phase_progress_trigger() SET search_path = 'public';