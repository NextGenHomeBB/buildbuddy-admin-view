-- Add tracking columns to user_project_role table
ALTER TABLE public.user_project_role 
ADD COLUMN assigned_by UUID,
ADD COLUMN assigned_at TIMESTAMPTZ DEFAULT now();

-- Add unique constraint to prevent duplicate assignments
ALTER TABLE public.user_project_role 
ADD CONSTRAINT user_project_role_unique UNIQUE (user_id, project_id);

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

-- Enable RLS on the view
ALTER VIEW admin.project_assignments_v SET (security_barrier = true);

-- Create RLS policy for admin access to the view
CREATE POLICY "Admin only access to project_assignments_v" 
ON admin.project_assignments_v 
FOR ALL 
USING (get_current_user_role() = 'admin');