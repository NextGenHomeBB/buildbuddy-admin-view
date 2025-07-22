-- Update the tasks INSERT policy to use the security definer function to avoid infinite recursion
DROP POLICY IF EXISTS "Tasks: admin can insert all, users can insert their own" ON tasks;

-- Create new policy that allows admins to insert tasks and regular users to insert tasks assigned to them
CREATE POLICY "Tasks: admin can insert all, users can insert their own" 
ON tasks 
FOR INSERT 
WITH CHECK (
  -- Allow if user is admin (using the existing security definer function)
  get_current_user_role() = 'admin' 
  OR 
  -- Allow if assignee is the current user
  assignee = auth.uid()
);