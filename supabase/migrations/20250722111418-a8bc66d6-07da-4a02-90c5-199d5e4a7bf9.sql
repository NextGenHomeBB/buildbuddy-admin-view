
-- Add a new RLS policy to allow admins to read all profiles
CREATE POLICY "Admins can read all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);
