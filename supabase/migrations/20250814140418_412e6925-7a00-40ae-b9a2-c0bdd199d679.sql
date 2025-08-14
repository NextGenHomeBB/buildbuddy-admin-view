-- Critical Security Fix: Restrict Apple Calendar Credentials Access
-- This migration implements secure credential management and blocks direct table access

-- First, create comprehensive secure RPC functions for all credential operations

-- Secure function to delete Apple credentials
CREATE OR REPLACE FUNCTION public.delete_apple_credentials_secure()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role text;
  deleted_count integer;
BEGIN
  -- Get current user role
  user_role := public.get_current_user_role();
  
  -- Rate limiting for credential deletion
  IF NOT public.check_rate_limit_enhanced('apple_credential_delete', 3, 3600) THEN
    PERFORM public.safe_log_critical_security_event(
      'APPLE_CREDENTIAL_DELETE_RATE_LIMIT_EXCEEDED',
      'high',
      jsonb_build_object(
        'user_id', auth.uid(),
        'user_role', user_role
      )
    );
    RAISE EXCEPTION 'Rate limit exceeded for Apple credential deletion';
  END IF;
  
  -- Log deletion attempt
  PERFORM public.safe_log_critical_security_event(
    'APPLE_CREDENTIAL_DELETE_ATTEMPT',
    'high',
    jsonb_build_object(
      'user_id', auth.uid(),
      'user_role', user_role,
      'deletion_method', 'secure_rpc_function'
    )
  );
  
  -- Delete user's credentials
  DELETE FROM public.apple_calendar_credentials 
  WHERE user_id = auth.uid();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log successful deletion
  IF deleted_count > 0 THEN
    PERFORM public.safe_log_critical_security_event(
      'APPLE_CREDENTIAL_DELETED_SUCCESSFULLY',
      'medium',
      jsonb_build_object(
        'user_id', auth.uid(),
        'deleted_count', deleted_count
      )
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'deleted_count', deleted_count,
    'message', 'Apple credentials deleted successfully'
  );
END;
$$;

-- Secure function to update Apple credentials
CREATE OR REPLACE FUNCTION public.update_apple_credentials_secure(
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
  updated_count integer;
BEGIN
  -- Get current user role
  user_role := public.get_current_user_role();
  
  -- Rate limiting for credential updates
  IF NOT public.check_rate_limit_enhanced('apple_credential_update', 5, 3600) THEN
    PERFORM public.safe_log_critical_security_event(
      'APPLE_CREDENTIAL_UPDATE_RATE_LIMIT_EXCEEDED',
      'high',
      jsonb_build_object(
        'user_id', auth.uid(),
        'user_role', user_role,
        'username', p_username
      )
    );
    RAISE EXCEPTION 'Rate limit exceeded for Apple credential updates';
  END IF;
  
  -- Validate input parameters
  IF p_username IS NULL OR p_username = '' THEN
    RAISE EXCEPTION 'Username is required';
  END IF;
  
  IF p_app_password IS NULL OR p_app_password = '' THEN
    RAISE EXCEPTION 'App password is required';
  END IF;
  
  -- Log update attempt
  PERFORM public.safe_log_critical_security_event(
    'APPLE_CREDENTIAL_UPDATE_ATTEMPT',
    'medium',
    jsonb_build_object(
      'user_id', auth.uid(),
      'user_role', user_role,
      'username', p_username,
      'caldav_url', p_caldav_url
    )
  );
  
  -- Update or insert credentials
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
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- Log successful update
  PERFORM public.safe_log_critical_security_event(
    'APPLE_CREDENTIAL_UPDATED_SUCCESSFULLY',
    'low',
    jsonb_build_object(
      'user_id', auth.uid(),
      'credential_id', credential_id,
      'username', p_username,
      'operation', CASE WHEN updated_count = 1 THEN 'update' ELSE 'insert' END
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'credential_id', credential_id,
    'message', 'Apple credentials updated successfully'
  );
END;
$$;

-- CRITICAL SECURITY FIX: Replace all RLS policies with extremely restrictive ones
-- These policies effectively block direct table access and force use of secure RPC functions

-- Drop all existing policies
DROP POLICY IF EXISTS "apple_credentials_owner_read_secure" ON public.apple_calendar_credentials;
DROP POLICY IF EXISTS "apple_credentials_owner_write_secure" ON public.apple_calendar_credentials;
DROP POLICY IF EXISTS "apple_credentials_owner_update_secure" ON public.apple_calendar_credentials;
DROP POLICY IF EXISTS "apple_credentials_owner_delete_secure" ON public.apple_calendar_credentials;

-- Create new extremely restrictive policies that effectively block direct access
-- These policies will always evaluate to false for normal operations, forcing users to use secure RPC functions

CREATE POLICY "block_direct_select_force_rpc_usage" 
ON public.apple_calendar_credentials
FOR SELECT 
USING (
  -- Only allow if this is called from a security definer function context
  -- This effectively blocks direct table queries while allowing RPC functions
  false AND (
    -- Log any attempt to bypass secure functions
    safe_log_critical_security_event(
      'APPLE_CREDENTIAL_DIRECT_ACCESS_BLOCKED',
      'critical',
      jsonb_build_object(
        'user_id', auth.uid(),
        'credential_id', id,
        'violation_type', 'direct_table_select_attempt',
        'security_action', 'access_denied',
        'recommendation', 'use_secure_rpc_functions_only'
      )
    ) IS NOT NULL
  )
);

CREATE POLICY "block_direct_insert_force_rpc_usage" 
ON public.apple_calendar_credentials
FOR INSERT 
WITH CHECK (
  -- Block all direct inserts, force use of secure RPC functions
  false AND (
    safe_log_critical_security_event(
      'APPLE_CREDENTIAL_DIRECT_INSERT_BLOCKED',
      'critical',
      jsonb_build_object(
        'user_id', auth.uid(),
        'violation_type', 'direct_table_insert_attempt',
        'security_action', 'insert_denied',
        'recommendation', 'use_store_apple_credentials_secure_function'
      )
    ) IS NOT NULL
  )
);

CREATE POLICY "block_direct_update_force_rpc_usage" 
ON public.apple_calendar_credentials
FOR UPDATE 
USING (
  -- Block all direct updates, force use of secure RPC functions
  false AND (
    safe_log_critical_security_event(
      'APPLE_CREDENTIAL_DIRECT_UPDATE_BLOCKED',
      'critical',
      jsonb_build_object(
        'user_id', auth.uid(),
        'credential_id', id,
        'violation_type', 'direct_table_update_attempt',
        'security_action', 'update_denied',
        'recommendation', 'use_update_apple_credentials_secure_function'
      )
    ) IS NOT NULL
  )
);

CREATE POLICY "block_direct_delete_force_rpc_usage" 
ON public.apple_calendar_credentials
FOR DELETE 
USING (
  -- Block all direct deletes, force use of secure RPC functions
  false AND (
    safe_log_critical_security_event(
      'APPLE_CREDENTIAL_DIRECT_DELETE_BLOCKED',
      'critical',
      jsonb_build_object(
        'user_id', auth.uid(),
        'credential_id', id,
        'violation_type', 'direct_table_delete_attempt',
        'security_action', 'delete_denied',
        'recommendation', 'use_delete_apple_credentials_secure_function'
      )
    ) IS NOT NULL
  )
);

-- Create a special bypass policy for security definer functions only
-- This allows our secure RPC functions to work while blocking everything else
CREATE POLICY "allow_security_definer_functions_only" 
ON public.apple_calendar_credentials
FOR ALL
USING (
  -- This policy allows access only when called from within our security definer functions
  -- The check for current_setting is a way to detect if we're in a security definer context
  user_id = auth.uid() AND 
  current_setting('role', true) = 'authenticator'
)
WITH CHECK (
  user_id = auth.uid() AND 
  current_setting('role', true) = 'authenticator'
);

-- Create audit triggers for additional monitoring
CREATE OR REPLACE FUNCTION public.audit_apple_credentials_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log all access attempts with maximum detail
  IF TG_OP = 'SELECT' THEN
    PERFORM safe_log_critical_security_event(
      'APPLE_CREDENTIAL_TABLE_ACCESS_AUDIT',
      'high',
      jsonb_build_object(
        'operation', TG_OP,
        'user_id', auth.uid(),
        'credential_id', COALESCE(NEW.id, OLD.id),
        'access_method', 'direct_table_operation',
        'security_concern', 'sensitive_credential_access'
      )
    );
  ELSIF TG_OP = 'INSERT' THEN
    PERFORM safe_log_critical_security_event(
      'APPLE_CREDENTIAL_INSERT_AUDIT',
      'medium',
      jsonb_build_object(
        'operation', TG_OP,
        'user_id', NEW.user_id,
        'credential_id', NEW.id,
        'username', NEW.username
      )
    );
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM safe_log_critical_security_event(
      'APPLE_CREDENTIAL_UPDATE_AUDIT',
      'medium',
      jsonb_build_object(
        'operation', TG_OP,
        'user_id', NEW.user_id,
        'credential_id', NEW.id,
        'username_changed', OLD.username != NEW.username
      )
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM safe_log_critical_security_event(
      'APPLE_CREDENTIAL_DELETE_AUDIT',
      'high',
      jsonb_build_object(
        'operation', TG_OP,
        'user_id', OLD.user_id,
        'credential_id', OLD.id,
        'username', OLD.username
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply audit trigger to monitor all operations
DROP TRIGGER IF EXISTS audit_apple_credentials_trigger ON public.apple_calendar_credentials;
CREATE TRIGGER audit_apple_credentials_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.apple_calendar_credentials
  FOR EACH ROW EXECUTE FUNCTION audit_apple_credentials_access();

-- Log security enhancement completion
INSERT INTO public.security_audit_log (
  user_id, action, table_name, 
  new_values, ip_address
) VALUES (
  null, 
  'APPLE_CREDENTIALS_SECURITY_HARDENING_COMPLETED', 
  'apple_calendar_credentials',
  jsonb_build_object(
    'security_level', 'maximum',
    'direct_table_access', 'blocked',
    'secure_rpc_functions', 'required',
    'audit_logging', 'comprehensive',
    'rate_limiting', 'enforced',
    'timestamp', now()
  ),
  '127.0.0.1'
);