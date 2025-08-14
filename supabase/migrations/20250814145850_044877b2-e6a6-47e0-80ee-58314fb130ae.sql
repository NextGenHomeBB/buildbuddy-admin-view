-- Fix function error and continue security implementation

-- 1. Drop existing function to fix return type issue
DROP FUNCTION IF EXISTS public.safe_log_critical_security_event(text, text, jsonb);

-- 2. Recreate the function with correct return type
CREATE OR REPLACE FUNCTION public.safe_log_critical_security_event(
    event_type text,
    severity text DEFAULT 'medium',
    details jsonb DEFAULT '{}'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    BEGIN
        PERFORM public.log_critical_security_event(event_type, severity, details);
        RETURN jsonb_build_object('success', true, 'logged', true);
    EXCEPTION WHEN OTHERS THEN
        -- If logging fails, still return a result to prevent policy failures
        RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'logged', false);
    END;
END;
$$;

-- 3. Enhance document security with data masking
CREATE OR REPLACE FUNCTION public.secure_document_data_with_masking(
    p_document_id uuid DEFAULT NULL,
    p_project_id uuid DEFAULT NULL,
    p_document_type text DEFAULT NULL
) RETURNS TABLE(
    id uuid,
    document_number text,
    document_type text,
    status text,
    client_name text,
    client_email text,
    client_phone text,
    client_address text,
    total_amount numeric,
    project_id uuid,
    created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    user_role text;
    has_project_access boolean := false;
BEGIN
    user_role := public.get_current_user_role();
    
    -- Enhanced rate limiting
    IF NOT public.check_rate_limit_enhanced('document_data_access', 15, 60) THEN
        PERFORM public.log_critical_security_event(
            'DOCUMENT_DATA_RATE_LIMIT_EXCEEDED',
            'high',
            jsonb_build_object(
                'user_role', user_role,
                'document_id', p_document_id,
                'project_id', p_project_id
            )
        );
        RAISE EXCEPTION 'Rate limit exceeded for document data access';
    END IF;
    
    -- Check project access for non-admin users
    IF user_role != 'admin' AND p_project_id IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM user_project_role upr
            WHERE upr.user_id = auth.uid() 
            AND upr.project_id = p_project_id
            AND upr.role IN ('manager', 'admin')
        ) INTO has_project_access;
    END IF;
    
    -- Log access attempt
    PERFORM public.log_critical_security_event(
        'DOCUMENT_SECURE_ACCESS_WITH_MASKING',
        'medium',
        jsonb_build_object(
            'user_role', user_role,
            'document_id', p_document_id,
            'project_id', p_project_id,
            'has_project_access', has_project_access
        )
    );
    
    -- Return data with role-based masking
    RETURN QUERY
    SELECT 
        d.id,
        d.document_number,
        d.document_type,
        d.status,
        -- Enhanced PII masking
        CASE
            WHEN user_role = 'admin' THEN d.client_name
            WHEN has_project_access THEN concat(left(d.client_name, 2), '***')
            ELSE '***RESTRICTED***'
        END AS client_name,
        CASE
            WHEN user_role = 'admin' THEN d.client_email
            WHEN has_project_access THEN concat(left(split_part(d.client_email, '@', 1), 1), '***@***')
            ELSE '***@***.***'
        END AS client_email,
        CASE
            WHEN user_role = 'admin' THEN d.client_phone
            WHEN has_project_access THEN concat('***', right(d.client_phone, 3))
            ELSE '***-***-***'
        END AS client_phone,
        CASE
            WHEN user_role = 'admin' THEN d.client_address
            ELSE '*** CLASSIFIED ***'
        END AS client_address,
        CASE
            WHEN user_role = 'admin' OR has_project_access THEN d.total_amount
            ELSE NULL::numeric
        END AS total_amount,
        d.project_id,
        d.created_at
    FROM public.documents d
    WHERE 
        (user_role = 'admin' OR 
         d.created_by = auth.uid() OR 
         (p_project_id IS NOT NULL AND has_project_access))
        AND (p_document_id IS NULL OR d.id = p_document_id)
        AND (p_project_id IS NULL OR d.project_id = p_project_id)
        AND (p_document_type IS NULL OR d.document_type = p_document_type)
    ORDER BY d.created_at DESC;
END;
$$;

-- 4. Enhanced security monitoring triggers
CREATE OR REPLACE FUNCTION public.monitor_sensitive_data_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    current_ip text;
    access_count integer;
BEGIN
    current_ip := inet_client_addr()::text;
    
    -- Count recent access to this sensitive table
    SELECT COUNT(*) INTO access_count
    FROM public.security_audit_log
    WHERE user_id = auth.uid()
        AND table_name = TG_TABLE_NAME
        AND action = 'SENSITIVE_DATA_ACCESS'
        AND timestamp > now() - INTERVAL '1 hour';
    
    -- Log sensitive data access
    INSERT INTO public.security_audit_log (
        user_id, action, table_name, record_id,
        new_values, ip_address
    ) VALUES (
        auth.uid(), 'SENSITIVE_DATA_ACCESS', TG_TABLE_NAME, 
        COALESCE(NEW.id, OLD.id),
        jsonb_build_object(
            'access_count_last_hour', access_count + 1,
            'access_method', 'direct_table_access',
            'security_level', 'high_sensitivity',
            'requires_monitoring', true
        ),
        current_ip
    );
    
    -- Alert on excessive access
    IF access_count > 10 THEN
        INSERT INTO public.security_audit_log (
            user_id, action, table_name, record_id,
            new_values, ip_address
        ) VALUES (
            auth.uid(), 'EXCESSIVE_SENSITIVE_DATA_ACCESS', TG_TABLE_NAME,
            COALESCE(NEW.id, OLD.id),
            jsonb_build_object(
                'access_count', access_count + 1,
                'threshold_exceeded', true,
                'alert_level', 'critical',
                'requires_investigation', true
            ),
            current_ip
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- 5. Add monitoring triggers to sensitive tables
DROP TRIGGER IF EXISTS monitor_profiles_access ON public.profiles;
CREATE TRIGGER monitor_profiles_access
    AFTER SELECT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.monitor_sensitive_data_access();

DROP TRIGGER IF EXISTS monitor_document_access ON public.documents;
CREATE TRIGGER monitor_document_access
    AFTER SELECT ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION public.monitor_sensitive_data_access();

-- 6. Create secure authentication monitoring
CREATE OR REPLACE FUNCTION public.monitor_auth_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    current_ip text;
    recent_failures integer;
BEGIN
    current_ip := inet_client_addr()::text;
    
    -- Count recent failed attempts from this IP
    SELECT COUNT(*) INTO recent_failures
    FROM public.security_audit_log
    WHERE ip_address = current_ip
        AND action LIKE '%FAILED%'
        AND timestamp > now() - INTERVAL '15 minutes';
    
    -- Log authentication event
    INSERT INTO public.security_audit_log (
        user_id, action, table_name,
        new_values, ip_address
    ) VALUES (
        COALESCE(NEW.user_id, OLD.user_id), 
        'AUTH_EVENT_MONITOR', 
        'auth_monitoring',
        jsonb_build_object(
            'event_type', TG_OP,
            'recent_failures_from_ip', recent_failures,
            'monitoring_timestamp', now(),
            'security_context', 'authentication'
        ),
        current_ip
    );
    
    -- Alert on suspicious activity
    IF recent_failures > 5 THEN
        INSERT INTO public.security_audit_log (
            user_id, action, table_name,
            new_values, ip_address
        ) VALUES (
            COALESCE(NEW.user_id, OLD.user_id),
            'SUSPICIOUS_AUTH_ACTIVITY',
            'auth_security_alert',
            jsonb_build_object(
                'failure_count', recent_failures,
                'alert_level', 'high',
                'requires_blocking', true,
                'ip_address', current_ip
            ),
            current_ip
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- 7. Fix database configuration security issues
-- Update auth settings for better security
UPDATE auth.config SET 
    value = '3600'  -- Reduce from default 24 hours to 1 hour
WHERE parameter = 'otp_expiry';

-- 8. Create security dashboard function
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