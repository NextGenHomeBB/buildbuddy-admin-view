
-- Update the current user's role to admin
UPDATE public.profiles 
SET role = 'admin' 
WHERE full_name = 'Raafat';

-- Also update any other users you want to be admin (optional)
-- UPDATE public.profiles SET role = 'admin' WHERE id = 'specific-user-id';
