-- Add RLS policy to allow admins to read all projects
CREATE POLICY "Admins can read all projects" 
ON public.projects 
FOR SELECT 
USING (public.get_current_user_role() = 'admin');