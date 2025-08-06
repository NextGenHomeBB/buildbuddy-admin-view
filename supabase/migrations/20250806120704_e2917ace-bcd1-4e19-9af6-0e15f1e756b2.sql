-- Assign admin role to the first user (Manager User)
INSERT INTO public.user_roles (user_id, role) 
VALUES ('c19f563c-575b-4b66-888a-a6080859feb7', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Also assign admin role to Mitchell since they seem to be a project manager
INSERT INTO public.user_roles (user_id, role) 
VALUES ('adb27201-a27a-4658-b251-176cc99c373e', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;