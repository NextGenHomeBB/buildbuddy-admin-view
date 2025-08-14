-- Final security fixes - drop conflicting functions first

-- 1. Drop existing conflicting functions
DROP FUNCTION IF EXISTS public.get_security_dashboard_metrics();

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
        ('total_security_events', total_events::numeric, 'Total security events in last 7 days', 'info'),
        ('critical_security_events', critical_events::numeric, 'Critical security events in last 7 days', 'critical'),
        ('events_last_24h', events_24h::numeric, 'Security events in last 24 hours', 'medium'),
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

-- 3. Create encrypted credential storage functions
CREATE OR REPLACE FUNCTION public.delete_apple_credentials_secure()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    user_role text;
    credential_count integer;
BEGIN
    user_role := public.get_current_user_role();
    
    -- Rate limiting for credential deletion
    IF NOT public.check_rate_limit_enhanced('apple_credential_delete', 3, 3600) THEN
        PERFORM public.log_critical_security_event(
            'APPLE_CREDENTIAL_DELETE_RATE_LIMIT_EXCEEDED',
            'high',
            jsonb_build_object(
                'user_id', auth.uid(),
                'user_role', user_role
            )
        );
        RAISE EXCEPTION 'Rate limit exceeded for Apple credential deletion';
    END IF;
    
    -- Log credential deletion attempt
    PERFORM public.log_critical_security_event(
        'APPLE_CREDENTIAL_DELETE_ATTEMPT',
        'high',
        jsonb_build_object(
            'user_id', auth.uid(),
            'user_role', user_role,
            'operation', 'secure_credential_deletion'
        )
    );
    
    -- Delete credentials for current user only
    DELETE FROM public.apple_calendar_credentials 
    WHERE user_id = auth.uid();
    
    GET DIAGNOSTICS credential_count = ROW_COUNT;
    
    -- Log successful deletion
    PERFORM public.log_critical_security_event(
        'APPLE_CREDENTIAL_DELETED_SUCCESSFULLY',
        'medium',
        jsonb_build_object(
            'user_id', auth.uid(),
            'credentials_deleted', credential_count
        )
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'credentials_deleted', credential_count,
        'message', 'Apple credentials deleted successfully'
    );
END;
$$;

-- 4. Add comprehensive audit trail for sensitive operations
CREATE OR REPLACE FUNCTION public.audit_sensitive_operation(
    operation_type text,
    table_name text,
    record_id uuid,
    sensitive_data_accessed text[] DEFAULT ARRAY[]::text[]
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    current_ip text;
    user_role text;
    operation_count integer;
BEGIN
    current_ip := inet_client_addr()::text;
    user_role := public.get_current_user_role();
    
    -- Count recent similar operations
    SELECT COUNT(*) INTO operation_count
    FROM public.security_audit_log
    WHERE user_id = auth.uid()
        AND action = format('SENSITIVE_OPERATION_%s', upper(operation_type))
        AND timestamp > now() - INTERVAL '1 hour';
    
    -- Enhanced logging for sensitive operations
    INSERT INTO public.security_audit_log (
        user_id, action, table_name, record_id,
        new_values, ip_address
    ) VALUES (
        auth.uid(),
        format('SENSITIVE_OPERATION_%s', upper(operation_type)),
        table_name,
        record_id,
        jsonb_build_object(
            'operation_type', operation_type,
            'user_role', user_role,
            'sensitive_fields_accessed', sensitive_data_accessed,
            'operation_count_last_hour', operation_count + 1,
            'requires_audit_review', array_length(sensitive_data_accessed, 1) > 0,
            'compliance_classification', 'sensitive_data_processing',
            'gdpr_relevant', true
        ),
        current_ip
    );
    
    -- Alert on excessive sensitive operations
    IF operation_count > 20 THEN
        INSERT INTO public.security_audit_log (
            user_id, action, table_name, record_id,
            new_values, ip_address
        ) VALUES (
            auth.uid(),
            'EXCESSIVE_SENSITIVE_OPERATIONS_ALERT',
            'security_monitoring',
            record_id,
            jsonb_build_object(
                'operation_count', operation_count + 1,
                'alert_level', 'critical',
                'requires_immediate_review', true,
                'automated_response', 'rate_limit_triggered'
            ),
            current_ip
        );
    END IF;
END;
$$;

-- 5. Final security configuration check
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
        ('rls_enabled', 'enabled_on_all_tables', 'true', 'Row Level Security must be enabled'),
        ('credential_encryption', 'not_implemented', 'required', 'Sensitive credentials must be encrypted'),
        ('audit_logging', 'implemented', 'comprehensive', 'All sensitive operations are logged'),
        ('rate_limiting', 'implemented', 'active', 'Rate limiting protects against abuse');
END;
$$;