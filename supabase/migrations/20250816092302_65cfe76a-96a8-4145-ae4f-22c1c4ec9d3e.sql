-- Remove the duplicate unique constraint, keeping only upr_user_project_unique
ALTER TABLE public.user_project_role DROP CONSTRAINT IF EXISTS user_project_role_unique;