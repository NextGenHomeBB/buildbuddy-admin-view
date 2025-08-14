-- PHASE 2 FINAL: Fix SQL syntax error and complete security hardening

-- Create comprehensive audit trail function with proper column naming
CREATE OR REPLACE FUNCTION public.get_audit_trail_secure(
    p_user_id uuid DEFAULT NULL,
    p_action_filter text DEFAULT NULL,
    p_hours_back integer DEFAULT 24
)
RETURNS TABLE(
    audit_id uuid,
    event_timestamp timestamp with time zone,
    event_user_id uuid,
    event_action text,
    event_table_name text,
    event_severity text,
    event_ip_address text,
    event_details jsonb
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
        sal.id as audit_id,
        sal.timestamp as event_timestamp,
        sal.user_id as event_user_id,
        sal.action as event_action,
        sal.table_name as event_table_name,
        COALESCE(sal.new_values->>'severity', 'unknown') as event_severity,
        sal.ip_address as event_ip_address,
        sal.new_values as event_details
    FROM public.security_audit_log sal
    WHERE 
        sal.timestamp > now() - (p_hours_back || ' hours')::interval
        AND (p_user_id IS NULL OR sal.user_id = p_user_id)
        AND (p_action_filter IS NULL OR sal.action ILIKE '%' || p_action_filter || '%')
    ORDER BY sal.timestamp DESC
    LIMIT 1000; -- Prevent excessive data retrieval
END;
$$;