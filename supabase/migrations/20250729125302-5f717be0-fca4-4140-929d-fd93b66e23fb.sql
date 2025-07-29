-- Security hardening: Fix function search paths and security definer issues

-- Fix function search paths for security compliance
ALTER FUNCTION public.audit_trigger_function() SET search_path = 'public';
ALTER FUNCTION public.auto_create_payment_from_shift() SET search_path = 'public';
ALTER FUNCTION public.update_timesheet_updated_at() SET search_path = 'public';
ALTER FUNCTION public.validate_role_assignment() SET search_path = 'public';
ALTER FUNCTION public.validate_task_assignment() SET search_path = 'public';
ALTER FUNCTION public.enhanced_audit_trigger() SET search_path = 'public';
ALTER FUNCTION public.get_my_tasks() SET search_path = 'public';
ALTER FUNCTION public.check_rate_limit() SET search_path = 'public';
ALTER FUNCTION public.expire_old_daily_tasks() SET search_path = 'public';
ALTER FUNCTION public.complete_daily_task() SET search_path = 'public';
ALTER FUNCTION public.get_current_user_role() SET search_path = 'public';
ALTER FUNCTION public.user_has_role() SET search_path = 'public';
ALTER FUNCTION public.setup_demo_data() SET search_path = 'public';
ALTER FUNCTION public.create_user_profile() SET search_path = 'public';

-- Fix security definer view issue by recreating the view without security definer
-- and ensuring proper RLS policies are in place
DROP VIEW IF EXISTS worker.my_tasks_view;

-- The view functionality is already handled by the get_my_tasks() function
-- which has proper security definer settings and RLS policies
-- So we don't need to recreate this view

-- Add missing foreign key constraints for data integrity
ALTER TABLE public.checklist_templates 
ADD CONSTRAINT fk_checklist_templates_phase_template 
FOREIGN KEY (phase_template_id) REFERENCES public.phase_templates(id) ON DELETE CASCADE;

ALTER TABLE public.project_phases 
ADD CONSTRAINT fk_project_phases_project 
FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE public.tasks 
ADD CONSTRAINT fk_tasks_project 
FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE public.tasks 
ADD CONSTRAINT fk_tasks_phase 
FOREIGN KEY (phase_id) REFERENCES public.project_phases(id) ON DELETE SET NULL;

ALTER TABLE public.tasks 
ADD CONSTRAINT fk_tasks_list 
FOREIGN KEY (list_id) REFERENCES public.task_lists(id) ON DELETE CASCADE;

ALTER TABLE public.user_project_role 
ADD CONSTRAINT fk_user_project_role_project 
FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE public.user_project_role 
ADD CONSTRAINT fk_user_project_role_user 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

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