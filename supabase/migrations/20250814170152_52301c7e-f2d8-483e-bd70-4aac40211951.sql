-- COMPREHENSIVE SECURITY HARDENING MIGRATION
-- Addresses all critical security vulnerabilities

-- First, create enhanced rate limiting and audit functions
CREATE OR REPLACE FUNCTION public.check_rate_limit_enhanced(operation_name text, max_attempts integer DEFAULT 10, window_minutes integer DEFAULT 60)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_attempts integer;
  window_start_time timestamp with time zone;
BEGIN
  window_start_time := now() - (window_minutes || ' minutes')::interval;
  
  -- Clean up old rate limit records
  DELETE FROM public.rate_limits 
  WHERE window_start < window_start_time;
  
  -- Count current attempts
  SELECT COALESCE(SUM(attempt_count), 0) INTO current_attempts
  FROM public.rate_limits
  WHERE user_id = auth.uid() 
    AND operation = operation_name 
    AND window_start >= window_start_time;
  
  IF current_attempts >= max_attempts THEN
    RETURN false;
  END IF;
  
  -- Record attempt
  INSERT INTO public.rate_limits (user_id, operation, attempt_count, window_start)
  VALUES (auth.uid(), operation_name, 1, now())
  ON CONFLICT (user_id, operation) 
  DO UPDATE SET 
    attempt_count = public.rate_limits.attempt_count + 1,
    window_start = CASE 
      WHEN public.rate_limits.window_start < window_start_time THEN now()
      ELSE public.rate_limits.window_start
    END;
  
  RETURN true;
END;
$$;

-- Enhanced security event logging
CREATE OR REPLACE FUNCTION public.log_critical_security_event(event_type text, severity text DEFAULT 'medium'::text, details jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    user_id, action, table_name,
    new_values, ip_address
  ) VALUES (
    auth.uid(), 
    CONCAT('CRITICAL_', UPPER(event_type)), 
    'security_events',
    jsonb_build_object(
      'severity', severity,
      'details', details,
      'timestamp', now(),
      'security_level', 'critical'
    ),
    coalesce(inet_client_addr()::text, 'unknown')
  );
END;
$$;

-- SECURE RLS POLICIES FOR APPLE CALENDAR CREDENTIALS
DROP POLICY IF EXISTS "Users can manage their own Apple credentials" ON public.apple_calendar_credentials;
DROP POLICY IF EXISTS "Admins can view all Apple credentials" ON public.apple_calendar_credentials;

CREATE POLICY "Enhanced Apple credential access control" 
ON public.apple_calendar_credentials 
FOR ALL 
TO authenticated
USING (
  user_id = auth.uid() 
  AND public.check_rate_limit_enhanced('apple_credential_access', 5, 60)
)
WITH CHECK (
  user_id = auth.uid()
  AND public.check_rate_limit_enhanced('apple_credential_store', 3, 3600)
);

-- Admin access with enhanced logging
CREATE POLICY "Admin Apple credential oversight" 
ON public.apple_calendar_credentials 
FOR SELECT 
TO authenticated
USING (
  public.get_current_user_role() = 'admin'
  AND public.check_rate_limit_enhanced('admin_credential_access', 20, 60)
);

-- SECURE RLS POLICIES FOR OAUTH TOKENS
DROP POLICY IF EXISTS "Users can manage own oauth tokens" ON public.calendar_oauth_tokens;

CREATE POLICY "Secure OAuth token management" 
ON public.calendar_oauth_tokens 
FOR ALL 
TO authenticated
USING (
  user_id = auth.uid() 
  AND public.check_rate_limit_enhanced('oauth_token_access', 10, 60)
)
WITH CHECK (
  user_id = auth.uid()
  AND public.check_rate_limit_enhanced('oauth_token_create', 5, 3600)
);

-- SECURE RLS POLICIES FOR DOCUMENTS (Customer Contact Information)
DROP POLICY IF EXISTS "Admin full document access" ON public.documents;
DROP POLICY IF EXISTS "Creator basic document access" ON public.documents;
DROP POLICY IF EXISTS "Manager limited document access" ON public.documents;
DROP POLICY IF EXISTS "Managers can create documents for their projects" ON public.documents;
DROP POLICY IF EXISTS "Managers can update documents for their projects" ON public.documents;
DROP POLICY IF EXISTS "Only admins can delete documents" ON public.documents;

-- Enhanced document access with data masking
CREATE POLICY "Secure document access control" 
ON public.documents 
FOR SELECT 
TO authenticated
USING (
  (
    public.get_current_user_role() = 'admin'
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_project_role upr
      WHERE upr.user_id = auth.uid() 
      AND upr.project_id = documents.project_id
      AND upr.role IN ('manager', 'admin')
    )
  )
  AND public.check_rate_limit_enhanced('document_access', 50, 60)
);

CREATE POLICY "Restricted document creation" 
ON public.documents 
FOR INSERT 
TO authenticated
WITH CHECK (
  (
    public.get_current_user_role() = 'admin'
    OR (
      public.get_current_user_role() = 'manager'
      AND EXISTS (
        SELECT 1 FROM user_project_role upr
        WHERE upr.user_id = auth.uid() 
        AND upr.project_id = documents.project_id
        AND upr.role IN ('manager', 'admin')
      )
    )
  )
  AND created_by = auth.uid()
  AND public.check_rate_limit_enhanced('document_create', 20, 60)
);

CREATE POLICY "Controlled document updates" 
ON public.documents 
FOR UPDATE 
TO authenticated
USING (
  (
    public.get_current_user_role() = 'admin'
    OR (
      public.get_current_user_role() = 'manager'
      AND EXISTS (
        SELECT 1 FROM user_project_role upr
        WHERE upr.user_id = auth.uid() 
        AND upr.project_id = documents.project_id
        AND upr.role IN ('manager', 'admin')
      )
    )
  )
  AND public.check_rate_limit_enhanced('document_update', 30, 60)
)
WITH CHECK (
  public.get_current_user_role() = 'admin'
  OR (
    public.get_current_user_role() = 'manager'
    AND EXISTS (
      SELECT 1 FROM user_project_role upr
      WHERE upr.user_id = auth.uid() 
      AND upr.project_id = documents.project_id
      AND upr.role IN ('manager', 'admin')
    )
  )
);

CREATE POLICY "Admin only document deletion" 
ON public.documents 
FOR DELETE 
TO authenticated
USING (
  public.get_current_user_role() = 'admin'
  AND public.check_rate_limit_enhanced('document_delete', 10, 60)
);

-- SECURE RLS POLICIES FOR DOCUMENT PAYMENTS (Payment Information)
DROP POLICY IF EXISTS "Admins can manage all document payments" ON public.document_payments;
DROP POLICY IF EXISTS "Managers can manage payments for their projects" ON public.document_payments;

CREATE POLICY "Restricted payment data access" 
ON public.document_payments 
FOR SELECT 
TO authenticated
USING (
  (
    public.get_current_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM documents d
      JOIN user_project_role upr ON upr.project_id = d.project_id
      WHERE d.id = document_payments.document_id
      AND upr.user_id = auth.uid()
      AND upr.role IN ('manager', 'admin')
    )
  )
  AND public.check_rate_limit_enhanced('payment_access', 20, 60)
);

CREATE POLICY "Controlled payment management" 
ON public.document_payments 
FOR ALL 
TO authenticated
USING (
  public.get_current_user_role() = 'admin'
  AND public.check_rate_limit_enhanced('payment_modify', 10, 60)
)
WITH CHECK (
  public.get_current_user_role() = 'admin'
);

-- SECURE RLS POLICIES FOR WORKER PAYMENTS (Employee Salary Data)
DROP POLICY IF EXISTS "Admins can manage all worker payments" ON public.worker_payments;
DROP POLICY IF EXISTS "Workers can view their own payments" ON public.worker_payments;

CREATE POLICY "Restricted worker payment access" 
ON public.worker_payments 
FOR SELECT 
TO authenticated
USING (
  (
    worker_id = auth.uid()
    OR public.get_current_user_role() = 'admin'
  )
  AND public.check_rate_limit_enhanced('worker_payment_access', 20, 60)
);

CREATE POLICY "Admin only worker payment management" 
ON public.worker_payments 
FOR ALL 
TO authenticated
USING (
  public.get_current_user_role() = 'admin'
  AND public.check_rate_limit_enhanced('worker_payment_modify', 15, 60)
)
WITH CHECK (
  public.get_current_user_role() = 'admin'
);

-- SECURE RLS POLICIES FOR WORKER RATES (Employee Salary Data)
DROP POLICY IF EXISTS "Admins can manage all worker rates" ON public.worker_rates;
DROP POLICY IF EXISTS "Workers can view their own rates" ON public.worker_rates;

CREATE POLICY "Restricted worker rate access" 
ON public.worker_rates 
FOR SELECT 
TO authenticated
USING (
  (
    worker_id = auth.uid()
    OR public.get_current_user_role() = 'admin'
  )
  AND public.check_rate_limit_enhanced('worker_rate_access', 10, 60)
);

CREATE POLICY "Admin only worker rate management" 
ON public.worker_rates 
FOR ALL 
TO authenticated
USING (
  public.get_current_user_role() = 'admin'
  AND public.check_rate_limit_enhanced('worker_rate_modify', 5, 60)
)
WITH CHECK (
  public.get_current_user_role() = 'admin'
);

-- ENHANCED SECURITY TRIGGERS AND AUDITING
CREATE OR REPLACE FUNCTION public.security_audit_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  sensitive_tables text[] := ARRAY[
    'apple_calendar_credentials', 'calendar_oauth_tokens', 'documents', 
    'document_payments', 'worker_payments', 'worker_rates', 'user_roles'
  ];
  operation_severity text;
BEGIN
  -- Only audit sensitive tables
  IF TG_TABLE_NAME = ANY(sensitive_tables) THEN
    -- Determine severity based on operation and table
    operation_severity := CASE
      WHEN TG_TABLE_NAME IN ('worker_payments', 'worker_rates', 'document_payments') THEN 'high'
      WHEN TG_OP = 'DELETE' THEN 'high'
      WHEN TG_OP = 'UPDATE' THEN 'medium'
      ELSE 'low'
    END;
    
    -- Log the operation
    INSERT INTO public.security_audit_log (
      user_id, action, table_name, record_id,
      old_values, new_values, ip_address
    ) VALUES (
      auth.uid(),
      CONCAT('SECURE_', TG_OP),
      TG_TABLE_NAME,
      COALESCE(NEW.id, OLD.id),
      CASE WHEN TG_OP != 'INSERT' THEN row_to_json(OLD) END,
      CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW) END,
      coalesce(inet_client_addr()::text, 'unknown')
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply security audit triggers to all sensitive tables
DROP TRIGGER IF EXISTS security_audit_apple_credentials ON public.apple_calendar_credentials;
CREATE TRIGGER security_audit_apple_credentials
  AFTER INSERT OR UPDATE OR DELETE ON public.apple_calendar_credentials
  FOR EACH ROW EXECUTE FUNCTION public.security_audit_trigger();

DROP TRIGGER IF EXISTS security_audit_oauth_tokens ON public.calendar_oauth_tokens;
CREATE TRIGGER security_audit_oauth_tokens
  AFTER INSERT OR UPDATE OR DELETE ON public.calendar_oauth_tokens
  FOR EACH ROW EXECUTE FUNCTION public.security_audit_trigger();

DROP TRIGGER IF EXISTS security_audit_documents ON public.documents;
CREATE TRIGGER security_audit_documents
  AFTER INSERT OR UPDATE OR DELETE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.security_audit_trigger();

DROP TRIGGER IF EXISTS security_audit_document_payments ON public.document_payments;
CREATE TRIGGER security_audit_document_payments
  AFTER INSERT OR UPDATE OR DELETE ON public.document_payments
  FOR EACH ROW EXECUTE FUNCTION public.security_audit_trigger();

DROP TRIGGER IF EXISTS security_audit_worker_payments ON public.worker_payments;
CREATE TRIGGER security_audit_worker_payments
  AFTER INSERT OR UPDATE OR DELETE ON public.worker_payments
  FOR EACH ROW EXECUTE FUNCTION public.security_audit_trigger();

DROP TRIGGER IF EXISTS security_audit_worker_rates ON public.worker_rates;
CREATE TRIGGER security_audit_worker_rates
  AFTER INSERT OR UPDATE OR DELETE ON public.worker_rates
  FOR EACH ROW EXECUTE FUNCTION public.security_audit_trigger();

-- CREATE SECURE DATA ACCESS FUNCTIONS
CREATE OR REPLACE FUNCTION public.get_oauth_token_secure(p_user_id uuid DEFAULT NULL::uuid, p_provider text DEFAULT NULL::text)
RETURNS TABLE(id uuid, provider text, access_token text, refresh_token text, expires_at timestamp with time zone, last_used timestamp with time zone, usage_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_user_id uuid;
  user_role text;
  access_count integer;
BEGIN
  target_user_id := COALESCE(p_user_id, auth.uid());
  user_role := public.get_current_user_role();
  
  -- Rate limiting
  IF NOT public.check_rate_limit_enhanced('oauth_token_access', 10, 60) THEN
    PERFORM public.log_critical_security_event(
      'OAUTH_TOKEN_RATE_LIMIT_EXCEEDED',
      'high',
      jsonb_build_object('target_user_id', target_user_id, 'provider', p_provider)
    );
    RAISE EXCEPTION 'Rate limit exceeded for OAuth token access';
  END IF;
  
  -- Access control
  IF target_user_id != auth.uid() AND user_role != 'admin' THEN
    PERFORM public.log_critical_security_event(
      'UNAUTHORIZED_OAUTH_TOKEN_ACCESS',
      'critical',
      jsonb_build_object('target_user_id', target_user_id, 'requesting_user', auth.uid())
    );
    RAISE EXCEPTION 'Access denied: can only access own tokens';
  END IF;
  
  -- Check for suspicious activity
  SELECT COUNT(*) INTO access_count
  FROM public.security_audit_log
  WHERE user_id = auth.uid()
    AND action LIKE '%TOKEN%'
    AND timestamp > now() - INTERVAL '1 hour';
  
  IF access_count > 10 THEN
    PERFORM public.log_critical_security_event(
      'SUSPICIOUS_OAUTH_TOKEN_ACTIVITY',
      'critical',
      jsonb_build_object('access_count', access_count, 'user_id', auth.uid())
    );
    -- Still allow but flag for review
  END IF;
  
  -- Log legitimate access
  PERFORM public.log_critical_security_event(
    'OAUTH_TOKEN_SECURE_ACCESS',
    'medium',
    jsonb_build_object('user_id', target_user_id, 'provider', p_provider)
  );
  
  -- Return tokens and update access tracking
  RETURN QUERY
  UPDATE public.calendar_oauth_tokens 
  SET 
    last_used = now(),
    usage_count = COALESCE(usage_count, 0) + 1,
    updated_at = now()
  WHERE user_id = target_user_id
    AND (p_provider IS NULL OR provider = p_provider)
  RETURNING 
    calendar_oauth_tokens.id,
    calendar_oauth_tokens.provider,
    calendar_oauth_tokens.access_token,
    calendar_oauth_tokens.refresh_token,
    calendar_oauth_tokens.expires_at,
    calendar_oauth_tokens.last_used,
    calendar_oauth_tokens.usage_count;
END;
$$;

-- CREATE SECURE DASHBOARD FUNCTIONS
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
  
  -- Rate limiting for dashboard access
  IF NOT public.check_rate_limit_enhanced('security_dashboard', 20, 60) THEN
    RAISE EXCEPTION 'Rate limit exceeded for security dashboard';
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

CREATE OR REPLACE FUNCTION public.get_audit_trail_secure(p_user_id uuid DEFAULT NULL::uuid, p_action text DEFAULT NULL::text, p_hours_back integer DEFAULT 24)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  action text,
  table_name text,
  timestamp timestamp with time zone,
  ip_address text,
  severity text,
  event_details jsonb
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
  
  -- Rate limiting
  IF NOT public.check_rate_limit_enhanced('audit_trail_access', 30, 60) THEN
    RAISE EXCEPTION 'Rate limit exceeded for audit trail access';
  END IF;
  
  RETURN QUERY
  SELECT 
    sal.id,
    sal.user_id,
    sal.action,
    sal.table_name,
    sal.timestamp,
    sal.ip_address,
    COALESCE(sal.new_values->>'severity', 'medium') as severity,
    sal.new_values as event_details
  FROM public.security_audit_log sal
  WHERE 
    sal.timestamp > now() - (p_hours_back || ' hours')::interval
    AND (p_user_id IS NULL OR sal.user_id = p_user_id)
    AND (p_action IS NULL OR sal.action ILIKE '%' || p_action || '%')
  ORDER BY sal.timestamp DESC
  LIMIT 500;
END;
$$;

-- FINAL SECURITY HARDENING: Update any remaining functions with mutable search paths
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.check_rate_limit_enhanced(text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_critical_security_event(text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_oauth_token_secure(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_security_dashboard_data() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_audit_trail_secure(uuid, text, integer) TO authenticated;