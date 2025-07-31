-- Fix Security Definer View - Drop the problematic view
DROP VIEW IF EXISTS worker.my_tasks_view;

-- Fix Function Search Path Mutable issues - Update functions to set search_path
ALTER FUNCTION public.audit_trigger_function() SET search_path = 'public';
ALTER FUNCTION public.enhanced_audit_trigger() SET search_path = 'public';
ALTER FUNCTION public.validate_role_assignment() SET search_path = 'public';
ALTER FUNCTION public.validate_task_assignment() SET search_path = 'public';
ALTER FUNCTION public.auto_create_payment_from_shift() SET search_path = 'public';