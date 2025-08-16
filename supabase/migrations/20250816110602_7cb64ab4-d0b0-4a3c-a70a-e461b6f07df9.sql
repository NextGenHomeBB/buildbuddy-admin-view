-- Critical Security Fixes (Minimal Implementation)

-- 1. Enable RLS on app_settings table - CRITICAL
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin only access to app_settings" 
ON public.app_settings 
FOR ALL 
USING (get_current_user_role() = 'admin')
WITH CHECK (get_current_user_role() = 'admin');

-- 2. Add enhanced rate limiting function with proper security
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

-- 3. Add enhanced security logging function
CREATE OR REPLACE FUNCTION public.log_critical_security_event(event_type text, severity text DEFAULT 'high', details jsonb DEFAULT '{}')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Enhanced security event logging
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
      'timestamp', now()
    ),
    inet_client_addr()::text
  );
  
  -- Auto-escalate critical events
  IF severity = 'critical' THEN
    RAISE WARNING 'Critical security event: % - %', event_type, details;
  END IF;
END;
$function$;

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

-- 5. Create security settings table for better configuration management
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