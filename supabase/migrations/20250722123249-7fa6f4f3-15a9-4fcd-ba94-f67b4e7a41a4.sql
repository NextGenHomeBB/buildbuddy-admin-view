-- Enable RLS and create admin-only policies for key tables

-- Companies table - admin only
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin only access to companies" 
ON public.companies 
FOR ALL 
USING (get_current_user_role() = 'admin');

-- Materials table - admin only  
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin only access to materials"
ON public.materials
FOR ALL
USING (get_current_user_role() = 'admin');

-- Project materials table - admin only
ALTER TABLE public.project_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin only access to project_materials"
ON public.project_materials  
FOR ALL
USING (get_current_user_role() = 'admin');

-- Project phases table - admin only
ALTER TABLE public.project_phases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin only access to project_phases"
ON public.project_phases
FOR ALL  
USING (get_current_user_role() = 'admin');

-- AI prompt templates - admin only
ALTER TABLE public.ai_prompt_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin only access to ai_prompt_templates"
ON public.ai_prompt_templates
FOR ALL
USING (get_current_user_role() = 'admin');

-- User project role table - admin only
ALTER TABLE public.user_project_role ENABLE ROW LEVEL SECURITY;  
CREATE POLICY "Admin only access to user_project_role"
ON public.user_project_role
FOR ALL
USING (get_current_user_role() = 'admin');

-- Update existing projects policy to be more restrictive for admin operations
DROP POLICY IF EXISTS "Admins only" ON public.projects;
CREATE POLICY "Admin full access to projects"
ON public.projects
FOR ALL
USING (get_current_user_role() = 'admin');

-- Add policy for regular users to read projects they're assigned to
CREATE POLICY "Users can read assigned projects"
ON public.projects  
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM user_project_role upr 
  WHERE upr.user_id = auth.uid() AND upr.project_id = projects.id
));