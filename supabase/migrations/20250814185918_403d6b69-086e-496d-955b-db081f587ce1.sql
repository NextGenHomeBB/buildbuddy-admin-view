-- Update get_current_user_role to use organization_members instead of user_roles
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- First check if user has admin role in user_roles table (global admin)
  SELECT COALESCE(
    (SELECT role::text FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin' LIMIT 1),
    -- Otherwise get role from organization membership
    (SELECT role FROM public.organization_members 
     WHERE user_id = auth.uid() 
     AND status = 'active' 
     AND (expires_at IS NULL OR expires_at > now())
     ORDER BY CASE role
       WHEN 'owner' THEN 1
       WHEN 'admin' THEN 2
       WHEN 'manager' THEN 3
       WHEN 'worker' THEN 4
       ELSE 5
     END
     LIMIT 1),
    'worker'  -- Default role
  );
$$;