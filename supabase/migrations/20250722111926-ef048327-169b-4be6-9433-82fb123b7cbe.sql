
-- Drop the problematic policy that creates circular dependency
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;

-- Create a security definer function to safely check admin status
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Create a new RLS policy that uses the security definer function
CREATE POLICY "Admins can read all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.get_current_user_role() = 'admin');
