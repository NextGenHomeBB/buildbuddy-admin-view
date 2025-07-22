-- Add RLS policy to allow admins to read profiles for stats
DROP POLICY IF EXISTS "Admins can read all profiles for stats" ON public.profiles;
CREATE POLICY "Admins can read all profiles for stats" 
ON public.profiles 
FOR SELECT 
USING (public.get_current_user_role() = 'admin');