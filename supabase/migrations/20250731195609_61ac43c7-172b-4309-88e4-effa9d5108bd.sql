-- Fix remaining function search path issues
ALTER FUNCTION public.check_rate_limit(text, integer, integer) SET search_path = 'public';
ALTER FUNCTION public.complete_daily_task(uuid) SET search_path = 'public';
ALTER FUNCTION public.create_user_profile(uuid, text) SET search_path = 'public';
ALTER FUNCTION public.expire_old_daily_tasks() SET search_path = 'public';
ALTER FUNCTION public.get_current_user_role() SET search_path = 'public';
ALTER FUNCTION public.get_my_tasks() SET search_path = 'public';
ALTER FUNCTION public.setup_demo_data(uuid, uuid) SET search_path = 'public';
ALTER FUNCTION public.update_worker_availability_updated_at() SET search_path = 'public';
ALTER FUNCTION public.user_has_role(uuid, app_role) SET search_path = 'public';

-- Drop any remaining problematic views in worker schema
DROP VIEW IF EXISTS worker.task_map_v;
DROP VIEW IF EXISTS worker.task_lists_v;

-- Drop worker schema entirely since it's not needed
DROP SCHEMA IF EXISTS worker CASCADE;