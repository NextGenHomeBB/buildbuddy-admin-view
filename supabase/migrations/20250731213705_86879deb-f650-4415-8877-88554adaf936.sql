-- Fix RLS policies for active_shifts table to ensure workers can insert their own shifts

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage all active shifts" ON active_shifts;
DROP POLICY IF EXISTS "Admins can view all active shifts" ON active_shifts;
DROP POLICY IF EXISTS "Workers can manage their own active shifts" ON active_shifts;
DROP POLICY IF EXISTS "Workers can view their own active shifts" ON active_shifts;

-- Create comprehensive policies that allow workers to manage their own shifts
CREATE POLICY "Workers can manage their own shifts" 
ON active_shifts 
FOR ALL 
USING (worker_id = auth.uid())
WITH CHECK (worker_id = auth.uid());

-- Create policy for admins to view and manage all shifts
CREATE POLICY "Admins can manage all shifts" 
ON active_shifts 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'::app_role
  )
);

-- Ensure the table has RLS enabled
ALTER TABLE active_shifts ENABLE ROW LEVEL SECURITY;