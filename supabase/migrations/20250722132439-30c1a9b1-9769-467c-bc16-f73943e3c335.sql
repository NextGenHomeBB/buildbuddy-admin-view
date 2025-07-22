-- Update the tasks INSERT policy to allow admins to create tasks
DROP POLICY IF EXISTS "Tasks: allow all authenticated inserts" ON tasks;

-- Create new policy that allows admins to insert tasks and regular users to insert tasks assigned to them
CREATE POLICY "Tasks: admin can insert all, users can insert their own" 
ON tasks 
FOR INSERT 
WITH CHECK (
  -- Allow if user is admin
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' 
  OR 
  -- Allow if assignee is the current user
  assignee = auth.uid()
);