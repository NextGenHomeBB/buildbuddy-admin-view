
-- Fix the tasks INSERT policy to allow admin task creation and make it more reliable
DROP POLICY IF EXISTS "Tasks: admin can insert all, users can insert their own" ON tasks;

-- Create a more robust policy that allows:
-- 1. Admins to create any task (with or without assignee)
-- 2. Users to create tasks only when assigned to themselves
CREATE POLICY "Tasks: admin can insert all, users can insert assigned to self" 
ON tasks 
FOR INSERT 
WITH CHECK (
  -- Allow if user is admin (direct check to avoid function issues)
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  OR 
  -- Allow if assignee is the current user (for non-admin users)
  (assignee = auth.uid() AND assignee IS NOT NULL)
);

-- Also ensure admins can read all tasks for the task board
DROP POLICY IF EXISTS "Tasks: admin can read all" ON tasks;
CREATE POLICY "Tasks: admin can read all" 
ON tasks 
FOR SELECT 
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  OR 
  assignee = auth.uid()
);
