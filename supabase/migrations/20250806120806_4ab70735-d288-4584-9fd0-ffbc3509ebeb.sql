-- Temporarily disable role validation trigger
DROP TRIGGER IF EXISTS validate_user_role_trigger ON public.user_roles;

-- Assign admin role to users
INSERT INTO public.user_roles (user_id, role) 
VALUES ('c19f563c-575b-4b66-888a-a6080859feb7', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_roles (user_id, role) 
VALUES ('adb27201-a27a-4658-b251-176cc99c373e', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Re-enable role validation trigger
CREATE TRIGGER validate_user_role_trigger
  BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION validate_role_assignment();