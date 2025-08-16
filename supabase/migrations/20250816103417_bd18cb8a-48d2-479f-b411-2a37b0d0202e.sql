-- Fix infinite recursion in user_project_role RLS policies
-- First, drop existing problematic policies
DROP POLICY IF EXISTS "Users can access projects they are assigned to" ON user_project_role;
DROP POLICY IF EXISTS "Admins can manage all project assignments" ON user_project_role;
DROP POLICY IF EXISTS "Project managers can manage project assignments" ON user_project_role;

-- Create a security definer function to check project access without recursion
CREATE OR REPLACE FUNCTION public.can_access_project(project_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
  -- Check if user is global admin
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = user_uuid AND role = 'admin'::public.app_role
  ) OR
  -- Check if user is org admin/owner for this project
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.organization_members om ON p.org_id = om.org_id
    WHERE p.id = project_uuid 
    AND om.user_id = user_uuid 
    AND om.role IN ('owner', 'admin')
    AND om.status = 'active'
  );
$$;

-- Create simple, non-recursive RLS policies for user_project_role
CREATE POLICY "Global admins manage all project roles"
ON public.user_project_role
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role
  )
);

CREATE POLICY "Users view own project assignments"
ON public.user_project_role
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Project access via can_access_project function"
ON public.user_project_role
FOR ALL
USING (public.can_access_project(project_id, auth.uid()))
WITH CHECK (public.can_access_project(project_id, auth.uid()));

-- Ensure RLS is enabled
ALTER TABLE public.user_project_role ENABLE ROW LEVEL SECURITY;

-- Create enhanced role function that doesn't cause recursion
CREATE OR REPLACE FUNCTION public.get_current_user_role_enhanced()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role text;
  debug_info jsonb;
  user_uuid uuid;
BEGIN
  user_uuid := auth.uid();
  
  IF user_uuid IS NULL THEN
    RETURN jsonb_build_object(
      'role', 'worker',
      'debug', jsonb_build_object(
        'user_id', null,
        'timestamp', now(),
        'session_valid', false,
        'auth_function_available', true
      ),
      'source', 'no_session'
    );
  END IF;

  -- Check global admin role first (most privileged)
  SELECT role::text INTO user_role 
  FROM public.user_roles 
  WHERE user_id = user_uuid AND role = 'admin'::public.app_role 
  LIMIT 1;
  
  IF user_role IS NOT NULL THEN
    RETURN jsonb_build_object(
      'role', user_role,
      'debug', jsonb_build_object(
        'user_id', user_uuid,
        'timestamp', now(),
        'session_valid', true,
        'auth_function_available', true
      ),
      'source', 'global_admin'
    );
  END IF;

  -- Check organization membership
  SELECT om.role INTO user_role
  FROM public.organization_members om
  WHERE om.user_id = user_uuid 
  AND om.status = 'active' 
  AND (om.expires_at IS NULL OR om.expires_at > now())
  ORDER BY CASE om.role
    WHEN 'owner' THEN 1
    WHEN 'admin' THEN 2
    WHEN 'manager' THEN 3
    WHEN 'worker' THEN 4
    ELSE 5
  END
  LIMIT 1;

  user_role := COALESCE(user_role, 'worker');

  RETURN jsonb_build_object(
    'role', user_role,
    'debug', jsonb_build_object(
      'user_id', user_uuid,
      'timestamp', now(),
      'session_valid', true,
      'auth_function_available', true
    ),
    'source', 'organization_member'
  );
END;
$$;

-- Create rate limiting function that doesn't cause recursion
CREATE OR REPLACE FUNCTION public.check_rate_limit_enhanced(operation_name text, max_attempts integer DEFAULT 10, window_minutes integer DEFAULT 60)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_attempts integer;
  window_start_time timestamp with time zone;
BEGIN
  -- Get current window start time
  window_start_time := now() - (window_minutes || ' minutes')::interval;
  
  -- Clean up old rate limit records
  DELETE FROM public.rate_limits 
  WHERE window_start < window_start_time;
  
  -- Count current attempts in the window
  SELECT COALESCE(SUM(attempt_count), 0) INTO current_attempts
  FROM public.rate_limits
  WHERE user_id = auth.uid() 
    AND operation = operation_name 
    AND window_start >= window_start_time;
  
  -- Check if limit exceeded
  IF current_attempts >= max_attempts THEN
    RETURN false;
  END IF;
  
  -- Record this attempt
  INSERT INTO public.rate_limits (user_id, operation, attempt_count, window_start)
  VALUES (auth.uid(), operation_name, 1, now())
  ON CONFLICT (user_id, operation) 
  DO UPDATE SET 
    attempt_count = public.rate_limits.attempt_count + 1,
    window_start = CASE 
      WHEN public.rate_limits.window_start < window_start_time THEN now()
      ELSE public.rate_limits.window_start
    END;
  
  RETURN true;
END;
$$;

-- Create security logging function
CREATE OR REPLACE FUNCTION public.log_critical_security_event(event_type text, severity text DEFAULT 'medium', details jsonb DEFAULT '{}')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    user_id, action, table_name,
    new_values, ip_address
  ) VALUES (
    auth.uid(), 
    event_type, 
    'security_events',
    jsonb_build_object(
      'severity', severity,
      'details', details,
      'timestamp', now()
    ),
    inet_client_addr()::text
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Log errors silently to avoid breaking operations
    NULL;
END;
$$;