-- CRITICAL SECURITY FIXES

-- 1. Enhanced security functions for credential access validation
CREATE OR REPLACE FUNCTION public.check_rate_limit_enhanced(
    operation_name text, 
    max_attempts integer DEFAULT 5, 
    window_minutes integer DEFAULT 15
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    current_attempts integer;
    window_start_time timestamp with time zone;
    current_ip text;
BEGIN
    current_ip := inet_client_addr()::text;
    window_start_time := now() - (window_minutes || ' minutes')::interval;
    
    -- Clean up old rate limit records
    DELETE FROM public.rate_limits 
    WHERE window_start < window_start_time;
    
    -- Count current attempts in the window for this user/IP combination
    SELECT COALESCE(SUM(attempt_count), 0) INTO current_attempts
    FROM public.rate_limits
    WHERE (user_id = auth.uid() OR ip_address = current_ip)
        AND operation = operation_name 
        AND window_start >= window_start_time;
    
    -- Check if limit exceeded
    IF current_attempts >= max_attempts THEN
        -- Log security event for rate limit violation
        INSERT INTO public.security_audit_log (
            user_id, action, table_name, 
            new_values, ip_address
        ) VALUES (
            auth.uid(), 'RATE_LIMIT_EXCEEDED', 'rate_limits',
            jsonb_build_object(
                'operation', operation_name,
                'attempts', current_attempts,
                'limit', max_attempts,
                'severity', 'high'
            ),
            current_ip
        );
        RETURN false;
    END IF;
    
    -- Record this attempt with IP tracking
    INSERT INTO public.rate_limits (user_id, operation, attempt_count, window_start, ip_address)
    VALUES (auth.uid(), operation_name, 1, now(), current_ip)
    ON CONFLICT (user_id, operation) 
    DO UPDATE SET 
        attempt_count = public.rate_limits.attempt_count + 1,
        ip_address = current_ip,
        window_start = CASE 
            WHEN public.rate_limits.window_start < window_start_time THEN now()
            ELSE public.rate_limits.window_start
        END;
    
    RETURN true;
END;
$$;

-- 2. Critical security event logging with enhanced validation
CREATE OR REPLACE FUNCTION public.log_critical_security_event(
    event_type text,
    severity text DEFAULT 'medium',
    details jsonb DEFAULT '{}'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    current_ip text;
    enhanced_details jsonb;
BEGIN
    current_ip := inet_client_addr()::text;
    
    -- Enhance details with security context
    enhanced_details := details || jsonb_build_object(
        'timestamp', now(),
        'user_agent', current_setting('request.headers', true)::jsonb->>'user-agent',
        'session_id', current_setting('request.jwt.claims', true)::jsonb->>'session_id',
        'severity_level', severity,
        'security_classification', 'critical'
    );
    
    -- Insert security event with validation
    INSERT INTO public.security_audit_log (
        user_id, action, table_name, 
        new_values, ip_address
    ) VALUES (
        auth.uid(), 
        format('SECURITY_EVENT_%s', upper(event_type)), 
        'security_events',
        enhanced_details,
        current_ip
    );
    
    -- For high/critical events, also log to a special monitoring table
    IF severity IN ('high', 'critical') THEN
        INSERT INTO public.security_audit_log (
            user_id, action, table_name, 
            new_values, ip_address
        ) VALUES (
            auth.uid(), 
            'CRITICAL_SECURITY_ALERT', 
            'security_monitoring',
            jsonb_build_object(
                'original_event', event_type,
                'escalation_level', severity,
                'requires_immediate_review', true,
                'alert_details', enhanced_details
            ),
            current_ip
        );
    END IF;
END;
$$;

-- 3. Safe security event logging with error handling
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

-- 4. HR administrator check function for secure profile access
CREATE OR REPLACE FUNCTION public.is_hr_administrator()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() 
        AND ur.role = 'admin'
        -- Add additional HR-specific role check if needed
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND (p.work_role ? 'HR' OR p.work_role ? 'Human Resources')
        )
    );
$$;

-- 5. Add IP address tracking to rate_limits table
ALTER TABLE public.rate_limits 
ADD COLUMN IF NOT EXISTS ip_address text;

-- 6. Create secure worker rates function with enhanced validation
CREATE OR REPLACE FUNCTION public.get_worker_rates_secure(
    p_worker_id uuid DEFAULT NULL,
    p_effective_date date DEFAULT NULL
) RETURNS TABLE(
    id uuid,
    worker_id uuid,
    hourly_rate numeric,
    monthly_salary numeric,
    payment_type text,
    effective_date date,
    end_date date,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    user_role text;
    target_worker_id uuid;
BEGIN
    -- Get current user role
    user_role := public.get_current_user_role();
    target_worker_id := COALESCE(p_worker_id, auth.uid());
    
    -- Enhanced rate limiting for financial data access
    IF NOT public.check_rate_limit_enhanced('worker_rates_access', 10, 60) THEN
        PERFORM public.log_critical_security_event(
            'WORKER_RATES_RATE_LIMIT_EXCEEDED',
            'high',
            jsonb_build_object(
                'target_worker_id', target_worker_id,
                'requesting_user', auth.uid(),
                'user_role', user_role
            )
        );
        RAISE EXCEPTION 'Rate limit exceeded for worker rates access';
    END IF;
    
    -- Strict access control: only admin or self-access allowed
    IF user_role != 'admin' AND target_worker_id != auth.uid() THEN
        PERFORM public.log_critical_security_event(
            'UNAUTHORIZED_WORKER_RATES_ACCESS_ATTEMPT',
            'critical',
            jsonb_build_object(
                'target_worker_id', target_worker_id,
                'requesting_user', auth.uid(),
                'user_role', user_role,
                'violation_type', 'cross_user_financial_access'
            )
        );
        RAISE EXCEPTION 'Access denied: insufficient permissions for worker rates';
    END IF;
    
    -- Log legitimate access to financial data
    PERFORM public.log_critical_security_event(
        'WORKER_RATES_SECURE_ACCESS',
        'medium',
        jsonb_build_object(
            'target_worker_id', target_worker_id,
            'user_role', user_role,
            'access_method', 'secure_rpc_function',
            'data_type', 'financial_sensitive'
        )
    );
    
    -- Return rates with access validation
    RETURN QUERY
    SELECT 
        wr.id,
        wr.worker_id,
        CASE 
            WHEN user_role = 'admin' THEN wr.hourly_rate
            WHEN target_worker_id = auth.uid() THEN wr.hourly_rate
            ELSE NULL::numeric
        END AS hourly_rate,
        CASE 
            WHEN user_role = 'admin' THEN wr.monthly_salary
            WHEN target_worker_id = auth.uid() THEN wr.monthly_salary
            ELSE NULL::numeric
        END AS monthly_salary,
        wr.payment_type,
        wr.effective_date,
        wr.end_date,
        wr.created_at,
        wr.updated_at
    FROM public.worker_rates wr
    WHERE wr.worker_id = target_worker_id
        AND (p_effective_date IS NULL OR wr.effective_date <= p_effective_date)
        AND (p_effective_date IS NULL OR wr.end_date IS NULL OR wr.end_date >= p_effective_date)
    ORDER BY wr.effective_date DESC;
END;
$$;

-- 7. Strengthen worker_rates RLS policies
DROP POLICY IF EXISTS "Users can view their own rates" ON public.worker_rates;
DROP POLICY IF EXISTS "Admins can manage all worker rates" ON public.worker_rates;

CREATE POLICY "Secure worker rates access - admin only"
ON public.worker_rates
FOR ALL
TO authenticated
USING (
    public.get_current_user_role() = 'admin' AND
    public.safe_log_critical_security_event(
        'WORKER_RATES_RLS_ACCESS',
        'high',
        jsonb_build_object(
            'accessed_worker_id', worker_id,
            'admin_user', auth.uid(),
            'access_type', 'direct_table_access'
        )
    ) IS NOT NULL
)
WITH CHECK (
    public.get_current_user_role() = 'admin' AND
    public.safe_log_critical_security_event(
        'WORKER_RATES_RLS_MODIFICATION',
        'critical',
        jsonb_build_object(
            'modified_worker_id', worker_id,
            'admin_user', auth.uid(),
            'operation_type', 'direct_table_modification'
        )
    ) IS NOT NULL
);

-- 8. Enhanced security for Apple Calendar credentials - block all direct access
DROP POLICY IF EXISTS "allow_security_definer_functions_only" ON public.apple_calendar_credentials;
DROP POLICY IF EXISTS "block_direct_delete_force_rpc_usage" ON public.apple_calendar_credentials;
DROP POLICY IF EXISTS "block_direct_insert_force_rpc_usage" ON public.apple_calendar_credentials;
DROP POLICY IF EXISTS "block_direct_select_force_rpc_usage" ON public.apple_calendar_credentials;
DROP POLICY IF EXISTS "block_direct_update_force_rpc_usage" ON public.apple_calendar_credentials;

-- Complete lockdown - force all access through secure RPC functions
CREATE POLICY "lockdown_all_direct_access_to_credentials"
ON public.apple_calendar_credentials
FOR ALL
TO authenticated
USING (
    false AND public.safe_log_critical_security_event(
        'APPLE_CREDENTIAL_DIRECT_ACCESS_BLOCKED',
        'critical',
        jsonb_build_object(
            'user_id', auth.uid(),
            'credential_id', id,
            'violation_type', 'attempted_direct_table_access',
            'security_action', 'access_denied',
            'recommendation', 'use_secure_rpc_functions_only'
        )
    ) IS NOT NULL
)
WITH CHECK (
    false AND public.safe_log_critical_security_event(
        'APPLE_CREDENTIAL_DIRECT_MODIFICATION_BLOCKED',
        'critical',
        jsonb_build_object(
            'user_id', auth.uid(),
            'violation_type', 'attempted_direct_table_modification',
            'security_action', 'modification_denied',
            'recommendation', 'use_secure_rpc_functions_only'
        )
    ) IS NOT NULL
);

-- 9. Enhanced security for OAuth tokens
CREATE POLICY "oauth_tokens_secure_access_only"
ON public.calendar_oauth_tokens
FOR ALL
TO authenticated
USING (
    user_id = auth.uid() AND
    public.safe_log_critical_security_event(
        'OAUTH_TOKEN_ACCESS',
        'high',
        jsonb_build_object(
            'token_id', id,
            'provider', provider,
            'access_type', 'user_self_access'
        )
    ) IS NOT NULL
)
WITH CHECK (
    user_id = auth.uid() AND
    public.safe_log_critical_security_event(
        'OAUTH_TOKEN_MODIFICATION',
        'high',
        jsonb_build_object(
            'token_id', id,
            'provider', provider,
            'operation_type', 'user_self_modification'
        )
    ) IS NOT NULL
);

-- 10. Create secure document access function with PII protection
CREATE OR REPLACE FUNCTION public.get_security_alerts()
RETURNS TABLE(
    alert_id uuid,
    severity text,
    event_type text,
    user_id uuid,
    details jsonb,
    event_timestamp timestamp with time zone,
    ip_address text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    user_role text;
BEGIN
    -- Only allow admin access to security alerts
    user_role := public.get_current_user_role();
    
    IF user_role != 'admin' THEN
        PERFORM public.log_critical_security_event(
            'UNAUTHORIZED_SECURITY_ALERTS_ACCESS',
            'critical',
            jsonb_build_object(
                'requesting_user', auth.uid(),
                'user_role', user_role
            )
        );
        RAISE EXCEPTION 'Access denied: admin privileges required';
    END IF;
    
    -- Log admin access to security data
    PERFORM public.log_critical_security_event(
        'SECURITY_ALERTS_ADMIN_ACCESS',
        'medium',
        jsonb_build_object(
            'admin_user', auth.uid(),
            'access_scope', 'all_security_alerts'
        )
    );
    
    -- Return security alerts for admin review
    RETURN QUERY
    SELECT 
        sal.id as alert_id,
        CASE 
            WHEN sal.new_values->>'severity' IS NOT NULL THEN sal.new_values->>'severity'
            ELSE 'medium'
        END as severity,
        sal.action as event_type,
        sal.user_id,
        sal.new_values as details,
        sal.timestamp as event_timestamp,
        sal.ip_address
    FROM public.security_audit_log sal
    WHERE sal.action LIKE 'SECURITY_EVENT_%' 
        OR sal.action LIKE 'CRITICAL_%'
        OR sal.action LIKE '%UNAUTHORIZED_%'
        OR sal.action LIKE '%VIOLATION%'
    ORDER BY sal.timestamp DESC
    LIMIT 100;
END;
$$;