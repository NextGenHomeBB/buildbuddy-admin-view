-- Security hardening: Essential fixes only

-- Fix function search paths for the core existing functions
ALTER FUNCTION public.get_current_user_role() SET search_path = 'public';
ALTER FUNCTION public.update_updated_at_column() SET search_path = 'public';

-- Drop the problematic security definer view that causes security warnings
DROP VIEW IF EXISTS worker.my_tasks_view;

-- Add essential performance indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON public.tasks(assignee);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_user_project_role_user_id ON public.user_project_role(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);