-- PHASE 2: Fix remaining security issues and complete database hardening

-- 1. Fix all functions with mutable search paths
-- Update all existing functions to have immutable search paths

-- Fix get_current_user_role function
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

-- Fix user_has_role function
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

-- Fix fn_role_in_org function
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

-- Fix fn_is_member function
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

-- Fix is_org_member function
CREATE OR REPLACE FUNCTION public.is_org_member(check_org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  select exists(
    select 1 from public.organization_members m
    where m.org_id = check_org and m.user_id = auth.uid()
  );
$$;

-- Fix can_access_security_monitor function
CREATE OR REPLACE FUNCTION public.can_access_security_monitor()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT get_current_user_role() = 'admin';
$$;

-- Fix check_rate_limit function
CREATE OR REPLACE FUNCTION public.check_rate_limit(operation_name text, max_attempts integer DEFAULT 5, window_minutes integer DEFAULT 15)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_attempts integer;
  window_start_time timestamp with time zone;
BEGIN
  -- Get current window start time
  window_start_time := now() - (window_minutes || ' minutes')::interval;
  
  -- Clean up old rate limit records
  DELETE FROM public.rate_limits 
  WHERE window_start < window_start_time;
  
  -- Count current attempts in the window
  SELECT COALESCE(SUM(attempt_count), 0) INTO current_attempts
  FROM public.rate_limits
  WHERE user_id = auth.uid() 
    AND operation = operation_name 
    AND window_start >= window_start_time;
  
  -- Check if limit exceeded
  IF current_attempts >= max_attempts THEN
    RETURN false;
  END IF;
  
  -- Record this attempt
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

-- Fix log_security_event function
CREATE OR REPLACE FUNCTION public.log_security_event(event_type text, severity text DEFAULT 'medium'::text, details jsonb DEFAULT '{}'::jsonb)
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
    auth.uid(), event_type, 'security_events',
    jsonb_build_object(
      'severity', severity,
      'details', details,
      'timestamp', now()
    ),
    inet_client_addr()::text
  );
END;
$$;

-- Fix log_high_risk_activity function
CREATE OR REPLACE FUNCTION public.log_high_risk_activity(event_type text, risk_level text DEFAULT 'medium'::text, details jsonb DEFAULT '{}'::jsonb)
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
    CONCAT('HIGH_RISK_', UPPER(event_type)), 
    'security_events',
    jsonb_build_object(
      'risk_level', risk_level,
      'details', details,
      'timestamp', now(),
      'user_agent', current_setting('request.headers', true)::json->>'user-agent'
    ),
    inet_client_addr()::text
  );
  
  -- Auto-escalate critical events
  IF risk_level = 'critical' THEN
    RAISE WARNING 'Critical security event detected: %', event_type;
  END IF;
END;
$$;

-- Fix check_customer_data_rate_limit function
CREATE OR REPLACE FUNCTION public.check_customer_data_rate_limit()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Enhanced rate limiting for sensitive customer data
  RETURN check_rate_limit_enhanced('customer_data_access', 10, 60); -- Max 10 requests per hour
END;
$$;

-- Fix update_phase_progress function
CREATE OR REPLACE FUNCTION public.update_phase_progress(phase uuid)
RETURNS void
LANGUAGE sql
SET search_path TO 'public'
AS $$
  UPDATE public.project_phases
  SET progress = (
    SELECT 100.0 * count(*) FILTER (WHERE status = 'done')
           / GREATEST(count(*),1)
    FROM public.tasks
    WHERE phase_id = phase)
  WHERE id = phase;
$$;

-- Fix update_project_progress function
CREATE OR REPLACE FUNCTION public.update_project_progress(proj uuid)
RETURNS void
LANGUAGE sql
SET search_path TO 'public'
AS $$
  UPDATE public.projects
  SET progress = (
    SELECT coalesce(avg(progress),0)
    FROM public.project_phases
    WHERE project_id = proj)
  WHERE id = proj;
$$;

-- 2. Add IP address tracking to rate_limits table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rate_limits' 
    AND column_name = 'ip_address'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.rate_limits ADD COLUMN ip_address text;
  END IF;
END $$;

-- 3. Create comprehensive security monitoring view (with RLS blocking)
CREATE OR REPLACE VIEW public.security_summary AS
SELECT 
  'RESTRICTED' as summary,
  'Security data access requires admin privileges' as message;

-- Block direct access to security summary view
ALTER TABLE public.security_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Block security summary access"
ON public.security_summary
FOR ALL
TO authenticated
USING (false);

-- 4. Create secure access function for security monitoring
CREATE OR REPLACE FUNCTION public.get_security_summary_secure()
RETURNS TABLE(
  total_events bigint,
  critical_events bigint,
  recent_violations bigint,
  top_threats text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only admins can access security summary
  IF public.get_current_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Access denied: security monitoring requires administrator privileges';
  END IF;
  
  -- Log security dashboard access
  PERFORM public.log_critical_security_event(
    'SECURITY_DASHBOARD_ACCESS',
    'low',
    jsonb_build_object(
      'access_time', now(),
      'admin_user', auth.uid()
    )
  );
  
  RETURN QUERY
  SELECT 
    COUNT(*) as total_events,
    COUNT(*) FILTER (WHERE new_values->>'severity' = 'critical') as critical_events,
    COUNT(*) FILTER (WHERE timestamp > now() - INTERVAL '24 hours') as recent_violations,
    ARRAY_AGG(DISTINCT action ORDER BY action) as top_threats
  FROM public.security_audit_log
  WHERE timestamp > now() - INTERVAL '7 days';
END;
$$;