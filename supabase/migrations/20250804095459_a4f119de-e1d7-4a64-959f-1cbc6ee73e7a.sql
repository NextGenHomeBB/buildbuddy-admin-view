-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Timesheets: owner all" ON public.time_sheets;

-- Create separate policies for different access levels
CREATE POLICY "Workers can manage their own timesheets" 
ON public.time_sheets 
FOR ALL 
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Allow admins and managers to view and approve all timesheets
CREATE POLICY "Admins and managers can view all timesheets" 
ON public.time_sheets 
FOR SELECT 
TO authenticated
USING (
  user_has_role(auth.uid(), 'admin'::app_role) OR 
  user_has_role(auth.uid(), 'manager'::app_role)
);

-- Allow admins and managers to update approval status
CREATE POLICY "Admins and managers can approve timesheets" 
ON public.time_sheets 
FOR UPDATE 
TO authenticated
USING (
  user_has_role(auth.uid(), 'admin'::app_role) OR 
  user_has_role(auth.uid(), 'manager'::app_role)
)
WITH CHECK (
  user_has_role(auth.uid(), 'admin'::app_role) OR 
  user_has_role(auth.uid(), 'manager'::app_role)
);