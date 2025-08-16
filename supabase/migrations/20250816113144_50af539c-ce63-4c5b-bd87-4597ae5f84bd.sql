-- Phase 3: RLS Policy Fixes & Advanced Access Controls (Fixed)
-- Fix infinite recursion in user_project_role and implement comprehensive security

-- 1. Drop and recreate can_access_project function with proper parameters
DROP FUNCTION IF EXISTS public.can_access_project(uuid, uuid);

CREATE OR REPLACE FUNCTION public.can_access_project(project_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    -- Global admin access
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = user_uuid AND ur.role = 'admin'::app_role
  ) OR EXISTS (
    -- Organization admin/owner access
    SELECT 1 FROM organization_members om
    JOIN projects p ON p.org_id = om.org_id
    WHERE p.id = project_uuid 
    AND om.user_id = user_uuid 
    AND om.role IN ('owner', 'admin')
    AND om.status = 'active'
    AND (om.expires_at IS NULL OR om.expires_at > now())
  ) OR EXISTS (
    -- Direct project role access
    SELECT 1 FROM user_project_role upr
    WHERE upr.project_id = project_uuid AND upr.user_id = user_uuid
  );
$$;

-- 2. Create secure function for checking project access without infinite recursion
CREATE OR REPLACE FUNCTION public.check_project_access_secure(p_project_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role text;
  has_access boolean := false;
BEGIN
  -- Check if user is global admin
  SELECT role::text INTO user_role 
  FROM user_roles 
  WHERE user_id = p_user_id AND role = 'admin'::app_role 
  LIMIT 1;
  
  IF user_role = 'admin' THEN
    RETURN true;
  END IF;
  
  -- Check organization membership
  SELECT EXISTS (
    SELECT 1 FROM organization_members om
    JOIN projects p ON p.org_id = om.org_id
    WHERE p.id = p_project_id 
    AND om.user_id = p_user_id 
    AND om.role IN ('owner', 'admin', 'manager')
    AND om.status = 'active'
    AND (om.expires_at IS NULL OR om.expires_at > now())
  ) INTO has_access;
  
  IF has_access THEN
    RETURN true;
  END IF;
  
  -- Check direct project assignment (avoid recursion by using simple existence check)
  SELECT EXISTS (
    SELECT 1 FROM user_project_role 
    WHERE project_id = p_project_id AND user_id = p_user_id
  ) INTO has_access;
  
  RETURN has_access;
END;
$$;

-- 3. Drop existing problematic RLS policies on user_project_role
DROP POLICY IF EXISTS "Users can view project roles they have access to" ON user_project_role;
DROP POLICY IF EXISTS "Admins can manage all project roles" ON user_project_role;
DROP POLICY IF EXISTS "Project managers can manage roles for their projects" ON user_project_role;
DROP POLICY IF EXISTS "Users can manage their own project roles" ON user_project_role;

-- 4. Create new RLS policies for user_project_role without recursion
CREATE POLICY "Global admins can manage all project roles"
ON user_project_role FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
  )
);

CREATE POLICY "Organization admins can manage project roles in their org"
ON user_project_role FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    JOIN projects p ON p.org_id = om.org_id
    WHERE p.id = user_project_role.project_id
    AND om.user_id = auth.uid()
    AND om.role IN ('owner', 'admin')
    AND om.status = 'active'
    AND (om.expires_at IS NULL OR om.expires_at > now())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_members om
    JOIN projects p ON p.org_id = om.org_id
    WHERE p.id = user_project_role.project_id
    AND om.user_id = auth.uid()
    AND om.role IN ('owner', 'admin')
    AND om.status = 'active'
    AND (om.expires_at IS NULL OR om.expires_at > now())
  )
);

CREATE POLICY "Users can view their own project roles"
ON user_project_role FOR SELECT
USING (user_id = auth.uid());

-- 5. Create audit trail for sensitive operations
CREATE TABLE IF NOT EXISTS public.sensitive_operation_audit (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  operation_type TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  operation_data JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  risk_score INTEGER DEFAULT 0,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on audit table
ALTER TABLE public.sensitive_operation_audit ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
CREATE POLICY "Only admins can view sensitive operation audit logs"
ON public.sensitive_operation_audit FOR SELECT
USING (get_current_user_role() = 'admin');

-- System can insert audit logs
CREATE POLICY "System can insert sensitive operation audit logs"
ON public.sensitive_operation_audit FOR INSERT
WITH CHECK (true);

-- 6. Create function for logging sensitive operations
CREATE OR REPLACE FUNCTION public.log_sensitive_operation(
  p_operation_type TEXT,
  p_table_name TEXT,
  p_record_id UUID DEFAULT NULL,
  p_operation_data JSONB DEFAULT '{}',
  p_risk_score INTEGER DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.sensitive_operation_audit (
    user_id, operation_type, table_name, record_id, 
    operation_data, ip_address, risk_score
  ) VALUES (
    auth.uid(), p_operation_type, p_table_name, p_record_id,
    p_operation_data, inet_client_addr()::text, p_risk_score
  );
END;
$$;

-- 7. Create data integrity check function
CREATE OR REPLACE FUNCTION public.verify_data_integrity()
RETURNS TABLE(
  check_name TEXT,
  status TEXT,
  issue_count INTEGER,
  details JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check for orphaned project roles
  RETURN QUERY
  SELECT 
    'orphaned_project_roles'::TEXT,
    CASE WHEN COUNT(*) > 0 THEN 'FAIL' ELSE 'PASS' END::TEXT,
    COUNT(*)::INTEGER,
    jsonb_build_object('orphaned_roles', COUNT(*))
  FROM user_project_role upr
  LEFT JOIN projects p ON p.id = upr.project_id
  WHERE p.id IS NULL;
  
  -- Check for duplicate organization memberships
  RETURN QUERY
  SELECT 
    'duplicate_org_memberships'::TEXT,
    CASE WHEN COUNT(*) > 0 THEN 'FAIL' ELSE 'PASS' END::TEXT,
    COUNT(*)::INTEGER,
    jsonb_build_object('duplicate_memberships', COUNT(*))
  FROM (
    SELECT org_id, user_id, COUNT(*) as cnt
    FROM organization_members
    WHERE status = 'active'
    GROUP BY org_id, user_id
    HAVING COUNT(*) > 1
  ) duplicates;
  
  -- Check for missing profile records
  RETURN QUERY
  SELECT 
    'missing_profiles'::TEXT,
    CASE WHEN COUNT(*) > 0 THEN 'FAIL' ELSE 'PASS' END::TEXT,
    COUNT(*)::INTEGER,
    jsonb_build_object('users_without_profiles', COUNT(*))
  FROM auth.users u
  LEFT JOIN profiles p ON p.id = u.id
  WHERE p.id IS NULL;
END;
$$;

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_project_role_user_project ON user_project_role(user_id, project_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_org_user_active ON organization_members(org_id, user_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_sensitive_audit_timestamp ON sensitive_operation_audit(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sensitive_audit_user_operation ON sensitive_operation_audit(user_id, operation_type);