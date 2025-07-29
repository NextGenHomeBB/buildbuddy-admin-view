-- Security hardening: Fix function search paths for confirmed existing functions

-- Fix function search paths for security compliance
ALTER FUNCTION public.audit_trigger_function() SET search_path = 'public';
ALTER FUNCTION public.auto_create_payment_from_shift() SET search_path = 'public';
ALTER FUNCTION public.update_timesheet_updated_at() SET search_path = 'public';
ALTER FUNCTION public.validate_role_assignment() SET search_path = 'public';
ALTER FUNCTION public.validate_task_assignment() SET search_path = 'public';
ALTER FUNCTION public.enhanced_audit_trigger() SET search_path = 'public';
ALTER FUNCTION public.get_my_tasks() SET search_path = 'public';
ALTER FUNCTION public.get_current_user_role() SET search_path = 'public';
ALTER FUNCTION public.user_has_role() SET search_path = 'public';
ALTER FUNCTION public.setup_demo_data() SET search_path = 'public';
ALTER FUNCTION public.create_user_profile() SET search_path = 'public';
ALTER FUNCTION public.update_updated_at_column() SET search_path = 'public';
ALTER FUNCTION public.update_phase_progress() SET search_path = 'public';
ALTER FUNCTION public.tasks_progress_trigger() SET search_path = 'public';
ALTER FUNCTION public.update_project_progress() SET search_path = 'public';
ALTER FUNCTION public.phase_progress_trigger() SET search_path = 'public';

-- Drop the problematic security definer view
DROP VIEW IF EXISTS worker.my_tasks_view;

-- Add essential performance indexes
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON public.tasks(assignee);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_user_project_role_user_id ON public.user_project_role(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);