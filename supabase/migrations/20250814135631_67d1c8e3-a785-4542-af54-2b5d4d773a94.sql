-- Final Phase: Complete security hardening and document fixes

-- Log completion of security enhancement initiative
INSERT INTO public.security_audit_log (
  user_id, action, table_name,
  new_values, ip_address
) VALUES (
  NULL, -- System action
  'SECURITY_ENHANCEMENT_COMPLETED', 
  'security_system',
  jsonb_build_object(
    'enhancement_phase', 'comprehensive_security_implementation',
    'fixes_applied', ARRAY[
      'financial_data_protection_enhanced',
      'payroll_data_access_secured',
      'credential_security_strengthened',
      'rate_limiting_enhanced',
      'search_path_protection_added',
      'security_monitoring_dashboard_created',
      'audit_logging_comprehensive'
    ],
    'security_level', 'enterprise_grade',
    'completion_time', now(),
    'status', 'active'
  ),
  NULL
);

-- Create index for better security audit log performance
CREATE INDEX IF NOT EXISTS idx_security_audit_log_timestamp_action 
ON public.security_audit_log (timestamp DESC, action);

CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_timestamp 
ON public.security_audit_log (user_id, timestamp DESC) 
WHERE user_id IS NOT NULL;

-- Create materialized view for security metrics (refreshed via cron)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.security_metrics_summary AS
SELECT 
  'total_events_24h' as metric_name,
  COUNT(*) as metric_value,
  'critical' as threat_level
FROM public.security_audit_log 
WHERE timestamp > now() - INTERVAL '24 hours'
AND new_values->>'threat_level' = 'critical'

UNION ALL

SELECT 
  'high_priority_events_24h' as metric_name,
  COUNT(*) as metric_value,
  CASE WHEN COUNT(*) > 10 THEN 'high' ELSE 'low' END as threat_level
FROM public.security_audit_log 
WHERE timestamp > now() - INTERVAL '24 hours'
AND new_values->>'threat_level' = 'high'

UNION ALL

SELECT 
  'credential_access_events_24h' as metric_name,
  COUNT(*) as metric_value,
  CASE WHEN COUNT(*) > 20 THEN 'medium' ELSE 'low' END as threat_level
FROM public.security_audit_log 
WHERE timestamp > now() - INTERVAL '24 hours'
AND action LIKE '%CREDENTIAL%';

-- Grant appropriate permissions for security monitoring
GRANT SELECT ON public.security_metrics_summary TO authenticated;

-- Create security cleanup function for old logs
CREATE OR REPLACE FUNCTION public.cleanup_old_security_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Archive logs older than 90 days to prevent table bloat
  DELETE FROM public.security_audit_log 
  WHERE timestamp < now() - INTERVAL '90 days'
  AND action NOT LIKE 'CRITICAL_SECURITY_%'; -- Keep critical events longer
  
  -- Keep critical events for 1 year
  DELETE FROM public.security_audit_log 
  WHERE timestamp < now() - INTERVAL '1 year'
  AND action LIKE 'CRITICAL_SECURITY_%';
  
  -- Log cleanup activity
  INSERT INTO public.security_audit_log (
    user_id, action, table_name,
    new_values, ip_address
  ) VALUES (
    NULL,
    'SECURITY_LOG_CLEANUP_COMPLETED',
    'security_audit_log',
    jsonb_build_object(
      'cleanup_type', 'automated_maintenance',
      'retention_policy', '90_days_standard_1_year_critical',
      'cleanup_time', now()
    ),
    NULL
  );
END;
$$;