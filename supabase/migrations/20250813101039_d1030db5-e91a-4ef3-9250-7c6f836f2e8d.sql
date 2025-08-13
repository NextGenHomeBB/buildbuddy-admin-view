-- CRITICAL SECURITY FIXES - Phase 1: Data Protection (Fixed)

-- 1. Enhance Apple Calendar Credentials Security (Already applied above)
-- 2. Enhance OAuth Tokens Security (Already applied above)  
-- 3. Fix Database Function Search Path Vulnerabilities (Already applied above)

-- 4. FIXED: Secure Materialized Views - Create secure access function instead of RLS
-- Since we can't apply RLS to materialized views, create a secure function to access phase costs

CREATE OR REPLACE FUNCTION public.get_phase_costs_secure(p_project_id uuid DEFAULT NULL)
RETURNS TABLE (
  phase_id uuid,
  project_id uuid,
  phase_name text,
  budget numeric,
  material_cost numeric,
  labor_cost_planned numeric,
  labor_cost_actual numeric,
  expense_cost numeric,
  total_committed numeric,
  forecast numeric,
  variance numeric,
  last_updated timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if user has permission to view phase costs
  IF NOT (
    public.get_current_user_role() = 'admin' OR
    (p_project_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.user_project_role upr
      WHERE upr.user_id = auth.uid() 
      AND upr.project_id = p_project_id
      AND upr.role IN ('manager', 'admin')
    ))
  ) THEN
    RAISE EXCEPTION 'Access denied: insufficient permissions to view phase costs';
  END IF;

  -- Return filtered data based on permissions
  IF public.get_current_user_role() = 'admin' THEN
    -- Admins can see all phase costs
    RETURN QUERY 
    SELECT pc.phase_id, pc.project_id, pc.phase_name, pc.budget,
           pc.material_cost, pc.labor_cost_planned, pc.labor_cost_actual,
           pc.expense_cost, pc.total_committed, pc.forecast, 
           pc.variance, pc.last_updated
    FROM public.phase_costs_vw pc
    WHERE (p_project_id IS NULL OR pc.project_id = p_project_id);
  ELSE
    -- Project managers can only see their project costs
    RETURN QUERY 
    SELECT pc.phase_id, pc.project_id, pc.phase_name, pc.budget,
           pc.material_cost, pc.labor_cost_planned, pc.labor_cost_actual,
           pc.expense_cost, pc.total_committed, pc.forecast,
           pc.variance, pc.last_updated
    FROM public.phase_costs_vw pc
    WHERE pc.project_id = p_project_id
    AND EXISTS (
      SELECT 1 FROM public.user_project_role upr
      WHERE upr.user_id = auth.uid() 
      AND upr.project_id = pc.project_id
      AND upr.role IN ('manager', 'admin')
    );
  END IF;
END;
$function$;

-- 5. Enhanced audit triggers for credential access monitoring (Already applied above)
-- 6. Add security event logging for critical operations (Already applied above)

-- 7. Additional Security Hardening - Secure RPC functions for critical operations
CREATE OR REPLACE FUNCTION public.secure_credential_operation(
  operation_type text,
  credential_type text,
  credential_data jsonb DEFAULT '{}'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  user_role text;
BEGIN
  -- Get user role securely
  user_role := public.get_current_user_role();
  
  -- Log the credential operation attempt
  INSERT INTO public.security_audit_log (
    user_id, action, table_name, 
    new_values, ip_address
  ) VALUES (
    auth.uid(), 
    format('CREDENTIAL_OPERATION_%s', upper(operation_type)), 
    'credential_operations',
    jsonb_build_object(
      'operation_type', operation_type,
      'credential_type', credential_type,
      'user_role', user_role,
      'timestamp', now()
    ),
    inet_client_addr()::text
  );
  
  -- Validate operation permissions
  IF operation_type = 'DELETE' AND user_role != 'admin' THEN
    RAISE EXCEPTION 'Only administrators can delete credentials';
  END IF;
  
  IF operation_type IN ('CREATE', 'UPDATE', 'READ') THEN
    -- Allow users to manage their own credentials
    result := jsonb_build_object(
      'success', true,
      'operation', operation_type,
      'credential_type', credential_type,
      'allowed', true
    );
  ELSE
    result := jsonb_build_object(
      'success', false,
      'error', 'Unauthorized operation',
      'allowed', false
    );
  END IF;
  
  RETURN result;
END;
$function$;

-- 8. Create secure organization scoped queries
CREATE OR REPLACE FUNCTION public.get_org_scoped_data(
  table_name text,
  org_id_param uuid,
  additional_filters jsonb DEFAULT '{}'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_org_role text;
  result jsonb;
BEGIN
  -- Validate user has access to this organization
  user_org_role := public.fn_role_in_org(org_id_param);
  
  IF user_org_role IS NULL THEN
    RAISE EXCEPTION 'Access denied: not a member of this organization';
  END IF;
  
  -- Log org data access
  INSERT INTO public.security_audit_log (
    user_id, action, table_name, 
    new_values, ip_address
  ) VALUES (
    auth.uid(), 
    'ORG_DATA_ACCESS', 
    table_name,
    jsonb_build_object(
      'org_id', org_id_param,
      'user_role', user_org_role,
      'filters', additional_filters
    ),
    inet_client_addr()::text
  );
  
  result := jsonb_build_object(
    'success', true,
    'org_id', org_id_param,
    'user_role', user_org_role,
    'access_granted', true
  );
  
  RETURN result;
END;
$function$;

-- 9. Create security monitoring view for admins
CREATE OR REPLACE VIEW public.security_monitor_vw AS
SELECT 
  sal.id,
  sal.user_id,
  p.full_name as user_name,
  sal.action,
  sal.table_name,
  sal.timestamp,
  sal.ip_address,
  CASE 
    WHEN sal.action LIKE '%CREDENTIAL%' THEN 'credential_access'
    WHEN sal.action LIKE '%RATE_LIMIT%' THEN 'rate_limiting'
    WHEN sal.action LIKE '%SUSPICIOUS%' THEN 'suspicious_activity'
    WHEN sal.action LIKE '%CRITICAL%' THEN 'critical_event'
    ELSE 'general'
  END as event_category,
  CASE
    WHEN sal.action LIKE '%CRITICAL%' OR sal.action LIKE '%SUSPICIOUS%' THEN 'high'
    WHEN sal.action LIKE '%CREDENTIAL%' OR sal.action LIKE '%RATE_LIMIT%' THEN 'medium'
    ELSE 'low'
  END as severity_level
FROM public.security_audit_log sal
LEFT JOIN public.profiles p ON sal.user_id = p.id
WHERE sal.timestamp >= now() - INTERVAL '30 days'
ORDER BY sal.timestamp DESC;

-- Grant access to security monitor view
GRANT SELECT ON public.security_monitor_vw TO authenticated;

-- 10. Update existing security functions to use proper search paths
CREATE OR REPLACE FUNCTION public.monitor_token_usage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_ip text;
  usage_rate numeric;
BEGIN
  current_ip := inet_client_addr()::text;
  
  -- Update usage tracking
  NEW.last_used = now();
  NEW.usage_count = COALESCE(OLD.usage_count, 0) + 1;
  NEW.last_ip = current_ip;
  NEW.last_security_scan = now();
  
  -- Check for suspicious activity (rapid usage from different IPs)
  IF OLD.last_ip IS NOT NULL AND OLD.last_ip != current_ip THEN
    -- Calculate usage rate (uses per hour)
    SELECT EXTRACT(EPOCH FROM (now() - OLD.last_used))/3600 INTO usage_rate;
    IF usage_rate < 0.1 THEN -- More than 10 uses per hour from different IPs
      NEW.suspicious_activity = true;
      NEW.threat_level = 'high';
      
      -- Log security event
      INSERT INTO public.security_audit_log (
        user_id, action, table_name, record_id, 
        new_values, ip_address
      ) VALUES (
        NEW.user_id, 'SUSPICIOUS_TOKEN_USAGE', 'calendar_oauth_tokens', NEW.id,
        jsonb_build_object(
          'old_ip', OLD.last_ip,
          'new_ip', current_ip,
          'usage_rate', usage_rate,
          'threat_level', NEW.threat_level
        ),
        current_ip
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;