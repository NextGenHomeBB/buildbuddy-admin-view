
-- Drop the overly restrictive policy that blocks workers from reading their assignments
DROP POLICY IF EXISTS "Admin only access to user_project_role" ON public.user_project_role;

-- Allow users to read their own project assignments
CREATE POLICY "Users can read their own assignments" 
ON public.user_project_role 
FOR SELECT 
USING (user_id = auth.uid());

-- Allow admins full access to manage assignments
CREATE POLICY "Admin full access to user_project_role" 
ON public.user_project_role 
FOR ALL 
USING (get_current_user_role() = 'admin');

-- Allow admins to insert/update/delete assignments (additional policy for clarity)
CREATE POLICY "Admin can manage all assignments" 
ON public.user_project_role 
FOR INSERT, UPDATE, DELETE 
USING (get_current_user_role() = 'admin');
