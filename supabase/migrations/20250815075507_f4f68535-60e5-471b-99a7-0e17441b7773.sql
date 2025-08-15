-- Update user role to admin for invitation permissions
-- This will change the current user's role from 'worker' to 'admin' in the NextGenHome organization
UPDATE public.organization_members 
SET role = 'admin' 
WHERE user_id = auth.uid() 
AND role = 'worker';