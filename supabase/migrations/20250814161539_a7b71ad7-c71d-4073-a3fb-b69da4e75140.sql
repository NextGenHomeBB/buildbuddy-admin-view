-- PHASE 2 CORRECTED: Fix remaining security issues without view RLS errors

-- 1. Drop the problematic view since we can't apply RLS to views
DROP VIEW IF EXISTS public.security_summary;

-- 2. Block materialized views if they exist (check for actual materialized views)
DO $$
DECLARE
    mv_record RECORD;
BEGIN
    -- Find all materialized views and create blocking policies if possible
    FOR mv_record IN
        SELECT schemaname, matviewname
        FROM pg_matviews
        WHERE schemaname = 'public'
    LOOP
        -- We can't enable RLS on materialized views, but we can document them
        RAISE NOTICE 'Found materialized view: %.% - Access should be controlled via application logic', mv_record.schemaname, mv_record.matviewname;
    END LOOP;
END $$;

-- 3. Create comprehensive security dashboard function (replacement for the view)
CREATE OR REPLACE FUNCTION public.get_security_dashboard_data()
RETURNS TABLE(
    total_security_events bigint,
    critical_events_24h bigint,
    rate_limit_violations bigint,
    suspicious_login_attempts bigint,
    data_access_violations bigint,
    top_threat_types text[],
    recent_violations jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Only admins can access security dashboard
    IF public.get_current_user_role() != 'admin' THEN
        RAISE EXCEPTION 'Access denied: security dashboard requires administrator privileges';
    END IF;
    
    -- Log dashboard access
    PERFORM public.log_critical_security_event(
        'SECURITY_DASHBOARD_ACCESS',
        'low',
        jsonb_build_object(
            'access_time', now(),
            'admin_user', auth.uid(),
            'ip_address', inet_client_addr()::text
        )
    );
    
    RETURN QUERY
    SELECT 
        -- Total security events in last 30 days
        COUNT(*) as total_security_events,
        
        -- Critical events in last 24 hours
        COUNT(*) FILTER (
            WHERE new_values->>'severity' = 'critical' 
            AND timestamp > now() - INTERVAL '24 hours'
        ) as critical_events_24h,
        
        -- Rate limit violations in last 7 days
        COUNT(*) FILTER (
            WHERE action = 'RATE_LIMIT_EXCEEDED' 
            AND timestamp > now() - INTERVAL '7 days'
        ) as rate_limit_violations,
        
        -- Suspicious login attempts in last 7 days
        COUNT(*) FILTER (
            WHERE action LIKE '%SUSPICIOUS%' 
            AND timestamp > now() - INTERVAL '7 days'
        ) as suspicious_login_attempts,
        
        -- Data access violations in last 7 days
        COUNT(*) FILTER (
            WHERE action LIKE '%UNAUTHORIZED%' 
            AND timestamp > now() - INTERVAL '7 days'
        ) as data_access_violations,
        
        -- Top threat types
        ARRAY_AGG(DISTINCT action ORDER BY action) as top_threat_types,
        
        -- Recent violations (last 10)
        jsonb_agg(
            jsonb_build_object(
                'action', action,
                'timestamp', timestamp,
                'severity', new_values->>'severity',
                'user_id', user_id,
                'ip_address', ip_address
            ) ORDER BY timestamp DESC
        ) FILTER (WHERE timestamp > now() - INTERVAL '24 hours') as recent_violations
        
    FROM public.security_audit_log
    WHERE timestamp > now() - INTERVAL '30 days';
END;
$$;

-- 4. Create function to handle materialized view access control
CREATE OR REPLACE FUNCTION public.check_materialized_view_access(view_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Log materialized view access attempt
    PERFORM public.log_critical_security_event(
        'MATERIALIZED_VIEW_ACCESS_ATTEMPT',
        'medium',
        jsonb_build_object(
            'view_name', view_name,
            'user_role', public.get_current_user_role(),
            'access_time', now()
        )
    );
    
    -- Only admins can access materialized views
    IF public.get_current_user_role() != 'admin' THEN
        RAISE EXCEPTION 'Access denied: materialized view access requires administrator privileges';
    END IF;
    
    RETURN true;
END;
$$;

-- 5. Create comprehensive audit trail function
CREATE OR REPLACE FUNCTION public.get_audit_trail_secure(
    p_user_id uuid DEFAULT NULL,
    p_action_filter text DEFAULT NULL,
    p_hours_back integer DEFAULT 24
)
RETURNS TABLE(
    id uuid,
    timestamp timestamp with time zone,
    user_id uuid,
    action text,
    table_name text,
    severity text,
    ip_address text,
    details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Only admins can access audit trails
    IF public.get_current_user_role() != 'admin' THEN
        RAISE EXCEPTION 'Access denied: audit trail access requires administrator privileges';
    END IF;
    
    -- Rate limiting for audit access
    IF NOT public.check_rate_limit_enhanced('audit_trail_access', 20, 60) THEN
        PERFORM public.log_critical_security_event(
            'AUDIT_TRAIL_RATE_LIMIT_EXCEEDED',
            'high',
            jsonb_build_object(
                'user_filter', p_user_id,
                'action_filter', p_action_filter,
                'hours_back', p_hours_back
            )
        );
        RAISE EXCEPTION 'Rate limit exceeded for audit trail access';
    END IF;
    
    -- Log audit trail access
    PERFORM public.log_critical_security_event(
        'AUDIT_TRAIL_ACCESS',
        'medium',
        jsonb_build_object(
            'admin_user', auth.uid(),
            'user_filter', p_user_id,
            'action_filter', p_action_filter,
            'hours_back', p_hours_back
        )
    );
    
    RETURN QUERY
    SELECT 
        sal.id,
        sal.timestamp,
        sal.user_id,
        sal.action,
        sal.table_name,
        COALESCE(sal.new_values->>'severity', 'unknown') as severity,
        sal.ip_address,
        sal.new_values as details
    FROM public.security_audit_log sal
    WHERE 
        sal.timestamp > now() - (p_hours_back || ' hours')::interval
        AND (p_user_id IS NULL OR sal.user_id = p_user_id)
        AND (p_action_filter IS NULL OR sal.action ILIKE '%' || p_action_filter || '%')
    ORDER BY sal.timestamp DESC
    LIMIT 1000; -- Prevent excessive data retrieval
END;
$$;