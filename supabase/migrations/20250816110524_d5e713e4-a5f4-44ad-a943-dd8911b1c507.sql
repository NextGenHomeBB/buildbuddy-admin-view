-- Phase 1: Critical Database Security Fixes (Handle Dependencies)

-- 1. Enable RLS on app_settings table and add admin-only policies
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin only access to app_settings" 
ON public.app_settings 
FOR ALL 
USING (get_current_user_role() = 'admin')
WITH CHECK (get_current_user_role() = 'admin');

-- 2. Fix database functions with unsafe search_path
CREATE OR REPLACE FUNCTION public.audit_guard_blocked()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Simple guard to prevent audit recursion
  RETURN current_setting('app.audit_disabled', true)::boolean;
EXCEPTION
  WHEN others THEN
    RETURN false;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_rate_limit_enhanced(operation_name text, max_attempts integer DEFAULT 10, window_minutes integer DEFAULT 60)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  current_attempts integer;
  window_start_time timestamp with time zone;
  current_ip text;
BEGIN
  -- Get current IP and window start time
  current_ip := inet_client_addr()::text;
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
    -- Log rate limit violation
    INSERT INTO public.security_audit_log (
      user_id, action, table_name,
      new_values, ip_address
    ) VALUES (
      auth.uid(), 
      'RATE_LIMIT_EXCEEDED', 
      'rate_limits',
      jsonb_build_object(
        'operation', operation_name,
        'attempts', current_attempts,
        'limit', max_attempts,
        'window_minutes', window_minutes
      ),
      current_ip
    );
    
    RETURN false;
  END IF;
  
  -- Record this attempt
  INSERT INTO public.rate_limits (user_id, operation, attempt_count, window_start, ip_address)
  VALUES (auth.uid(), operation_name, 1, now(), current_ip)
  ON CONFLICT (user_id, operation) 
  DO UPDATE SET 
    attempt_count = public.rate_limits.attempt_count + 1,
    window_start = CASE 
      WHEN public.rate_limits.window_start < window_start_time THEN now()
      ELSE public.rate_limits.window_start
    END,
    ip_address = current_ip;
  
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_critical_security_event(event_type text, severity text DEFAULT 'high', details jsonb DEFAULT '{}')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Enhanced security event logging with proper classification
  INSERT INTO public.security_audit_log (
    user_id, action, table_name,
    new_values, ip_address
  ) VALUES (
    auth.uid(), 
    CONCAT('CRITICAL_', UPPER(event_type)), 
    'security_events',
    jsonb_build_object(
      'severity', severity,
      'event_type', event_type,
      'details', details,
      'timestamp', now(),
      'user_agent', current_setting('request.headers', true)::json->>'user-agent'
    ),
    inet_client_addr()::text
  );
  
  -- Auto-escalate critical events
  IF severity = 'critical' THEN
    RAISE WARNING 'Critical security event: % - %', event_type, details;
  END IF;
END;
$function$;

-- 3. Handle can_access_project function dependencies
-- Drop the dependent policy first
DROP POLICY IF EXISTS "project_select_policy" ON public.projects;

-- Now we can safely replace the function with proper search_path
CREATE OR REPLACE FUNCTION public.can_access_project(project_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT EXISTS (
    -- Global admin access
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = can_access_project.user_id 
    AND ur.role = 'admin'
  ) OR EXISTS (
    -- Organization admin/owner access
    SELECT 1 FROM projects p
    JOIN organization_members om ON om.org_id = p.org_id
    WHERE p.id = can_access_project.project_id
    AND om.user_id = can_access_project.user_id
    AND om.role IN ('owner', 'admin')
    AND om.status = 'active'
    AND (om.expires_at IS NULL OR om.expires_at > now())
  ) OR EXISTS (
    -- Direct project role access
    SELECT 1 FROM user_project_role upr
    WHERE upr.project_id = can_access_project.project_id
    AND upr.user_id = can_access_project.user_id
  );
$function$;

-- Recreate the policy with the fixed function
CREATE POLICY "project_select_policy" 
ON public.projects 
FOR SELECT 
USING (can_access_project(id, auth.uid()));

-- 4. Strengthen apple_calendar_credentials RLS policies
DROP POLICY IF EXISTS "Users can manage their own Apple credentials" ON public.apple_calendar_credentials;
DROP POLICY IF EXISTS "Admins can view all Apple credentials" ON public.apple_calendar_credentials;

CREATE POLICY "Users can manage own Apple credentials only" 
ON public.apple_calendar_credentials 
FOR ALL 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all Apple credentials for support" 
ON public.apple_calendar_credentials 
FOR SELECT 
USING (get_current_user_role() = 'admin');

-- 5. Add security monitoring for sensitive operations
CREATE OR REPLACE FUNCTION public.monitor_sensitive_data_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Monitor access to sensitive tables
  IF TG_TABLE_NAME IN ('apple_calendar_credentials', 'calendar_oauth_tokens', 'documents') THEN
    PERFORM log_critical_security_event(
      'SENSITIVE_DATA_ACCESS',
      'medium',
      jsonb_build_object(
        'table_name', TG_TABLE_NAME,
        'operation', TG_OP,
        'record_id', COALESCE(NEW.id, OLD.id)
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Apply monitoring triggers to sensitive tables
DROP TRIGGER IF EXISTS monitor_apple_credentials_access ON public.apple_calendar_credentials;
CREATE TRIGGER monitor_apple_credentials_access
  AFTER INSERT OR UPDATE OR DELETE ON public.apple_calendar_credentials
  FOR EACH ROW EXECUTE FUNCTION monitor_sensitive_data_access();

DROP TRIGGER IF EXISTS monitor_oauth_tokens_access ON public.calendar_oauth_tokens;
CREATE TRIGGER monitor_oauth_tokens_access
  AFTER INSERT OR UPDATE OR DELETE ON public.calendar_oauth_tokens
  FOR EACH ROW EXECUTE FUNCTION monitor_sensitive_data_access();

-- 6. Create security settings table for better configuration management
CREATE TABLE IF NOT EXISTS public.security_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.security_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin only security settings" 
ON public.security_settings 
FOR ALL 
USING (get_current_user_role() = 'admin')
WITH CHECK (get_current_user_role() = 'admin');

-- Insert default security settings
INSERT INTO public.security_settings (setting_key, setting_value, description) VALUES
('credential_access_rate_limit', '{"max_attempts": 5, "window_minutes": 60}', 'Rate limit for credential access attempts'),
('session_timeout_minutes', '480', 'Session timeout in minutes (8 hours)'),
('failed_login_lockout', '{"max_attempts": 5, "lockout_minutes": 15}', 'Failed login attempt lockout settings')
ON CONFLICT (setting_key) DO NOTHING;