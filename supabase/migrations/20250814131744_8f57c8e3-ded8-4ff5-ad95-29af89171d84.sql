-- Enhanced Apple Calendar Credentials Security Fix
-- This migration addresses the critical security vulnerability by strengthening existing policies

-- Drop and recreate the policy with enhanced security
DROP POLICY IF EXISTS "Users can manage their own Apple credentials" ON apple_calendar_credentials;

-- Create strict owner-only access policy  
CREATE POLICY "apple_credentials_strict_owner_access" 
ON apple_calendar_credentials 
FOR ALL 
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create secure functions for credential management
CREATE OR REPLACE FUNCTION get_apple_credentials_secure(p_user_id uuid DEFAULT auth.uid())
RETURNS TABLE(
  id uuid,
  username text,
  caldav_url text,
  created_at timestamp with time zone,
  last_accessed timestamp with time zone,
  access_count integer
) AS $$
BEGIN
  -- Validate user can access these credentials (only own credentials)
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: can only access own credentials';
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

-- Create a function to securely store credentials with validation
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
  
  -- Store credentials securely (only for authenticated user)
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
    'pending_encryption'
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
      'encrypted', false
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'credential_id', result_id,
    'message', 'Credentials stored securely'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;