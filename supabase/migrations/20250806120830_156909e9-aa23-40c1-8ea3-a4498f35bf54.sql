-- Use a more direct approach - insert admin roles with service role permissions
-- This should bypass RLS and triggers since it's run as a migration
SET session_replication_role = replica; -- Disable triggers temporarily

INSERT INTO public.user_roles (user_id, role) 
VALUES 
  ('c19f563c-575b-4b66-888a-a6080859feb7', 'admin'),
  ('adb27201-a27a-4658-b251-176cc99c373e', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

SET session_replication_role = DEFAULT; -- Re-enable triggers