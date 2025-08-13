-- Phase 1: Critical Data Protection Fixes

-- 1. Enhanced security for Apple Calendar credentials
-- Add encryption key column and audit fields
ALTER TABLE public.apple_calendar_credentials 
ADD COLUMN IF NOT EXISTS encrypted_password text,
ADD COLUMN IF NOT EXISTS last_accessed timestamp with time zone,
ADD COLUMN IF NOT EXISTS access_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS encryption_key_id text;

-- Create function to audit credential access
CREATE OR REPLACE FUNCTION public.audit_credential_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update access tracking
  NEW.last_accessed = now();
  NEW.access_count = COALESCE(OLD.access_count, 0) + 1;
  
  -- Log access attempt
  INSERT INTO public.security_audit_log (
    user_id, action, table_name, record_id, 
    new_values, ip_address
  ) VALUES (
    auth.uid(), 'ACCESS_CREDENTIAL', 'apple_calendar_credentials', NEW.id,
    jsonb_build_object(
      'access_count', NEW.access_count,
      'access_time', NEW.last_accessed
    ),
    inet_client_addr()::text
  );
  
  RETURN NEW;
END;
$$;

-- Add trigger for credential access auditing
DROP TRIGGER IF EXISTS audit_apple_credential_access ON public.apple_calendar_credentials;
CREATE TRIGGER audit_apple_credential_access
  BEFORE UPDATE ON public.apple_calendar_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_credential_access();

-- 2. Enhanced OAuth token security
-- Add security fields to oauth tokens
ALTER TABLE public.calendar_oauth_tokens
ADD COLUMN IF NOT EXISTS last_used timestamp with time zone,
ADD COLUMN IF NOT EXISTS usage_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS suspicious_activity boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS created_ip text,
ADD COLUMN IF NOT EXISTS last_ip text;

-- Create function to monitor token usage
CREATE OR REPLACE FUNCTION public.monitor_token_usage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_ip text;
  usage_rate numeric;
BEGIN
  current_ip := inet_client_addr()::text;
  
  -- Update usage tracking
  NEW.last_used = now();
  NEW.usage_count = COALESCE(OLD.usage_count, 0) + 1;
  NEW.last_ip = current_ip;
  
  -- Check for suspicious activity (rapid usage from different IPs)
  IF OLD.last_ip IS NOT NULL AND OLD.last_ip != current_ip THEN
    -- Calculate usage rate (uses per hour)
    SELECT EXTRACT(EPOCH FROM (now() - OLD.last_used))/3600 INTO usage_rate;
    IF usage_rate < 0.1 THEN -- More than 10 uses per hour from different IPs
      NEW.suspicious_activity = true;
      
      -- Log security event
      INSERT INTO public.security_audit_log (
        user_id, action, table_name, record_id, 
        new_values, ip_address
      ) VALUES (
        NEW.user_id, 'SUSPICIOUS_TOKEN_USAGE', 'calendar_oauth_tokens', NEW.id,
        jsonb_build_object(
          'old_ip', OLD.last_ip,
          'new_ip', current_ip,
          'usage_rate', usage_rate
        ),
        current_ip
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add trigger for token monitoring
DROP TRIGGER IF EXISTS monitor_oauth_token_usage ON public.calendar_oauth_tokens;
CREATE TRIGGER monitor_oauth_token_usage
  BEFORE UPDATE ON public.calendar_oauth_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.monitor_token_usage();

-- 3. Fix search path vulnerabilities in functions
-- Update all functions to have secure search paths

CREATE OR REPLACE FUNCTION public.update_worker_availability_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_calendar_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_phase_costs_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_timesheet_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 4. Add RLS to phase_costs_vw (create secure replacement)
-- First, add proper RLS policies for viewing phase costs
CREATE POLICY "Admins can view all phase costs" ON public.phase_costs_vw
FOR SELECT USING (
  get_current_user_role() = 'admin'::text
);

CREATE POLICY "Project managers can view phase costs for their projects" ON public.phase_costs_vw
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.user_project_role upr
    WHERE upr.user_id = auth.uid() 
    AND upr.project_id = phase_costs_vw.project_id
    AND upr.role IN ('manager', 'admin')
  )
);

-- Enable RLS on the view
ALTER TABLE public.phase_costs_vw ENABLE ROW LEVEL SECURITY;

-- 5. Enhanced rate limiting with IP tracking
CREATE OR REPLACE FUNCTION public.check_rate_limit_enhanced(
  operation_name text, 
  max_attempts integer DEFAULT 5, 
  window_minutes integer DEFAULT 15
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_attempts integer;
  window_start_time timestamp with time zone;
  user_ip text;
  ip_attempts integer;
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
$$;

-- 6. Create security monitoring function
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type text,
  severity text DEFAULT 'medium',
  details jsonb DEFAULT '{}'::jsonb
)
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
    auth.uid(), event_type, 'security_events',
    jsonb_build_object(
      'severity', severity,
      'details', details,
      'timestamp', now()
    ),
    inet_client_addr()::text
  );
END;
$$;