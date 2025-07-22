-- Enable RLS on projects table (if not already enabled)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Create admin-only policy for projects
CREATE POLICY "Admins only" 
ON public.projects 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);