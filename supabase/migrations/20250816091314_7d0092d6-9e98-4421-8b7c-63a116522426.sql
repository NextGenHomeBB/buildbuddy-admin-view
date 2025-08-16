-- Clean up the problematic database function and create proper unique constraint
DROP FUNCTION IF EXISTS public.assign_workers_to_project(uuid, uuid[], uuid);

-- Ensure user_project_role table has proper unique constraint
-- Drop existing constraint if it exists (with wrong name)
ALTER TABLE public.user_project_role DROP CONSTRAINT IF EXISTS user_project_role_user_id_project_id_key;

-- Add the proper unique constraint with correct name
ALTER TABLE public.user_project_role 
ADD CONSTRAINT upr_user_project_unique UNIQUE (user_id, project_id);