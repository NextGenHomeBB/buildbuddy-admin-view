-- Phase 4: Final Security Hardening Migration
-- Fix all remaining database security issues

-- 1. Fix function search paths to remove mutable 'pg_temp'
CREATE OR REPLACE FUNCTION public.fn_is_member(p_org uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 
    FROM public.organization_members m
    WHERE m.org_id = p_org 
    AND m.user_id = auth.uid()
    AND m.status = 'active'
    AND (m.expires_at IS NULL OR now() < m.expires_at)
  );
$function$;

CREATE OR REPLACE FUNCTION public.fn_role_in_org(p_org uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT m.role 
  FROM public.organization_members m
  WHERE m.org_id = p_org 
  AND m.user_id = auth.uid()
  AND m.status = 'active'
  AND (m.expires_at IS NULL OR now() < m.expires_at)
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT role::text 
  FROM public.user_roles 
  WHERE user_id = auth.uid() 
  ORDER BY 
    CASE role
      WHEN 'admin' THEN 1
      WHEN 'manager' THEN 2
      WHEN 'worker' THEN 3
    END
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.user_has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = _user_id AND role = _role
  );
$function$;

-- 2. Block materialized views from API access
REVOKE ALL ON public.project_costs_vw FROM anon, authenticated;
REVOKE ALL ON public.security_metrics_summary FROM anon, authenticated;

-- Grant limited access only to specific functions that need it
GRANT SELECT ON public.project_costs_vw TO postgres;
GRANT SELECT ON public.security_metrics_summary TO postgres;

-- 3. Add missing critical security functions
CREATE OR REPLACE FUNCTION public.check_rate_limit_enhanced(
  operation_name text, 
  max_attempts integer DEFAULT 5, 
  window_minutes integer DEFAULT 15
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  current_attempts integer;
  window_start_time timestamp with time zone;
  user_id_param uuid;
BEGIN
  user_id_param := auth.uid();
  
  -- Anonymous users get stricter limits
  IF user_id_param IS NULL THEN
    max_attempts := LEAST(max_attempts, 3);
    window_minutes := GREATEST(window_minutes, 60);
  END IF;
  
  window_start_time := now() - (window_minutes || ' minutes')::interval;
  
  -- Clean up old records
  DELETE FROM public.rate_limits 
  WHERE window_start < window_start_time;
  
  -- Count current attempts
  SELECT COALESCE(SUM(attempt_count), 0) INTO current_attempts
  FROM public.rate_limits
  WHERE user_id = user_id_param 
    AND operation = operation_name 
    AND window_start >= window_start_time;
  
  -- Check limit
  IF current_attempts >= max_attempts THEN
    -- Log rate limit violation
    INSERT INTO public.security_audit_log (
      user_id, action, table_name, new_values, ip_address
    ) VALUES (
      user_id_param, 'RATE_LIMIT_EXCEEDED', 'rate_limits',
      jsonb_build_object(
        'operation', operation_name,
        'attempts', current_attempts,
        'max_attempts', max_attempts,
        'window_minutes', window_minutes
      ),
      inet_client_addr()::text
    );
    RETURN false;
  END IF;
  
  -- Record this attempt
  INSERT INTO public.rate_limits (user_id, operation, attempt_count, window_start)
  VALUES (user_id_param, operation_name, 1, now())
  ON CONFLICT (user_id, operation) 
  DO UPDATE SET 
    attempt_count = public.rate_limits.attempt_count + 1,
    window_start = CASE 
      WHEN public.rate_limits.window_start < window_start_time THEN now()
      ELSE public.rate_limits.window_start
    END;
  
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_critical_security_event(
  event_type text, 
  severity text DEFAULT 'medium',
  details jsonb DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.security_audit_log (
    user_id, action, table_name, new_values, ip_address
  ) VALUES (
    auth.uid(), 
    CONCAT('CRITICAL_', UPPER(event_type)), 
    'security_events',
    jsonb_build_object(
      'severity', severity,
      'details', details,
      'timestamp', now(),
      'session_info', current_setting('request.jwt.claims', true)::jsonb
    ),
    inet_client_addr()::text
  );
  
  -- Auto-escalate critical events
  IF severity = 'critical' THEN
    RAISE WARNING 'CRITICAL SECURITY EVENT: % - Details: %', event_type, details;
  END IF;
END;
$function$;

-- 4. Strengthen RLS policies for sensitive tables

-- Fix apple_calendar_credentials policies
DROP POLICY IF EXISTS "allow_security_definer_functions_only" ON public.apple_calendar_credentials;

CREATE POLICY "Users can manage their own Apple credentials"
ON public.apple_calendar_credentials
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all Apple credentials"
ON public.apple_calendar_credentials
FOR SELECT
TO authenticated
USING (get_current_user_role() = 'admin');

-- Strengthen documents policies
CREATE POLICY "Managers can create documents for their projects"
ON public.documents
FOR INSERT
TO authenticated
WITH CHECK (
  get_current_user_role() = 'admin' OR
  (get_current_user_role() = 'manager' AND EXISTS (
    SELECT 1 FROM user_project_role upr
    WHERE upr.user_id = auth.uid() 
    AND upr.project_id = documents.project_id 
    AND upr.role IN ('manager', 'admin')
  ))
);

CREATE POLICY "Managers can update documents for their projects"
ON public.documents
FOR UPDATE
TO authenticated
USING (
  get_current_user_role() = 'admin' OR
  (get_current_user_role() = 'manager' AND EXISTS (
    SELECT 1 FROM user_project_role upr
    WHERE upr.user_id = auth.uid() 
    AND upr.project_id = documents.project_id 
    AND upr.role IN ('manager', 'admin')
  ))
)
WITH CHECK (
  get_current_user_role() = 'admin' OR
  (get_current_user_role() = 'manager' AND EXISTS (
    SELECT 1 FROM user_project_role upr
    WHERE upr.user_id = auth.uid() 
    AND upr.project_id = documents.project_id 
    AND upr.role IN ('manager', 'admin')
  ))
);

CREATE POLICY "Only admins can delete documents"
ON public.documents
FOR DELETE
TO authenticated
USING (get_current_user_role() = 'admin');

-- Strengthen invitations policies
CREATE POLICY "Restrict invitation updates to org admins only"
ON public.invitations
FOR UPDATE
TO authenticated
USING (fn_role_in_org(org_id) = ANY (ARRAY['owner', 'admin']))
WITH CHECK (fn_role_in_org(org_id) = ANY (ARRAY['owner', 'admin']));

CREATE POLICY "Only org admins can delete invitations"
ON public.invitations
FOR DELETE
TO authenticated
USING (fn_role_in_org(org_id) = ANY (ARRAY['owner', 'admin']));

-- Add missing worker_payments policies
CREATE POLICY "Admins can create worker payments"
ON public.worker_payments
FOR INSERT
TO authenticated
WITH CHECK (get_current_user_role() = 'admin');

CREATE POLICY "Admins can update worker payments"
ON public.worker_payments
FOR UPDATE
TO authenticated
USING (get_current_user_role() = 'admin')
WITH CHECK (get_current_user_role() = 'admin');

-- Strengthen profiles policies
CREATE POLICY "Only admins can delete profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (get_current_user_role() = 'admin');

-- 5. Add comprehensive audit triggers for sensitive operations
CREATE OR REPLACE FUNCTION public.enhanced_security_audit_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  sensitive_tables text[] := ARRAY[
    'user_roles', 'user_project_role', 'profiles', 'documents', 
    'document_payments', 'apple_calendar_credentials', 'calendar_oauth_tokens',
    'worker_payments', 'phase_expenses', 'invitations', 'organization_members'
  ];
  operation_risk text;
BEGIN
  -- Only audit sensitive tables
  IF NOT (TG_TABLE_NAME = ANY(sensitive_tables)) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Determine risk level based on operation and table
  operation_risk := CASE
    WHEN TG_TABLE_NAME IN ('user_roles', 'organization_members') THEN 'critical'
    WHEN TG_TABLE_NAME IN ('apple_calendar_credentials', 'calendar_oauth_tokens') THEN 'high'
    WHEN TG_OP = 'DELETE' THEN 'high'
    ELSE 'medium'
  END;
  
  -- Log with enhanced context
  INSERT INTO public.security_audit_log (
    user_id, action, table_name, record_id, 
    old_values, new_values, ip_address
  ) VALUES (
    auth.uid(),
    format('ENHANCED_AUDIT_%s', TG_OP),
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP != 'INSERT' THEN row_to_json(OLD) END,
    CASE WHEN TG_OP != 'DELETE' THEN 
      jsonb_build_object(
        'data', row_to_json(NEW),
        'risk_level', operation_risk,
        'audit_timestamp', now()
      )
    END,
    inet_client_addr()::text
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Apply enhanced audit trigger to all sensitive tables
DO $$
DECLARE
  table_name text;
  sensitive_tables text[] := ARRAY[
    'user_roles', 'user_project_role', 'profiles', 'documents', 
    'document_payments', 'apple_calendar_credentials', 'calendar_oauth_tokens',
    'worker_payments', 'phase_expenses', 'invitations', 'organization_members'
  ];
BEGIN
  FOREACH table_name IN ARRAY sensitive_tables
  LOOP
    -- Drop existing trigger if it exists
    EXECUTE format('DROP TRIGGER IF EXISTS enhanced_security_audit_trigger ON public.%I', table_name);
    
    -- Create new enhanced trigger
    EXECUTE format('
      CREATE TRIGGER enhanced_security_audit_trigger
      AFTER INSERT OR UPDATE OR DELETE ON public.%I
      FOR EACH ROW EXECUTE FUNCTION public.enhanced_security_audit_trigger()
    ', table_name);
  END LOOP;
END $$;

-- 6. Create security monitoring functions for admins
CREATE OR REPLACE FUNCTION public.get_security_dashboard_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  result jsonb;
BEGIN
  -- Only admins can access security dashboard
  IF get_current_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Access denied: insufficient permissions';
  END IF;
  
  -- Rate limit dashboard access
  IF NOT check_rate_limit_enhanced('security_dashboard_access', 10, 60) THEN
    RAISE EXCEPTION 'Rate limit exceeded for security dashboard access';
  END IF;
  
  SELECT jsonb_build_object(
    'failed_logins_24h', (
      SELECT COUNT(*) FROM security_audit_log 
      WHERE action LIKE '%LOGIN_FAILED%' 
      AND timestamp > now() - INTERVAL '24 hours'
    ),
    'suspicious_activities_24h', (
      SELECT COUNT(*) FROM security_audit_log 
      WHERE action LIKE '%SUSPICIOUS%' 
      AND timestamp > now() - INTERVAL '24 hours'
    ),
    'rate_limit_violations_24h', (
      SELECT COUNT(*) FROM security_audit_log 
      WHERE action = 'RATE_LIMIT_EXCEEDED' 
      AND timestamp > now() - INTERVAL '24 hours'
    ),
    'critical_events_24h', (
      SELECT COUNT(*) FROM security_audit_log 
      WHERE action LIKE 'CRITICAL_%' 
      AND timestamp > now() - INTERVAL '24 hours'
    ),
    'credential_access_attempts_24h', (
      SELECT COUNT(*) FROM security_audit_log 
      WHERE action LIKE '%CREDENTIAL%' 
      AND timestamp > now() - INTERVAL '24 hours'
    )
  ) INTO result;
  
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_audit_trail_secure(
  p_user_id uuid DEFAULT NULL,
  p_action text DEFAULT NULL,
  p_start_date timestamp with time zone DEFAULT (now() - INTERVAL '7 days'),
  p_end_date timestamp with time zone DEFAULT now(),
  p_limit integer DEFAULT 100
)
RETURNS TABLE(
  id uuid, timestamp timestamp with time zone, user_id uuid,
  action text, table_name text, ip_address text, details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Only admins can access audit trail
  IF get_current_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Access denied: insufficient permissions';
  END IF;
  
  -- Rate limit audit trail access
  IF NOT check_rate_limit_enhanced('audit_trail_access', 20, 60) THEN
    RAISE EXCEPTION 'Rate limit exceeded for audit trail access';
  END IF;
  
  -- Limit query scope
  p_limit := LEAST(p_limit, 1000);
  
  RETURN QUERY
  SELECT 
    sal.id, sal.timestamp, sal.user_id, sal.action, sal.table_name, 
    sal.ip_address, sal.new_values as details
  FROM security_audit_log sal
  WHERE sal.timestamp BETWEEN p_start_date AND p_end_date
    AND (p_user_id IS NULL OR sal.user_id = p_user_id)
    AND (p_action IS NULL OR sal.action ILIKE '%' || p_action || '%')
  ORDER BY sal.timestamp DESC
  LIMIT p_limit;
END;
$function$;

-- 7. Final security validations and constraints
-- Ensure rate_limits table has proper constraints
ALTER TABLE public.rate_limits 
ADD CONSTRAINT IF NOT EXISTS rate_limits_attempt_count_positive 
CHECK (attempt_count > 0);

ALTER TABLE public.rate_limits 
ADD CONSTRAINT IF NOT EXISTS rate_limits_operation_not_empty 
CHECK (length(operation) > 0);

-- Create index for better security audit performance
CREATE INDEX IF NOT EXISTS idx_security_audit_log_timestamp_action 
ON public.security_audit_log (timestamp DESC, action);

CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_timestamp 
ON public.security_audit_log (user_id, timestamp DESC);

-- Log completion of security hardening
INSERT INTO public.security_audit_log (
  user_id, action, table_name, new_values, ip_address
) VALUES (
  auth.uid(), 'SECURITY_HARDENING_COMPLETED', 'system',
  jsonb_build_object(
    'phase', 4,
    'description', 'Final database security hardening migration completed',
    'timestamp', now(),
    'fixes_applied', jsonb_build_array(
      'fixed_function_search_paths',
      'blocked_materialized_view_api_access',
      'strengthened_rls_policies',
      'added_security_functions',
      'enhanced_audit_triggers'
    )
  ),
  inet_client_addr()::text
);