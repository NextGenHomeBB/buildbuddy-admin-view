-- Security hardening: Fix function search paths for existing functions only

-- Fix function search paths for security compliance (only for existing functions)
ALTER FUNCTION public.audit_trigger_function() SET search_path = 'public';
ALTER FUNCTION public.auto_create_payment_from_shift() SET search_path = 'public';
ALTER FUNCTION public.update_timesheet_updated_at() SET search_path = 'public';
ALTER FUNCTION public.validate_role_assignment() SET search_path = 'public';
ALTER FUNCTION public.validate_task_assignment() SET search_path = 'public';
ALTER FUNCTION public.enhanced_audit_trigger() SET search_path = 'public';
ALTER FUNCTION public.get_my_tasks() SET search_path = 'public';
ALTER FUNCTION public.expire_old_daily_tasks() SET search_path = 'public';
ALTER FUNCTION public.complete_daily_task() SET search_path = 'public';
ALTER FUNCTION public.get_current_user_role() SET search_path = 'public';
ALTER FUNCTION public.user_has_role() SET search_path = 'public';
ALTER FUNCTION public.setup_demo_data() SET search_path = 'public';
ALTER FUNCTION public.create_user_profile() SET search_path = 'public';

-- Drop the problematic security definer view
DROP VIEW IF EXISTS worker.my_tasks_view;

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON public.tasks(assignee);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_phase_id ON public.tasks(phase_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_user_project_role_user_id ON public.user_project_role(user_id);
CREATE INDEX IF NOT EXISTS idx_user_project_role_project_id ON public.user_project_role(project_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON public.profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_project_phases_project_id ON public.project_phases(project_id);
CREATE INDEX IF NOT EXISTS idx_worker_payments_worker_id ON public.worker_payments(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_rates_worker_id ON public.worker_rates(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_expenses_worker_id ON public.worker_expenses(worker_id);
CREATE INDEX IF NOT EXISTS idx_time_sheets_user_id ON public.time_sheets(user_id);
CREATE INDEX IF NOT EXISTS idx_time_sheets_project_id ON public.time_sheets(project_id);
CREATE INDEX IF NOT EXISTS idx_daily_task_assignments_worker_id ON public.daily_task_assignments(worker_id);
CREATE INDEX IF NOT EXISTS idx_task_completion_history_worker_id ON public.task_completion_history(worker_id);