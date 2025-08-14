-- Phase 1: Critical Security Fixes (Fixed for views)

-- 1. Create secure access functions for views instead of RLS on views
CREATE OR REPLACE FUNCTION public.get_phase_costs_secure_view(p_project_id uuid DEFAULT NULL)
RETURNS TABLE(
  phase_id uuid, project_id uuid, phase_name text, budget numeric,
  material_cost numeric, labor_cost_planned numeric, labor_cost_actual numeric,
  expense_cost numeric, total_committed numeric, forecast numeric,
  variance numeric, last_updated timestamp with time zone
) AS $$
BEGIN
  -- Check permissions
  IF NOT (
    get_current_user_role() = 'admin' OR
    (p_project_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM user_project_role upr
      WHERE upr.user_id = auth.uid() 
      AND upr.project_id = p_project_id
      AND upr.role IN ('manager', 'admin')
    ))
  ) THEN
    RAISE EXCEPTION 'Access denied: insufficient permissions';
  END IF;

  -- Return filtered data
  RETURN QUERY
  SELECT pcv.phase_id, pcv.project_id, pcv.phase_name, pcv.budget,
         pcv.material_cost, pcv.labor_cost_planned, pcv.labor_cost_actual,
         pcv.expense_cost, pcv.total_committed, pcv.forecast,
         pcv.variance, pcv.last_updated
  FROM phase_costs_vw pcv
  WHERE (p_project_id IS NULL OR pcv.project_id = p_project_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

CREATE OR REPLACE FUNCTION public.get_security_monitor_data()
RETURNS TABLE(
  id uuid, user_id uuid, user_name text, action text,
  event_category text, severity_level text, table_name text,
  timestamp timestamp with time zone, ip_address text
) AS $$
BEGIN
  -- Only admins can access security monitoring data
  IF get_current_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Access denied: admin privileges required';
  END IF;

  RETURN QUERY
  SELECT smv.id, smv.user_id, smv.user_name, smv.action,
         smv.event_category, smv.severity_level, smv.table_name,
         smv.timestamp, smv.ip_address
  FROM security_monitor_vw smv
  ORDER BY smv.timestamp DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- 2. Secure the secure_customer_data table with RLS
ALTER TABLE public.secure_customer_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin only access to secure customer data"
ON public.secure_customer_data
FOR ALL
USING (get_current_user_role() = 'admin')
WITH CHECK (get_current_user_role() = 'admin');

-- 3. Enhanced credential security with proper audit triggers
CREATE OR REPLACE FUNCTION public.enhanced_credential_audit()
RETURNS TRIGGER AS $$
BEGIN
  -- Update access tracking
  NEW.last_accessed = now();
  NEW.access_count = COALESCE(OLD.access_count, 0) + 1;
  
  -- Log high-priority access attempt
  INSERT INTO public.security_audit_log (
    user_id, action, table_name, record_id, 
    new_values, ip_address
  ) VALUES (
    auth.uid(), 'CREDENTIAL_ACCESS_HIGH_RISK', 'apple_calendar_credentials', NEW.id,
    jsonb_build_object(
      'access_count', NEW.access_count,
      'access_time', NEW.last_accessed,
      'credential_type', 'apple_calendar',
      'security_level', 'critical'
    ),
    inet_client_addr()::text
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Apply enhanced audit to Apple calendar credentials
DROP TRIGGER IF EXISTS enhanced_credential_audit ON public.apple_calendar_credentials;
CREATE TRIGGER enhanced_credential_audit
  BEFORE UPDATE ON public.apple_calendar_credentials
  FOR EACH ROW EXECUTE FUNCTION public.enhanced_credential_audit();

-- 4. Enhanced OAuth token security monitoring
CREATE OR REPLACE FUNCTION public.monitor_oauth_security()
RETURNS TRIGGER AS $$
DECLARE
  current_ip text;
  recent_access_count integer;
BEGIN
  current_ip := inet_client_addr()::text;
  
  -- Update usage tracking
  NEW.last_used = now();
  NEW.usage_count = COALESCE(OLD.usage_count, 0) + 1;
  NEW.last_ip = current_ip;
  
  -- Check for suspicious patterns
  IF OLD.last_ip IS NOT NULL AND OLD.last_ip != current_ip THEN
    -- Count recent access from different IPs
    SELECT COUNT(DISTINCT ip_address) INTO recent_access_count
    FROM public.security_audit_log
    WHERE user_id = NEW.user_id
      AND action LIKE '%TOKEN%'
      AND timestamp > now() - INTERVAL '1 hour';
    
    -- Flag high-risk activity
    IF recent_access_count > 2 THEN
      NEW.suspicious_activity = true;
      
      -- Log critical security event
      INSERT INTO public.security_audit_log (
        user_id, action, table_name, record_id, 
        new_values, ip_address
      ) VALUES (
        NEW.user_id, 'CRITICAL_TOKEN_SECURITY_VIOLATION', 'calendar_oauth_tokens', NEW.id,
        jsonb_build_object(
          'distinct_ips', recent_access_count,
          'current_ip', current_ip,
          'previous_ip', OLD.last_ip,
          'threat_level', 'critical',
          'auto_flagged', true
        ),
        current_ip
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Apply OAuth monitoring
DROP TRIGGER IF EXISTS monitor_oauth_security ON public.calendar_oauth_tokens;
CREATE TRIGGER monitor_oauth_security
  BEFORE UPDATE ON public.calendar_oauth_tokens
  FOR EACH ROW EXECUTE FUNCTION public.monitor_oauth_security();

-- 5. Fix existing database functions security (add missing search_path)
CREATE OR REPLACE FUNCTION public.check_rate_limit(operation_name text, max_attempts integer DEFAULT 5, window_minutes integer DEFAULT 15)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

-- 6. Create comprehensive security monitoring function
CREATE OR REPLACE FUNCTION public.log_critical_security_event(
  event_type text,
  threat_level text DEFAULT 'high',
  details jsonb DEFAULT '{}',
  auto_response text DEFAULT NULL
) RETURNS void AS $$
BEGIN
  -- Log the critical event
  INSERT INTO public.security_audit_log (
    user_id, action, table_name,
    new_values, ip_address
  ) VALUES (
    auth.uid(), 
    format('CRITICAL_SECURITY_%s', upper(event_type)), 
    'security_events',
    jsonb_build_object(
      'threat_level', threat_level,
      'details', details,
      'auto_response', auto_response,
      'timestamp', now(),
      'investigation_required', threat_level = 'critical'
    ),
    inet_client_addr()::text
  );
  
  -- Auto-escalate critical threats
  IF threat_level = 'critical' THEN
    RAISE WARNING 'CRITICAL SECURITY THREAT DETECTED: % - Details: %', event_type, details;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';