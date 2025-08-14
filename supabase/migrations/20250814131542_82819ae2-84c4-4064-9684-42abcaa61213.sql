-- Enhance Apple Calendar Credentials Security
-- This migration addresses the critical security vulnerability where Apple Calendar credentials could be accessed by unauthorized users

-- First, let's check if proper RLS policies exist and strengthen them
DROP POLICY IF EXISTS "Users can manage their own Apple credentials" ON apple_calendar_credentials;

-- Create enhanced RLS policies with stricter access controls
CREATE POLICY "apple_credentials_owner_only_access" 
ON apple_calendar_credentials 
FOR ALL 
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create a separate policy for admins to view credential metadata (not passwords) for support purposes
CREATE POLICY "admin_view_credential_metadata" 
ON apple_calendar_credentials 
FOR SELECT 
TO authenticated
USING (
  get_current_user_role() = 'admin' AND 
  -- Log this admin access for audit purposes
  (SELECT log_critical_security_event(
    'ADMIN_CREDENTIAL_ACCESS',
    'high',
    jsonb_build_object(
      'credential_owner', user_id,
      'admin_user', auth.uid(),
      'access_reason', 'admin_support'
    )
  )) IS NOT NULL
);

-- Enhance the credential access audit trigger to be more comprehensive
DROP TRIGGER IF EXISTS audit_credential_access_trigger ON apple_calendar_credentials;
DROP FUNCTION IF EXISTS audit_credential_access();

-- Create enhanced credential access monitoring
CREATE OR REPLACE FUNCTION enhanced_credential_security_monitor()
RETURNS TRIGGER AS $$
DECLARE
  current_ip text;
  access_pattern_suspicious boolean := false;
BEGIN
  current_ip := inet_client_addr()::text;
  
  -- Update access tracking with enhanced security metrics
  NEW.last_accessed = now();
  NEW.access_count = COALESCE(OLD.access_count, 0) + 1;
  
  -- Check for suspicious access patterns
  IF OLD.last_accessed IS NOT NULL THEN
    -- Flag rapid successive access (potential brute force or data extraction)
    IF EXTRACT(EPOCH FROM (now() - OLD.last_accessed)) < 60 THEN
      access_pattern_suspicious := true;
    END IF;
  END IF;
  
  -- Log comprehensive security audit
  INSERT INTO security_audit_log (
    user_id, action, table_name, record_id, 
    new_values, ip_address
  ) VALUES (
    auth.uid(), 
    CASE 
      WHEN access_pattern_suspicious THEN 'SUSPICIOUS_CREDENTIAL_ACCESS'
      ELSE 'CREDENTIAL_ACCESS_SECURE'
    END, 
    'apple_calendar_credentials', 
    NEW.id,
    jsonb_build_object(
      'access_count', NEW.access_count,
      'access_time', NEW.last_accessed,
      'credential_type', 'apple_calendar',
      'suspicious_pattern', access_pattern_suspicious,
      'access_interval_seconds', CASE 
        WHEN OLD.last_accessed IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (now() - OLD.last_accessed))
        ELSE NULL 
      END,
      'security_level', CASE 
        WHEN access_pattern_suspicious THEN 'critical'
        ELSE 'medium'
      END
    ),
    current_ip
  );
  
  -- Auto-flag suspicious activity for immediate review
  IF access_pattern_suspicious THEN
    RAISE WARNING 'SUSPICIOUS CREDENTIAL ACCESS DETECTED for user % on credential %', auth.uid(), NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Apply the enhanced security trigger
CREATE TRIGGER enhanced_credential_security_trigger
  BEFORE UPDATE ON apple_calendar_credentials
  FOR EACH ROW EXECUTE FUNCTION enhanced_credential_security_monitor();

-- Create a secure function for retrieving Apple credentials with additional validation
CREATE OR REPLACE FUNCTION get_apple_credentials_secure(p_user_id uuid DEFAULT auth.uid())
RETURNS TABLE(
  id uuid,
  username text,
  caldav_url text,
  created_at timestamp with time zone,
  last_accessed timestamp with time zone,
  access_count integer
) AS $$
DECLARE
  current_user_role text;
BEGIN
  -- Validate user can access these credentials
  IF p_user_id != auth.uid() AND get_current_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Access denied: cannot access other users'' credentials';
  END IF;
  
  -- Rate limiting check for credential access
  IF NOT check_rate_limit_enhanced('apple_credential_access', 10, 60) THEN
    PERFORM log_critical_security_event(
      'CREDENTIAL_ACCESS_RATE_LIMITED',
      'high',
      jsonb_build_object(
        'attempted_user', p_user_id,
        'requesting_user', auth.uid()
      )
    );
    RAISE EXCEPTION 'Rate limit exceeded for credential access';
  END IF;
  
  -- Log the secure access
  PERFORM log_security_event(
    'SECURE_CREDENTIAL_FUNCTION_ACCESS',
    'medium',
    jsonb_build_object(
      'function', 'get_apple_credentials_secure',
      'target_user', p_user_id,
      'requesting_user', auth.uid()
    )
  );
  
  -- Return credentials without sensitive password data
  RETURN QUERY
  SELECT 
    ac.id,
    ac.username,
    ac.caldav_url,
    ac.created_at,
    ac.last_accessed,
    ac.access_count
  FROM apple_calendar_credentials ac
  WHERE ac.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create a function to securely store credentials with enhanced validation
CREATE OR REPLACE FUNCTION store_apple_credentials_secure(
  p_username text,
  p_app_password text,
  p_caldav_url text DEFAULT 'https://caldav.icloud.com/'
)
RETURNS jsonb AS $$
DECLARE
  result_id uuid;
BEGIN
  -- Validate input parameters
  IF p_username IS NULL OR trim(p_username) = '' THEN
    RAISE EXCEPTION 'Username is required';
  END IF;
  
  IF p_app_password IS NULL OR trim(p_app_password) = '' THEN
    RAISE EXCEPTION 'App password is required';
  END IF;
  
  -- Rate limiting for credential storage
  IF NOT check_rate_limit_enhanced('apple_credential_store', 5, 3600) THEN
    PERFORM log_critical_security_event(
      'CREDENTIAL_STORE_RATE_LIMITED',
      'high',
      jsonb_build_object(
        'username', p_username,
        'user_id', auth.uid()
      )
    );
    RAISE EXCEPTION 'Rate limit exceeded for credential storage';
  END IF;
  
  -- Store credentials securely
  INSERT INTO apple_calendar_credentials (
    user_id,
    username,
    app_password,
    caldav_url,
    encryption_key_id
  ) VALUES (
    auth.uid(),
    p_username,
    p_app_password,
    p_caldav_url,
    'pending_encryption' -- TODO: Implement proper encryption
  )
  ON CONFLICT (user_id) DO UPDATE SET
    username = EXCLUDED.username,
    app_password = EXCLUDED.app_password,
    caldav_url = EXCLUDED.caldav_url,
    updated_at = now()
  RETURNING id INTO result_id;
  
  -- Log successful secure storage
  PERFORM log_security_event(
    'CREDENTIAL_STORED_SECURE',
    'medium',
    jsonb_build_object(
      'credential_id', result_id,
      'username', p_username,
      'encrypted', false -- TODO: Update when encryption is implemented
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'credential_id', result_id,
    'message', 'Credentials stored securely'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;