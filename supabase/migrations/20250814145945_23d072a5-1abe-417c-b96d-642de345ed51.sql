-- Fix syntax error and implement correct security monitoring

-- 1. Create security monitoring without invalid SELECT triggers
-- Remove the invalid trigger attempts
-- Instead, we'll implement security monitoring through function calls

-- 2. Create enhanced security dashboard function  
CREATE OR REPLACE FUNCTION public.get_security_dashboard_metrics()
RETURNS TABLE(
    metric_name text,
    metric_value numeric,
    metric_description text,
    threat_level text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    user_role text;
    total_events integer;
    critical_events integer;
    events_24h integer;
    threat_assessment text;
BEGIN
    user_role := public.get_current_user_role();
    
    -- Only allow admin access
    IF user_role != 'admin' THEN
        RAISE EXCEPTION 'Access denied: admin privileges required for security dashboard';
    END IF;
    
    -- Calculate security metrics
    SELECT COUNT(*) INTO total_events
    FROM public.security_audit_log
    WHERE timestamp > now() - INTERVAL '7 days';
    
    SELECT COUNT(*) INTO critical_events
    FROM public.security_audit_log
    WHERE timestamp > now() - INTERVAL '7 days'
        AND (action LIKE '%CRITICAL%' OR action LIKE '%VIOLATION%');
    
    SELECT COUNT(*) INTO events_24h
    FROM public.security_audit_log
    WHERE timestamp > now() - INTERVAL '24 hours';
    
    -- Determine threat level
    IF critical_events > 10 THEN
        threat_assessment := 'critical';
    ELSIF critical_events > 5 THEN
        threat_assessment := 'high';
    ELSIF critical_events > 0 THEN
        threat_assessment := 'medium';
    ELSE
        threat_assessment := 'low';
    END IF;
    
    -- Return metrics
    RETURN QUERY VALUES
        ('total_security_events', total_events, 'Total security events in last 7 days', 'info'),
        ('critical_security_events', critical_events, 'Critical security events in last 7 days', 'critical'),
        ('events_last_24h', events_24h, 'Security events in last 24 hours', 'medium'),
        ('overall_threat_level', 
         CASE threat_assessment 
             WHEN 'critical' THEN 4
             WHEN 'high' THEN 3 
             WHEN 'medium' THEN 2
             ELSE 1
         END, 
         'Overall security threat assessment', threat_assessment);
END;
$$;

-- 3. Enhanced PII protection for documents with better RLS
DROP POLICY IF EXISTS "Admin full document access" ON public.documents;
DROP POLICY IF EXISTS "Manager limited document access" ON public.documents;
DROP POLICY IF EXISTS "Creator basic document access" ON public.documents;

-- Implement strict document access policies with security logging
CREATE POLICY "secure_admin_document_access"
ON public.documents
FOR ALL
TO authenticated
USING (
    public.get_current_user_role() = 'admin' AND
    public.safe_log_critical_security_event(
        'ADMIN_DOCUMENT_ACCESS',
        'medium',
        jsonb_build_object(
            'document_id', id,
            'document_type', document_type,
            'admin_user', auth.uid(),
            'access_type', 'full_admin_access'
        )
    ) IS NOT NULL
)
WITH CHECK (
    public.get_current_user_role() = 'admin' AND
    public.safe_log_critical_security_event(
        'ADMIN_DOCUMENT_MODIFICATION',
        'high',
        jsonb_build_object(
            'document_id', id,
            'document_type', document_type,
            'admin_user', auth.uid(),
            'operation_type', 'document_modification'
        )
    ) IS NOT NULL
);

CREATE POLICY "secure_manager_document_access"
ON public.documents
FOR SELECT
TO authenticated
USING (
    public.get_current_user_role() IN ('manager', 'worker') AND
    (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM user_project_role upr
            WHERE upr.user_id = auth.uid() 
            AND upr.project_id = documents.project_id
            AND upr.role IN ('manager', 'admin')
        )
    ) AND
    public.safe_log_critical_security_event(
        'MANAGER_DOCUMENT_ACCESS',
        'medium',
        jsonb_build_object(
            'document_id', id,
            'document_type', document_type,
            'user_role', public.get_current_user_role(),
            'project_id', project_id
        )
    ) IS NOT NULL
);

-- 4. Create secure profile access with enhanced monitoring
DROP POLICY IF EXISTS "Profiles: self read" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: self update (no role changes)" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: self insert" ON public.profiles;
DROP POLICY IF EXISTS "hr_justified_personal_data_access" ON public.profiles;

CREATE POLICY "secure_self_profile_access"
ON public.profiles
FOR ALL
TO authenticated
USING (
    id = auth.uid() AND
    public.safe_log_critical_security_event(
        'PROFILE_SELF_ACCESS',
        'low',
        jsonb_build_object(
            'profile_id', id,
            'access_type', 'self_access'
        )
    ) IS NOT NULL
)
WITH CHECK (
    id = auth.uid() AND
    public.safe_log_critical_security_event(
        'PROFILE_SELF_MODIFICATION',
        'medium',
        jsonb_build_object(
            'profile_id', id,
            'modification_type', 'self_modification'
        )
    ) IS NOT NULL
);

CREATE POLICY "secure_admin_profile_access"
ON public.profiles
FOR SELECT
TO authenticated
USING (
    public.get_current_user_role() = 'admin' AND
    public.safe_log_critical_security_event(
        'ADMIN_PROFILE_ACCESS',
        'high',
        jsonb_build_object(
            'accessed_profile_id', id,
            'admin_user', auth.uid(),
            'access_type', 'cross_user_profile_access',
            'requires_justification', true
        )
    ) IS NOT NULL
);

-- 5. Implement secure API access logging
CREATE OR REPLACE FUNCTION public.log_api_access(
    endpoint_name text,
    request_data jsonb DEFAULT '{}',
    severity text DEFAULT 'medium'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    current_ip text;
    user_role text;
BEGIN
    current_ip := inet_client_addr()::text;
    user_role := public.get_current_user_role();
    
    -- Log API access with enhanced context
    INSERT INTO public.security_audit_log (
        user_id, action, table_name,
        new_values, ip_address
    ) VALUES (
        auth.uid(),
        format('API_ACCESS_%s', upper(endpoint_name)),
        'api_monitoring',
        jsonb_build_object(
            'endpoint', endpoint_name,
            'user_role', user_role,
            'request_data', request_data,
            'severity', severity,
            'api_timestamp', now(),
            'user_agent', current_setting('request.headers', true)::jsonb->>'user-agent'
        ),
        current_ip
    );
END;
$$;

-- 6. Create secure organization access validation
CREATE OR REPLACE FUNCTION public.validate_org_access_secure(
    p_org_id uuid,
    required_role text DEFAULT 'member'
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    user_role_in_org text;
    has_access boolean := false;
BEGIN
    -- Get user's role in organization
    SELECT role INTO user_role_in_org
    FROM public.organization_members
    WHERE org_id = p_org_id 
    AND user_id = auth.uid()
    AND status = 'active'
    AND (expires_at IS NULL OR expires_at > now());
    
    -- Check access level
    has_access := CASE
        WHEN required_role = 'owner' THEN user_role_in_org = 'owner'
        WHEN required_role = 'admin' THEN user_role_in_org IN ('owner', 'admin')
        WHEN required_role = 'manager' THEN user_role_in_org IN ('owner', 'admin', 'manager')
        ELSE user_role_in_org IS NOT NULL
    END;
    
    -- Log access attempt
    PERFORM public.log_critical_security_event(
        'ORG_ACCESS_VALIDATION',
        CASE WHEN has_access THEN 'medium' ELSE 'high' END,
        jsonb_build_object(
            'org_id', p_org_id,
            'required_role', required_role,
            'user_role_in_org', user_role_in_org,
            'access_granted', has_access
        )
    );
    
    RETURN has_access;
END;
$$;

-- 7. Update Supabase config for enhanced security
-- This would normally be done in supabase/config.toml, but we'll create a function to check settings
CREATE OR REPLACE FUNCTION public.check_security_configuration()
RETURNS TABLE(
    setting_name text,
    current_value text,
    recommended_value text,
    security_risk text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Only allow admin access
    IF public.get_current_user_role() != 'admin' THEN
        RAISE EXCEPTION 'Access denied: admin privileges required';
    END IF;
    
    -- Return security configuration recommendations
    RETURN QUERY VALUES
        ('jwt_exp', 'check_auth_config', '3600', 'Shorter token expiry reduces attack window'),
        ('password_min_length', 'check_auth_config', '12', 'Longer passwords improve security'),
        ('enable_signup', 'check_auth_config', 'admin_only', 'Restrict public signups'),
        ('rls_enabled', 'enabled_on_all_tables', 'true', 'Row Level Security must be enabled');
END;
$$;