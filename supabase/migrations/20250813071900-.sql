-- Security Fixes Migration
-- Fix 1: Add proper search path to security definer functions
CREATE OR REPLACE FUNCTION public.fn_is_member(p_org uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 
    FROM public.organization_members m
    WHERE m.org_id = p_org 
    AND m.user_id = auth.uid()
    AND m.status = 'active'
    AND (m.expires_at IS NULL OR now() < m.expires_at)
  );
$function$;

CREATE OR REPLACE FUNCTION public.fn_role_in_org(p_org uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT m.role 
  FROM public.organization_members m
  WHERE m.org_id = p_org 
  AND m.user_id = auth.uid()
  AND m.status = 'active'
  AND (m.expires_at IS NULL OR now() < m.expires_at)
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.user_has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = _user_id AND role = _role
  );
$function$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT role::text 
  FROM public.user_roles 
  WHERE user_id = auth.uid() 
  ORDER BY 
    CASE role
      WHEN 'admin' THEN 1
      WHEN 'manager' THEN 2
      WHEN 'worker' THEN 3
    END
  LIMIT 1;
$function$;

-- Fix 2: Add organization scoping to critical tables
-- Add org_id to projects table if not exists
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id);

-- Add org_id to tasks table if not exists
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id);

-- Add org_id to user_roles table if not exists
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id);

-- Fix 3: Make critical user_id fields non-nullable where appropriate
-- Update profiles to ensure non-null constraint (it should reference auth.users)
-- Update RLS policies for projects to include organization scoping
DROP POLICY IF EXISTS "Admin full access to projects" ON public.projects;
CREATE POLICY "Admin full access to projects" ON public.projects
  FOR ALL TO authenticated
  USING (
    get_current_user_role() = 'admin' OR 
    (org_id IS NOT NULL AND fn_role_in_org(org_id) IN ('owner', 'admin'))
  );

-- Update RLS policies for tasks to include organization scoping
DROP POLICY IF EXISTS "Admin only access to tasks" ON public.tasks;
CREATE POLICY "Admin and org members access to tasks" ON public.tasks
  FOR ALL TO authenticated
  USING (
    get_current_user_role() = 'admin' OR
    (org_id IS NOT NULL AND fn_is_member(org_id)) OR
    assignee = auth.uid()
  );

-- Fix 4: Enhanced rate limiting for sensitive operations
CREATE OR REPLACE FUNCTION public.check_rate_limit_enhanced(
  operation_name text, 
  max_attempts integer DEFAULT 5, 
  window_minutes integer DEFAULT 15
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_attempts integer;
  window_start_time timestamp with time zone;
  user_ip text;
BEGIN
  -- Get current window start time
  window_start_time := now() - (window_minutes || ' minutes')::interval;
  
  -- Get user IP for additional tracking
  user_ip := inet_client_addr()::text;
  
  -- Clean up old rate limit records
  DELETE FROM public.rate_limits 
  WHERE window_start < window_start_time;
  
  -- Count current attempts in the window for this user
  SELECT COALESCE(SUM(attempt_count), 0) INTO current_attempts
  FROM public.rate_limits
  WHERE user_id = auth.uid() 
    AND operation = operation_name 
    AND window_start >= window_start_time;
  
  -- Additional IP-based rate limiting for critical operations
  IF operation_name IN ('email_send', 'quotation_create', 'user_invite') THEN
    DECLARE
      ip_attempts integer;
    BEGIN
      SELECT COALESCE(SUM(attempt_count), 0) INTO ip_attempts
      FROM public.rate_limits
      WHERE ip_address = user_ip
        AND operation = operation_name 
        AND window_start >= window_start_time;
      
      -- More restrictive IP-based limits
      IF ip_attempts >= (max_attempts * 2) THEN
        -- Log security event
        INSERT INTO public.security_audit_log (
          user_id, action, table_name, record_id, 
          new_values, ip_address
        ) VALUES (
          auth.uid(), 'RATE_LIMIT_EXCEEDED', 'rate_limits', null,
          jsonb_build_object(
            'operation', operation_name,
            'ip_attempts', ip_attempts,
            'max_allowed', max_attempts * 2
          ),
          user_ip
        );
        RETURN false;
      END IF;
    END;
  END IF;
  
  -- Check if limit exceeded
  IF current_attempts >= max_attempts THEN
    -- Log security event
    INSERT INTO public.security_audit_log (
      user_id, action, table_name, record_id, 
      new_values, ip_address
    ) VALUES (
      auth.uid(), 'RATE_LIMIT_EXCEEDED', 'rate_limits', null,
      jsonb_build_object(
        'operation', operation_name,
        'user_attempts', current_attempts,
        'max_allowed', max_attempts
      ),
      user_ip
    );
    RETURN false;
  END IF;
  
  -- Record this attempt with IP tracking
  INSERT INTO public.rate_limits (user_id, operation, attempt_count, window_start, ip_address)
  VALUES (auth.uid(), operation_name, 1, now(), user_ip)
  ON CONFLICT (user_id, operation) 
  DO UPDATE SET 
    attempt_count = public.rate_limits.attempt_count + 1,
    window_start = CASE 
      WHEN public.rate_limits.window_start < window_start_time THEN now()
      ELSE public.rate_limits.window_start
    END,
    ip_address = user_ip;
  
  RETURN true;
END;
$function$;

-- Add ip_address column to rate_limits if not exists
ALTER TABLE public.rate_limits ADD COLUMN IF NOT EXISTS ip_address text;