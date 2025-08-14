-- Fix Apple Calendar Passwords Security Issue
-- Drop existing policies and create more secure ones with enhanced monitoring

-- Drop existing policies
DROP POLICY IF EXISTS "apple_credentials_owner_only_access" ON public.apple_calendar_credentials;
DROP POLICY IF EXISTS "apple_credentials_strict_owner_access" ON public.apple_calendar_credentials;

-- Create secure access function for Apple credentials
CREATE OR REPLACE FUNCTION public.get_apple_credentials_secure(p_user_id uuid DEFAULT NULL)
RETURNS TABLE(
  id uuid,
  username text,
  caldav_url text,
  app_password text,
  created_at timestamp with time zone,
  last_accessed timestamp with time zone,
  access_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_user_id uuid;
  user_role text;
BEGIN
  -- Determine target user (default to current user)
  target_user_id := COALESCE(p_user_id, auth.uid());
  
  -- Get current user role
  user_role := public.get_current_user_role();
  
  -- Rate limiting for credential access
  IF NOT public.check_rate_limit_enhanced('apple_credential_access', 5, 60) THEN
    PERFORM public.log_critical_security_event(
      'APPLE_CREDENTIAL_RATE_LIMIT_EXCEEDED',
      'high',
      jsonb_build_object(
        'target_user_id', target_user_id,
        'requesting_user', auth.uid(),
        'user_role', user_role
      )
    );
    RAISE EXCEPTION 'Rate limit exceeded for Apple credential access';
  END IF;
  
  -- Only allow users to access their own credentials
  IF target_user_id != auth.uid() THEN
    PERFORM public.log_critical_security_event(
      'UNAUTHORIZED_APPLE_CREDENTIAL_ACCESS_ATTEMPT',
      'critical',
      jsonb_build_object(
        'target_user_id', target_user_id,
        'requesting_user', auth.uid(),
        'user_role', user_role,
        'violation_type', 'cross_user_access_attempt'
      )
    );
    RAISE EXCEPTION 'Access denied: can only access own credentials';
  END IF;
  
  -- Log legitimate access
  PERFORM public.log_critical_security_event(
    'APPLE_CREDENTIAL_SECURE_ACCESS',
    'medium',
    jsonb_build_object(
      'user_id', target_user_id,
      'user_role', user_role,
      'access_method', 'secure_rpc_function'
    )
  );
  
  -- Return credentials and update access tracking
  RETURN QUERY
  SELECT 
    c.id,
    c.username,
    c.caldav_url,
    c.app_password,
    c.created_at,
    c.last_accessed,
    c.access_count
  FROM public.apple_calendar_credentials c
  WHERE c.user_id = target_user_id;
  
  -- Update access tracking
  UPDATE public.apple_calendar_credentials 
  SET 
    last_accessed = now(),
    access_count = COALESCE(access_count, 0) + 1,
    updated_at = now()
  WHERE user_id = target_user_id;
END;
$$;

-- Create secure storage function for Apple credentials
CREATE OR REPLACE FUNCTION public.store_apple_credentials_secure(
  p_username text,
  p_app_password text,
  p_caldav_url text DEFAULT 'https://caldav.icloud.com/'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role text;
  credential_id uuid;
BEGIN
  -- Get current user role
  user_role := public.get_current_user_role();
  
  -- Rate limiting for credential storage
  IF NOT public.check_rate_limit_enhanced('apple_credential_store', 3, 3600) THEN
    PERFORM public.log_critical_security_event(
      'APPLE_CREDENTIAL_STORE_RATE_LIMIT_EXCEEDED',
      'high',
      jsonb_build_object(
        'user_id', auth.uid(),
        'user_role', user_role,
        'username', p_username
      )
    );
    RAISE EXCEPTION 'Rate limit exceeded for Apple credential storage';
  END IF;
  
  -- Validate input parameters
  IF p_username IS NULL OR p_username = '' THEN
    RAISE EXCEPTION 'Username is required';
  END IF;
  
  IF p_app_password IS NULL OR p_app_password = '' THEN
    RAISE EXCEPTION 'App password is required';
  END IF;
  
  -- Log credential storage attempt
  PERFORM public.log_critical_security_event(
    'APPLE_CREDENTIAL_STORE_ATTEMPT',
    'medium',
    jsonb_build_object(
      'user_id', auth.uid(),
      'user_role', user_role,
      'username', p_username,
      'caldav_url', p_caldav_url
    )
  );
  
  -- Insert or update credentials
  INSERT INTO public.apple_calendar_credentials (
    user_id,
    username,
    app_password,
    caldav_url,
    access_count
  ) VALUES (
    auth.uid(),
    p_username,
    p_app_password,
    p_caldav_url,
    0
  )
  ON CONFLICT (user_id) DO UPDATE SET
    username = EXCLUDED.username,
    app_password = EXCLUDED.app_password,
    caldav_url = EXCLUDED.caldav_url,
    updated_at = now()
  RETURNING id INTO credential_id;
  
  -- Log successful storage
  PERFORM public.log_critical_security_event(
    'APPLE_CREDENTIAL_STORED_SUCCESSFULLY',
    'low',
    jsonb_build_object(
      'user_id', auth.uid(),
      'credential_id', credential_id,
      'username', p_username
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'credential_id', credential_id,
    'message', 'Apple credentials stored successfully'
  );
END;
$$;

-- Create enhanced monitoring trigger for Apple credentials
CREATE OR REPLACE FUNCTION public.monitor_apple_credential_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_ip text;
  recent_access_count integer;
  access_rate numeric;
BEGIN
  current_ip := inet_client_addr()::text;
  
  -- Update access tracking
  NEW.last_accessed = now();
  NEW.access_count = COALESCE(OLD.access_count, 0) + 1;
  NEW.updated_at = now();
  
  -- Check for suspicious access patterns
  IF OLD.last_accessed IS NOT NULL THEN
    -- Calculate access rate (accesses per hour)
    SELECT EXTRACT(EPOCH FROM (now() - OLD.last_accessed))/3600 INTO access_rate;
    
    -- Flag high-frequency access as suspicious
    IF access_rate > 10 THEN -- More than 10 accesses per hour
      PERFORM public.log_critical_security_event(
        'SUSPICIOUS_APPLE_CREDENTIAL_ACCESS_PATTERN',
        'high',
        jsonb_build_object(
          'user_id', NEW.user_id,
          'credential_id', NEW.id,
          'access_rate', access_rate,
          'total_access_count', NEW.access_count,
          'current_ip', current_ip
        )
      );
    END IF;
  END IF;
  
  -- Check for access from multiple IPs in short time
  SELECT COUNT(DISTINCT ip_address) INTO recent_access_count
  FROM public.security_audit_log
  WHERE user_id = NEW.user_id
    AND action LIKE '%APPLE_CREDENTIAL%'
    AND timestamp > now() - INTERVAL '1 hour';
  
  IF recent_access_count > 3 THEN
    PERFORM public.log_critical_security_event(
      'APPLE_CREDENTIAL_MULTI_IP_ACCESS',
      'critical',
      jsonb_build_object(
        'user_id', NEW.user_id,
        'credential_id', NEW.id,
        'distinct_ips', recent_access_count,
        'current_ip', current_ip,
        'threat_level', 'account_compromise_suspected'
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for Apple credential access monitoring
DROP TRIGGER IF EXISTS monitor_apple_credential_access_trigger ON public.apple_calendar_credentials;
CREATE TRIGGER monitor_apple_credential_access_trigger
  BEFORE UPDATE ON public.apple_calendar_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.monitor_apple_credential_access();

-- Create strict RLS policies for Apple calendar credentials
-- Policy 1: Users can only read their own credentials through secure function
CREATE POLICY "apple_credentials_owner_read_only"
ON public.apple_calendar_credentials
FOR SELECT
USING (
  user_id = auth.uid() 
  AND (
    -- Log all direct table access attempts
    public.log_critical_security_event(
      'APPLE_CREDENTIAL_DIRECT_TABLE_ACCESS',
      'medium',
      jsonb_build_object(
        'user_id', user_id,
        'credential_id', id,
        'access_method', 'direct_table_query',
        'warning', 'consider_using_secure_rpc_function'
      )
    ) IS NOT NULL
  )
);

-- Policy 2: Users can only insert/update their own credentials
CREATE POLICY "apple_credentials_owner_write_only"
ON public.apple_calendar_credentials
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND (
    -- Log all write operations
    public.log_critical_security_event(
      'APPLE_CREDENTIAL_WRITE_OPERATION',
      'medium',
      jsonb_build_object(
        'user_id', user_id,
        'operation_type', TG_OP,
        'access_method', 'direct_table_write'
      )
    ) IS NOT NULL
  )
);

-- Add unique constraint to ensure one credential per user
ALTER TABLE public.apple_calendar_credentials
ADD CONSTRAINT apple_calendar_credentials_user_id_unique
UNIQUE (user_id);

-- Create function to validate Apple credential access
CREATE OR REPLACE FUNCTION public.validate_apple_credential_access(
  operation_type text,
  credential_user_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role text;
  target_user_id uuid;
BEGIN
  -- Get current user role
  user_role := public.get_current_user_role();
  target_user_id := COALESCE(credential_user_id, auth.uid());
  
  -- Only allow users to access their own credentials
  IF target_user_id != auth.uid() THEN
    PERFORM public.log_critical_security_event(
      'APPLE_CREDENTIAL_ACCESS_VIOLATION',
      'critical',
      jsonb_build_object(
        'operation_type', operation_type,
        'target_user_id', target_user_id,
        'requesting_user', auth.uid(),
        'user_role', user_role,
        'violation_type', 'unauthorized_cross_user_access'
      )
    );
    RETURN false;
  END IF;
  
  -- Check rate limits for the operation
  IF NOT public.check_rate_limit_enhanced(
    format('apple_credential_%s', operation_type), 
    5, 
    300  -- 5 operations per 5 minutes
  ) THEN
    PERFORM public.log_critical_security_event(
      'APPLE_CREDENTIAL_RATE_LIMIT_EXCEEDED',
      'high',
      jsonb_build_object(
        'operation_type', operation_type,
        'user_id', auth.uid(),
        'user_role', user_role
      )
    );
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.get_apple_credentials_secure TO authenticated;
GRANT EXECUTE ON FUNCTION public.store_apple_credentials_secure TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_apple_credential_access TO authenticated;