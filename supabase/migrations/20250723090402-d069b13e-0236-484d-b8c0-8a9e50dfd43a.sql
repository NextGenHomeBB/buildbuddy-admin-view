-- Add tracking columns to user_project_role table
ALTER TABLE public.user_project_role 
ADD COLUMN IF NOT EXISTS assigned_by UUID,
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ DEFAULT now();

-- Add unique constraint to prevent duplicate assignments (only if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_project_role_unique'
    ) THEN
        ALTER TABLE public.user_project_role 
        ADD CONSTRAINT user_project_role_unique UNIQUE (user_id, project_id);
    END IF;
END $$;

-- Create admin schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS admin;

-- Create view for project assignments with joined data
CREATE OR REPLACE VIEW admin.project_assignments_v AS
SELECT 
    upr.id,
    upr.user_id,
    upr.project_id,
    upr.role,
    upr.assigned_by,
    upr.assigned_at,
    p.full_name,
    p.avatar_url,
    pr.name as project_name
FROM user_project_role upr
JOIN profiles p ON p.id = upr.user_id
JOIN projects pr ON pr.id = upr.project_id;