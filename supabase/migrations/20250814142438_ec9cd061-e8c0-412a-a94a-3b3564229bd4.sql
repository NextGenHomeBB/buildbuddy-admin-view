-- CRITICAL SECURITY FIXES FOR DATA PROTECTION (Fixed Version)

-- 1. Create secure customer data access function with data masking
CREATE OR REPLACE FUNCTION public.get_customer_data_secure(
  p_project_id uuid DEFAULT NULL,
  p_document_type text DEFAULT NULL,
  p_include_payment_data boolean DEFAULT false
)
RETURNS TABLE(
  id uuid,
  document_number text,
  document_type text,
  status text,
  client_name text,
  client_email text,
  client_phone text,
  client_address text,
  total_amount numeric,
  subtotal numeric,
  tax_amount numeric,
  amount_paid numeric,
  payment_status text,
  project_id uuid,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_role text;
  has_project_access boolean := false;
BEGIN
  -- Get current user role
  user_role := public.get_current_user_role();
  
  -- Rate limiting for customer data access
  IF NOT public.check_rate_limit_enhanced('customer_data_access', 20, 60) THEN
    PERFORM public.log_critical_security_event(
      'CUSTOMER_DATA_RATE_LIMIT_EXCEEDED',
      'high',
      jsonb_build_object(
        'user_role', user_role,
        'project_id', p_project_id,
        'document_type', p_document_type
      )
    );
    RAISE EXCEPTION 'Rate limit exceeded for customer data access';
  END IF;
  
  -- Check project access for non-admin users
  IF user_role != 'admin' AND p_project_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM user_project_role upr
      WHERE upr.user_id = auth.uid() 
      AND upr.project_id = p_project_id
      AND upr.role IN ('manager', 'admin')
    ) INTO has_project_access;
    
    IF NOT has_project_access THEN
      RAISE EXCEPTION 'Access denied: insufficient project permissions';
    END IF;
  END IF;
  
  -- Log access attempt
  PERFORM public.log_critical_security_event(
    'CUSTOMER_DATA_SECURE_ACCESS',
    'medium',
    jsonb_build_object(
      'user_role', user_role,
      'project_id', p_project_id,
      'document_type', p_document_type,
      'payment_data_requested', p_include_payment_data
    )
  );
  
  -- Return data with role-based masking
  RETURN QUERY
  SELECT 
    d.id,
    d.document_number,
    d.document_type,
    d.status,
    -- Data masking based on role
    CASE
      WHEN user_role = 'admin' THEN d.client_name
      ELSE concat(left(d.client_name, 3), '***')
    END AS client_name,
    CASE
      WHEN user_role = 'admin' THEN d.client_email
      ELSE concat(left(split_part(d.client_email, '@', 1), 2), '***@', split_part(d.client_email, '@', 2))
    END AS client_email,
    CASE
      WHEN user_role = 'admin' THEN d.client_phone
      ELSE concat('***', right(d.client_phone, 4))
    END AS client_phone,
    CASE
      WHEN user_role = 'admin' THEN d.client_address
      ELSE '*** REDACTED ***'
    END AS client_address,
    -- Financial data - admin and authorized managers only
    CASE
      WHEN user_role = 'admin' OR has_project_access THEN d.total_amount
      ELSE NULL::numeric
    END AS total_amount,
    CASE
      WHEN user_role = 'admin' OR has_project_access THEN d.subtotal
      ELSE NULL::numeric
    END AS subtotal,
    CASE
      WHEN user_role = 'admin' OR has_project_access THEN d.tax_amount
      ELSE NULL::numeric
    END AS tax_amount,
    CASE
      WHEN user_role = 'admin' OR has_project_access THEN d.amount_paid
      ELSE NULL::numeric
    END AS amount_paid,
    CASE
      WHEN user_role = 'admin' OR has_project_access THEN d.payment_status
      ELSE 'RESTRICTED'
    END AS payment_status,
    d.project_id,
    d.created_at,
    d.updated_at
  FROM public.documents d
  WHERE 
    (user_role = 'admin' OR 
     d.created_by = auth.uid() OR 
     (p_project_id IS NOT NULL AND has_project_access))
    AND (p_project_id IS NULL OR d.project_id = p_project_id)
    AND (p_document_type IS NULL OR d.document_type = p_document_type)
  ORDER BY d.created_at DESC;
END;
$$;

-- 2. Create secure worker rates function with HR protection
CREATE OR REPLACE FUNCTION public.get_worker_rates_secure(
  p_worker_id uuid DEFAULT NULL,
  p_effective_date date DEFAULT NULL
)
RETURNS TABLE(
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
SET search_path = 'public'
AS $$
DECLARE
  user_role text;
  is_own_data boolean := false;
BEGIN
  -- Get current user role
  user_role := public.get_current_user_role();
  
  -- Rate limiting for salary data access
  IF NOT public.check_rate_limit_enhanced('worker_rates_access', 10, 60) THEN
    PERFORM public.log_critical_security_event(
      'WORKER_RATES_RATE_LIMIT_EXCEEDED',
      'high',
      jsonb_build_object(
        'user_role', user_role,
        'requested_worker_id', p_worker_id
      )
    );
    RAISE EXCEPTION 'Rate limit exceeded for worker rates access';
  END IF;
  
  -- Check if accessing own data
  is_own_data := (p_worker_id = auth.uid() OR p_worker_id IS NULL);
  
  -- Access control: only admin can see all rates, workers can see only their own
  IF user_role != 'admin' AND NOT is_own_data THEN
    PERFORM public.log_critical_security_event(
      'UNAUTHORIZED_WORKER_RATES_ACCESS',
      'critical',
      jsonb_build_object(
        'user_role', user_role,
        'requested_worker_id', p_worker_id,
        'requesting_user', auth.uid()
      )
    );
    RAISE EXCEPTION 'Access denied: can only view own salary information';
  END IF;
  
  -- Log legitimate access
  PERFORM public.log_critical_security_event(
    'WORKER_RATES_SECURE_ACCESS',
    'medium',
    jsonb_build_object(
      'user_role', user_role,
      'requested_worker_id', p_worker_id,
      'is_own_data', is_own_data
    )
  );
  
  -- Return data with access controls
  RETURN QUERY
  SELECT 
    wr.id,
    wr.worker_id,
    -- Data masking for non-admin viewing others' data
    CASE
      WHEN user_role = 'admin' OR is_own_data THEN wr.hourly_rate
      ELSE NULL::numeric
    END AS hourly_rate,
    CASE
      WHEN user_role = 'admin' OR is_own_data THEN wr.monthly_salary
      ELSE NULL::numeric
    END AS monthly_salary,
    wr.payment_type,
    wr.effective_date,
    wr.end_date,
    wr.created_at,
    wr.updated_at
  FROM public.worker_rates wr
  WHERE 
    (user_role = 'admin' OR wr.worker_id = auth.uid())
    AND (p_worker_id IS NULL OR wr.worker_id = p_worker_id)
    AND (p_effective_date IS NULL OR wr.effective_date <= p_effective_date)
    AND (wr.end_date IS NULL OR wr.end_date >= COALESCE(p_effective_date, CURRENT_DATE))
  ORDER BY wr.effective_date DESC;
END;
$$;

-- 3. Enhanced rate limiting function
CREATE OR REPLACE FUNCTION public.check_rate_limit_enhanced(
  operation_name text, 
  max_attempts integer DEFAULT 10, 
  window_minutes integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_attempts integer;
  window_start_time timestamp with time zone;
  current_ip text;
BEGIN
  -- Get current IP for additional tracking
  current_ip := inet_client_addr()::text;
  
  -- Get current window start time
  window_start_time := now() - (window_minutes || ' minutes')::interval;
  
  -- Clean up old rate limit records (older than 24 hours)
  DELETE FROM public.rate_limits 
  WHERE window_start < (now() - INTERVAL '24 hours');
  
  -- Count current attempts in the window
  SELECT COALESCE(SUM(attempt_count), 0) INTO current_attempts
  FROM public.rate_limits
  WHERE user_id = auth.uid() 
    AND operation = operation_name 
    AND window_start >= window_start_time;
  
  -- Check if limit exceeded
  IF current_attempts >= max_attempts THEN
    -- Log rate limit violation
    PERFORM public.log_critical_security_event(
      'RATE_LIMIT_EXCEEDED',
      'high',
      jsonb_build_object(
        'operation', operation_name,
        'attempts', current_attempts,
        'limit', max_attempts,
        'window_minutes', window_minutes,
        'ip_address', current_ip
      )
    );
    RETURN false;
  END IF;
  
  -- Record this attempt with IP tracking
  INSERT INTO public.rate_limits (user_id, operation, attempt_count, window_start, ip_address)
  VALUES (auth.uid(), operation_name, 1, now(), current_ip)
  ON CONFLICT (user_id, operation) 
  DO UPDATE SET 
    attempt_count = public.rate_limits.attempt_count + 1,
    window_start = CASE 
      WHEN public.rate_limits.window_start < window_start_time THEN now()
      ELSE public.rate_limits.window_start
    END,
    ip_address = current_ip;
  
  RETURN true;
END;
$$;

-- 4. Create enhanced security monitoring function
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
SET search_path = 'public'
AS $$
DECLARE
  user_role text;
BEGIN
  -- Only admins can view security alerts
  user_role := public.get_current_user_role();
  
  IF user_role != 'admin' THEN
    RAISE EXCEPTION 'Access denied: admin privileges required';
  END IF;
  
  -- Return recent security events (last 7 days)
  RETURN QUERY
  SELECT 
    sal.id as alert_id,
    COALESCE(sal.new_values->>'severity', 'medium') as severity,
    sal.action as event_type,
    sal.user_id,
    sal.new_values as details,
    sal.timestamp as event_timestamp,
    sal.ip_address
  FROM public.security_audit_log sal
  WHERE 
    sal.timestamp > (now() - INTERVAL '7 days')
    AND (sal.action LIKE '%SECURITY%'
      OR sal.action LIKE '%RATE_LIMIT%'
      OR sal.action LIKE '%UNAUTHORIZED%'
      OR sal.action LIKE '%SUSPICIOUS%')
  ORDER BY sal.timestamp DESC
  LIMIT 100;
END;
$$;