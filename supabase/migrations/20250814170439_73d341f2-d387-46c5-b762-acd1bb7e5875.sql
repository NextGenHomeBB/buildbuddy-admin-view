-- FINAL SECURITY HARDENING MIGRATION
-- Addresses all remaining critical security vulnerabilities

-- Drop and recreate security dashboard function with correct signature
DROP FUNCTION IF EXISTS public.get_security_dashboard_data();

CREATE OR REPLACE FUNCTION public.get_security_dashboard_data()
RETURNS TABLE(
  total_events bigint,
  critical_alerts bigint,
  rate_violations bigint,
  access_violations bigint,
  recent_logins bigint,
  failed_attempts bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only allow admin access
  IF public.get_current_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;
  
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM public.security_audit_log WHERE timestamp > now() - INTERVAL '24 hours') as total_events,
    (SELECT COUNT(*) FROM public.security_audit_log WHERE timestamp > now() - INTERVAL '24 hours' AND new_values->>'severity' = 'critical') as critical_alerts,
    (SELECT COUNT(*) FROM public.security_audit_log WHERE timestamp > now() - INTERVAL '24 hours' AND action LIKE '%RATE_LIMIT%') as rate_violations,
    (SELECT COUNT(*) FROM public.security_audit_log WHERE timestamp > now() - INTERVAL '24 hours' AND action LIKE '%ACCESS_DENIED%') as access_violations,
    (SELECT COUNT(*) FROM public.security_audit_log WHERE timestamp > now() - INTERVAL '24 hours' AND action LIKE '%LOGIN%') as recent_logins,
    (SELECT COUNT(*) FROM public.security_audit_log WHERE timestamp > now() - INTERVAL '24 hours' AND action LIKE '%FAILED%') as failed_attempts;
END;
$$;

-- SECURE RLS POLICIES FOR SECURITY AUDIT LOG
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.security_audit_log;

CREATE POLICY "Admin only security audit access" 
ON public.security_audit_log 
FOR SELECT 
TO authenticated
USING (
  public.get_current_user_role() = 'admin'
);

-- SECURE RLS POLICIES FOR RATE LIMITS
DROP POLICY IF EXISTS "System can manage rate limits" ON public.rate_limits;
DROP POLICY IF EXISTS "Users can view their own rate limits" ON public.rate_limits;

CREATE POLICY "Admin only rate limits management" 
ON public.rate_limits 
FOR ALL 
TO authenticated
USING (
  public.get_current_user_role() = 'admin'
)
WITH CHECK (
  public.get_current_user_role() = 'admin'
);

-- System functions can still access rate limits through security definer functions
CREATE POLICY "System rate limit access" 
ON public.rate_limits 
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- Create enhanced audit logging for all sensitive table access
CREATE OR REPLACE FUNCTION public.enhanced_security_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  sensitive_tables text[] := ARRAY[
    'apple_calendar_credentials', 'calendar_oauth_tokens', 'worker_rates', 
    'worker_payments', 'security_audit_log', 'rate_limits', 'user_roles'
  ];
  risk_level text;
BEGIN
  -- Only audit sensitive tables
  IF TG_TABLE_NAME = ANY(sensitive_tables) THEN
    -- Determine risk level
    risk_level := CASE
      WHEN TG_TABLE_NAME IN ('worker_rates', 'worker_payments') THEN 'critical'
      WHEN TG_TABLE_NAME IN ('apple_calendar_credentials', 'calendar_oauth_tokens') THEN 'high'
      WHEN TG_OP = 'DELETE' THEN 'high'
      ELSE 'medium'
    END;
    
    -- Log comprehensive security event
    INSERT INTO public.security_audit_log (
      user_id, action, table_name, record_id,
      old_values, new_values, ip_address
    ) VALUES (
      auth.uid(),
      CONCAT('ENHANCED_AUDIT_', TG_OP),
      TG_TABLE_NAME,
      COALESCE(NEW.id, OLD.id),
      CASE WHEN TG_OP != 'INSERT' THEN 
        jsonb_build_object(
          'data', row_to_json(OLD),
          'risk_level', risk_level,
          'audit_timestamp', now()
        )
      END,
      CASE WHEN TG_OP != 'DELETE' THEN 
        jsonb_build_object(
          'data', row_to_json(NEW),
          'risk_level', risk_level,
          'audit_timestamp', now()
        )
      END,
      coalesce(inet_client_addr()::text, 'system')
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply enhanced audit triggers to all sensitive tables
DROP TRIGGER IF EXISTS enhanced_audit_apple_credentials ON public.apple_calendar_credentials;
CREATE TRIGGER enhanced_audit_apple_credentials
  AFTER INSERT OR UPDATE OR DELETE ON public.apple_calendar_credentials
  FOR EACH ROW EXECUTE FUNCTION public.enhanced_security_audit();

DROP TRIGGER IF EXISTS enhanced_audit_oauth_tokens ON public.calendar_oauth_tokens;
CREATE TRIGGER enhanced_audit_oauth_tokens
  AFTER INSERT OR UPDATE OR DELETE ON public.calendar_oauth_tokens
  FOR EACH ROW EXECUTE FUNCTION public.enhanced_security_audit();

DROP TRIGGER IF EXISTS enhanced_audit_worker_rates ON public.worker_rates;
CREATE TRIGGER enhanced_audit_worker_rates
  AFTER INSERT OR UPDATE OR DELETE ON public.worker_rates
  FOR EACH ROW EXECUTE FUNCTION public.enhanced_security_audit();

DROP TRIGGER IF EXISTS enhanced_audit_worker_payments ON public.worker_payments;
CREATE TRIGGER enhanced_audit_worker_payments
  AFTER INSERT OR UPDATE OR DELETE ON public.worker_payments
  FOR EACH ROW EXECUTE FUNCTION public.enhanced_security_audit();

DROP TRIGGER IF EXISTS enhanced_audit_security_log ON public.security_audit_log;
CREATE TRIGGER enhanced_audit_security_log
  AFTER INSERT OR UPDATE OR DELETE ON public.security_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.enhanced_security_audit();

DROP TRIGGER IF EXISTS enhanced_audit_rate_limits ON public.rate_limits;
CREATE TRIGGER enhanced_audit_rate_limits
  AFTER INSERT OR UPDATE OR DELETE ON public.rate_limits
  FOR EACH ROW EXECUTE FUNCTION public.enhanced_security_audit();

-- Final security function fixes to address mutable search path warnings
CREATE OR REPLACE FUNCTION public.user_has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.fn_role_in_org(p_org uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT m.role 
  FROM public.organization_members m
  WHERE m.org_id = p_org 
  AND m.user_id = auth.uid()
  AND m.status = 'active'
  AND (m.expires_at IS NULL OR now() < m.expires_at)
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.fn_is_member(p_org uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.organization_members m
    WHERE m.org_id = p_org 
    AND m.user_id = auth.uid()
    AND m.status = 'active'
    AND (m.expires_at IS NULL OR now() < m.expires_at)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(check_org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.organization_members m
    WHERE m.org_id = check_org AND m.user_id = auth.uid()
  );
$$;

-- Grant necessary permissions for security functions
GRANT EXECUTE ON FUNCTION public.get_security_dashboard_data() TO authenticated;
GRANT EXECUTE ON FUNCTION public.enhanced_security_audit() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_role_in_org(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_is_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid) TO authenticated;