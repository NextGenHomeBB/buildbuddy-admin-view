-- Phase 1: Critical Security Fixes (Fixed syntax)

-- 1. Create secure access functions for views instead of RLS on views
CREATE OR REPLACE FUNCTION public.get_security_monitor_data()
RETURNS TABLE(
  id uuid, user_id uuid, user_name text, action text,
  event_category text, severity_level text, table_name text,
  event_timestamp timestamp with time zone, ip_address text
) AS $$
BEGIN
  -- Only admins can access security monitoring data
  IF get_current_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Access denied: admin privileges required';
  END IF;

  RETURN QUERY
  SELECT smv.id, smv.user_id, smv.user_name, smv.action,
         smv.event_category, smv.severity_level, smv.table_name,
         smv.timestamp as event_timestamp, smv.ip_address
  FROM security_monitor_vw smv
  ORDER BY smv.timestamp DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- 2. Secure the secure_customer_data table with RLS
ALTER TABLE public.secure_customer_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin only access to secure customer data"
ON public.secure_customer_data
FOR ALL
USING (get_current_user_role() = 'admin')
WITH CHECK (get_current_user_role() = 'admin');

-- 3. Enhanced credential security audit
CREATE OR REPLACE FUNCTION public.enhanced_credential_audit()
RETURNS TRIGGER AS $$
BEGIN
  -- Update access tracking
  NEW.last_accessed = now();
  NEW.access_count = COALESCE(OLD.access_count, 0) + 1;
  
  -- Log high-priority access attempt
  INSERT INTO public.security_audit_log (
    user_id, action, table_name, record_id, 
    new_values, ip_address
  ) VALUES (
    auth.uid(), 'CREDENTIAL_ACCESS_HIGH_RISK', 'apple_calendar_credentials', NEW.id,
    jsonb_build_object(
      'access_count', NEW.access_count,
      'access_time', NEW.last_accessed,
      'credential_type', 'apple_calendar',
      'security_level', 'critical'
    ),
    inet_client_addr()::text
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Apply enhanced audit to Apple calendar credentials
DROP TRIGGER IF EXISTS enhanced_credential_audit ON public.apple_calendar_credentials;
CREATE TRIGGER enhanced_credential_audit
  BEFORE UPDATE ON public.apple_calendar_credentials
  FOR EACH ROW EXECUTE FUNCTION public.enhanced_credential_audit();

-- 4. Enhanced OAuth token security monitoring
CREATE OR REPLACE FUNCTION public.monitor_oauth_security()
RETURNS TRIGGER AS $$
DECLARE
  current_ip text;
  recent_access_count integer;
BEGIN
  current_ip := inet_client_addr()::text;
  
  -- Update usage tracking
  NEW.last_used = now();
  NEW.usage_count = COALESCE(OLD.usage_count, 0) + 1;
  NEW.last_ip = current_ip;
  
  -- Check for suspicious patterns
  IF OLD.last_ip IS NOT NULL AND OLD.last_ip != current_ip THEN
    -- Count recent access from different IPs
    SELECT COUNT(DISTINCT ip_address) INTO recent_access_count
    FROM public.security_audit_log
    WHERE user_id = NEW.user_id
      AND action LIKE '%TOKEN%'
      AND timestamp > now() - INTERVAL '1 hour';
    
    -- Flag high-risk activity
    IF recent_access_count > 2 THEN
      NEW.suspicious_activity = true;
      
      -- Log critical security event
      INSERT INTO public.security_audit_log (
        user_id, action, table_name, record_id, 
        new_values, ip_address
      ) VALUES (
        NEW.user_id, 'CRITICAL_TOKEN_SECURITY_VIOLATION', 'calendar_oauth_tokens', NEW.id,
        jsonb_build_object(
          'distinct_ips', recent_access_count,
          'current_ip', current_ip,
          'previous_ip', OLD.last_ip,
          'threat_level', 'critical',
          'auto_flagged', true
        ),
        current_ip
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Apply OAuth monitoring
DROP TRIGGER IF EXISTS monitor_oauth_security ON public.calendar_oauth_tokens;
CREATE TRIGGER monitor_oauth_security
  BEFORE UPDATE ON public.calendar_oauth_tokens
  FOR EACH ROW EXECUTE FUNCTION public.monitor_oauth_security();

-- 5. Create comprehensive security monitoring function
CREATE OR REPLACE FUNCTION public.log_critical_security_event(
  event_type text,
  threat_level text DEFAULT 'high',
  details jsonb DEFAULT '{}',
  auto_response text DEFAULT NULL
) RETURNS void AS $$
BEGIN
  -- Log the critical event
  INSERT INTO public.security_audit_log (
    user_id, action, table_name,
    new_values, ip_address
  ) VALUES (
    auth.uid(), 
    format('CRITICAL_SECURITY_%s', upper(event_type)), 
    'security_events',
    jsonb_build_object(
      'threat_level', threat_level,
      'details', details,
      'auto_response', auto_response,
      'event_timestamp', now(),
      'investigation_required', threat_level = 'critical'
    ),
    inet_client_addr()::text
  );
  
  -- Auto-escalate critical threats
  IF threat_level = 'critical' THEN
    RAISE WARNING 'CRITICAL SECURITY THREAT DETECTED: % - Details: %', event_type, details;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- 6. Strengthen documents table RLS policy
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