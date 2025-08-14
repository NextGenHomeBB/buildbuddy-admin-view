-- Phase 1: Critical Data Protection Fixes

-- 1. Add RLS policies to unprotected views and tables
ALTER TABLE public.phase_costs_vw ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and project managers can view phase costs"
ON public.phase_costs_vw
FOR SELECT
USING (
  get_current_user_role() = 'admin' OR
  EXISTS (
    SELECT 1 FROM public.user_project_role upr
    WHERE upr.user_id = auth.uid() 
    AND upr.project_id = phase_costs_vw.project_id
    AND upr.role IN ('manager', 'admin')
  )
);

ALTER TABLE public.security_monitor_vw ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin only access to security monitoring"
ON public.security_monitor_vw
FOR SELECT
USING (get_current_user_role() = 'admin');

ALTER TABLE public.secure_customer_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage secure customer data"
ON public.secure_customer_data
FOR ALL
USING (get_current_user_role() = 'admin');

-- 2. Enhanced credential security with audit triggers
CREATE OR REPLACE FUNCTION public.audit_calendar_credential_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Update access tracking
  NEW.last_accessed = now();
  NEW.access_count = COALESCE(OLD.access_count, 0) + 1;
  
  -- Log access attempt with enhanced security context
  INSERT INTO public.security_audit_log (
    user_id, action, table_name, record_id, 
    new_values, ip_address
  ) VALUES (
    auth.uid(), 'CREDENTIAL_ACCESS', 'apple_calendar_credentials', NEW.id,
    jsonb_build_object(
      'access_count', NEW.access_count,
      'access_time', NEW.last_accessed,
      'credential_type', 'apple_calendar',
      'security_level', 'high'
    ),
    inet_client_addr()::text
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Apply enhanced audit trigger to calendar credentials
DROP TRIGGER IF EXISTS audit_credential_access ON public.apple_calendar_credentials;
CREATE TRIGGER audit_credential_access
  BEFORE UPDATE ON public.apple_calendar_credentials
  FOR EACH ROW EXECUTE FUNCTION public.audit_calendar_credential_access();

-- 3. Enhanced OAuth token monitoring
CREATE OR REPLACE FUNCTION public.enhanced_token_monitoring()
RETURNS TRIGGER AS $$
DECLARE
  current_ip text;
  usage_rate numeric;
  recent_ip_count integer;
BEGIN
  current_ip := inet_client_addr()::text;
  
  -- Update usage tracking
  NEW.last_used = now();
  NEW.usage_count = COALESCE(OLD.usage_count, 0) + 1;
  NEW.last_ip = current_ip;
  
  -- Check for suspicious activity patterns
  IF OLD.last_ip IS NOT NULL AND OLD.last_ip != current_ip THEN
    -- Count distinct IPs in last hour
    SELECT COUNT(DISTINCT ip_address) INTO recent_ip_count
    FROM public.security_audit_log
    WHERE user_id = NEW.user_id
      AND action = 'TOKEN_USAGE'
      AND timestamp > now() - INTERVAL '1 hour';
    
    -- Flag high-risk activity
    IF recent_ip_count > 3 THEN
      NEW.suspicious_activity = true;
      
      -- Log high-risk security event
      INSERT INTO public.security_audit_log (
        user_id, action, table_name, record_id, 
        new_values, ip_address
      ) VALUES (
        NEW.user_id, 'HIGH_RISK_TOKEN_USAGE', 'calendar_oauth_tokens', NEW.id,
        jsonb_build_object(
          'ip_count', recent_ip_count,
          'current_ip', current_ip,
          'previous_ip', OLD.last_ip,
          'threat_level', 'high',
          'auto_flagged', true
        ),
        current_ip
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Apply enhanced monitoring to OAuth tokens
DROP TRIGGER IF EXISTS monitor_token_usage ON public.calendar_oauth_tokens;
CREATE TRIGGER monitor_token_usage
  BEFORE UPDATE ON public.calendar_oauth_tokens
  FOR EACH ROW EXECUTE FUNCTION public.enhanced_token_monitoring();

-- 4. Strengthen document RLS with field-level protection
DROP POLICY IF EXISTS "Enhanced document access control" ON public.documents;

CREATE POLICY "Enhanced document access with field protection"
ON public.documents
FOR ALL
USING (
  get_current_user_role() = 'admin' OR
  (
    get_current_user_role() = 'manager' AND 
    EXISTS (
      SELECT 1 FROM user_project_role upr
      WHERE upr.user_id = auth.uid() 
      AND upr.project_id = documents.project_id 
      AND upr.role IN ('manager', 'admin')
    )
  ) OR
  created_by = auth.uid()
)
WITH CHECK (
  get_current_user_role() = 'admin' OR
  (
    get_current_user_role() = 'manager' AND 
    EXISTS (
      SELECT 1 FROM user_project_role upr
      WHERE upr.user_id = auth.uid() 
      AND upr.project_id = documents.project_id 
      AND upr.role IN ('manager', 'admin')
    )
  ) OR
  created_by = auth.uid()
);

-- 5. Add additional security validation function
CREATE OR REPLACE FUNCTION public.validate_sensitive_data_access(
  table_name text,
  operation text,
  user_role text DEFAULT NULL
) RETURNS boolean AS $$
DECLARE
  current_role text;
BEGIN
  -- Get current user role if not provided
  current_role := COALESCE(user_role, get_current_user_role());
  
  -- Log data access attempt
  INSERT INTO public.security_audit_log (
    user_id, action, table_name, 
    new_values, ip_address
  ) VALUES (
    auth.uid(), 
    format('SENSITIVE_DATA_ACCESS_%s', upper(operation)), 
    table_name,
    jsonb_build_object(
      'user_role', current_role,
      'operation', operation,
      'access_time', now(),
      'validation_result', current_role = 'admin'
    ),
    inet_client_addr()::text
  );
  
  -- Only admins can access sensitive data by default
  RETURN current_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';