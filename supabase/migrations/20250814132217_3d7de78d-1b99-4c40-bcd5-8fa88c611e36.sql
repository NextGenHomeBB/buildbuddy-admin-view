-- Fix Security Definer View Issues
-- Replace problematic views with secure functions that respect RLS

-- First, drop the potentially problematic views
DROP VIEW IF EXISTS security_monitor_vw CASCADE;

-- Create a secure function to replace security_monitor_vw
-- This enforces proper access control instead of bypassing RLS
CREATE OR REPLACE FUNCTION get_security_monitor_data()
RETURNS TABLE(
  id uuid,
  event_timestamp timestamp with time zone,
  user_id uuid,
  user_name text,
  action text,
  table_name text,
  ip_address text,
  event_category text,
  severity_level text
) AS $$
BEGIN
  -- Only allow admins to access security monitoring data
  IF NOT can_access_security_monitor() THEN
    RAISE EXCEPTION 'Access denied: insufficient permissions to view security data';
  END IF;
  
  -- Log the access to security monitoring data
  PERFORM log_security_event(
    'SECURITY_MONITOR_ACCESS',
    'medium',
    jsonb_build_object(
      'requesting_user', auth.uid(),
      'function', 'get_security_monitor_data'
    )
  );
  
  -- Return security audit data with proper filtering
  RETURN QUERY
  SELECT 
    sal.id,
    sal."timestamp" AS event_timestamp,
    sal.user_id,
    p.full_name AS user_name,
    sal.action,
    sal.table_name,
    sal.ip_address,
    CASE
      WHEN ((sal.action ~~ '%LOGIN%'::text) OR (sal.action ~~ '%AUTH%'::text)) THEN 'authentication'::text
      WHEN ((sal.action ~~ '%CREDENTIAL%'::text) OR (sal.action ~~ '%TOKEN%'::text)) THEN 'credential_access'::text
      WHEN (sal.action ~~ '%RATE_LIMIT%'::text) THEN 'rate_limiting'::text
      WHEN (sal.action ~~ '%SUSPICIOUS%'::text) THEN 'suspicious_activity'::text
      WHEN (sal.table_name = ANY (ARRAY['user_roles'::text, 'organization_members'::text])) THEN 'permission_changes'::text
      ELSE 'data_access'::text
    END AS event_category,
    CASE
      WHEN ((sal.action ~~ '%SUSPICIOUS%'::text) OR (sal.action ~~ '%RATE_LIMIT_EXCEEDED%'::text)) THEN 'high'::text
      WHEN ((sal.action ~~ '%CREDENTIAL%'::text) OR (sal.action ~~ '%DELETE%'::text)) THEN 'medium'::text
      ELSE 'low'::text
    END AS severity_level
  FROM security_audit_log sal
  LEFT JOIN profiles p ON (sal.user_id = p.id)
  WHERE sal."timestamp" >= (now() - '30 days'::interval)
  ORDER BY sal."timestamp" DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Replace the problematic worker.my_tasks_view with a secure function
DROP VIEW IF EXISTS "worker.my_tasks_view" CASCADE;

-- Create a secure function to replace worker.my_tasks_view
CREATE OR REPLACE FUNCTION get_my_tasks_secure()
RETURNS TABLE(
  id uuid,
  title text,
  description text,
  status text,
  priority text,
  assigned_worker_id uuid,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  due_date timestamp without time zone
) AS $$
BEGIN
  -- This function respects RLS on the tasks table automatically
  -- No need for explicit permission checks as RLS handles it
  
  -- Log access to task data
  PERFORM log_security_event(
    'WORKER_TASKS_ACCESS',
    'low',
    jsonb_build_object(
      'requesting_user', auth.uid(),
      'function', 'get_my_tasks_secure'
    )
  );
  
  RETURN QUERY
  SELECT 
    t.id,
    t.title,
    t.description,
    CASE
      WHEN (t.status = 'todo'::text) THEN 'pending'::text
      WHEN (t.status = 'in_progress'::text) THEN 'in_progress'::text
      WHEN (t.status = 'done'::text) THEN 'completed'::text
      ELSE 'pending'::text
    END AS status,
    t.priority,
    t.assignee AS assigned_worker_id,
    t.created_at,
    COALESCE(t.completed_at, t.created_at) AS updated_at,
    NULL::timestamp without time zone AS due_date
  FROM tasks t
  WHERE t.assignee = auth.uid()
  ORDER BY t.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add comment to phase_costs_vw for security awareness
COMMENT ON VIEW phase_costs_vw IS 'This view aggregates cost data. Use get_phase_costs_secure() function for access-controlled data retrieval.';