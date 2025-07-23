
-- Add assigned_workers JSONB field to projects table to store array of worker IDs
ALTER TABLE public.projects 
ADD COLUMN assigned_workers JSONB DEFAULT '[]'::jsonb;

-- Update existing projects to populate assigned_workers based on user_project_role
UPDATE public.projects 
SET assigned_workers = (
  SELECT COALESCE(jsonb_agg(upr.user_id), '[]'::jsonb)
  FROM user_project_role upr 
  WHERE upr.project_id = projects.id 
  AND upr.role = 'worker'
);

-- Create index for better performance when querying assigned workers
CREATE INDEX idx_projects_assigned_workers ON public.projects USING gin (assigned_workers);
