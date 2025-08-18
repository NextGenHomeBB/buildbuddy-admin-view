-- Create a comprehensive user role detection function
CREATE OR REPLACE FUNCTION public.get_user_effective_role(p_user_id uuid DEFAULT auth.uid(), p_org_id uuid DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  global_role text;
  org_role text;
BEGIN
  -- Check for global admin role first
  SELECT role::text INTO global_role 
  FROM public.user_roles 
  WHERE user_id = p_user_id AND role = 'admin'::app_role
  LIMIT 1;
  
  IF global_role IS NOT NULL THEN
    RETURN global_role;
  END IF;
  
  -- Check organization role if org_id is provided or get from any org
  IF p_org_id IS NOT NULL THEN
    SELECT role INTO org_role
    FROM public.organization_members
    WHERE user_id = p_user_id 
      AND org_id = p_org_id
      AND status = 'active'
      AND (expires_at IS NULL OR expires_at > now())
    ORDER BY 
      CASE role
        WHEN 'owner' THEN 1
        WHEN 'admin' THEN 2
        WHEN 'manager' THEN 3
        ELSE 4
      END
    LIMIT 1;
  ELSE
    -- Get highest role from any active organization membership
    SELECT role INTO org_role
    FROM public.organization_members
    WHERE user_id = p_user_id 
      AND status = 'active'
      AND (expires_at IS NULL OR expires_at > now())
    ORDER BY 
      CASE role
        WHEN 'owner' THEN 1
        WHEN 'admin' THEN 2
        WHEN 'manager' THEN 3
        ELSE 4
      END
    LIMIT 1;
  END IF;
  
  -- Return the organization role, defaulting to 'worker' if none found
  RETURN COALESCE(org_role, 'worker');
END;
$$;