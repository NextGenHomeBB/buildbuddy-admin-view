-- Fix infinite loop in audit triggers by removing problematic sync trigger
-- and updating audit system to handle project worker assignments safely

-- First, drop the problematic sync trigger that causes infinite loops
DROP TRIGGER IF EXISTS sync_project_worker_assignment ON user_project_role;
DROP FUNCTION IF EXISTS sync_project_worker_assignment();

-- Update the enhanced audit trigger to avoid infinite recursion
CREATE OR REPLACE FUNCTION public.enhanced_audit_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  sensitive_tables text[] := ARRAY['user_roles', 'user_project_role', 'profiles', 'documents', 'document_payments', 'apple_calendar_credentials', 'calendar_oauth_tokens'];
  trigger_depth int;
BEGIN
  -- Check for recursion depth to prevent infinite loops
  trigger_depth := COALESCE(current_setting('app.trigger_depth', true)::int, 0);
  
  -- Prevent infinite recursion by limiting trigger depth
  IF trigger_depth > 3 THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Set trigger depth for this operation
  PERFORM set_config('app.trigger_depth', (trigger_depth + 1)::text, true);
  
  -- Log all operations on sensitive tables with enhanced security context
  IF TG_TABLE_NAME = ANY(sensitive_tables) THEN
    INSERT INTO public.security_audit_log (
      user_id, 
      action, 
      table_name, 
      record_id, 
      old_values, 
      new_values,
      ip_address
    ) VALUES (
      auth.uid(), 
      format('ENHANCED_%s', TG_OP), 
      TG_TABLE_NAME, 
      COALESCE(NEW.id, OLD.id),
      CASE WHEN TG_OP != 'INSERT' THEN row_to_json(OLD) END,
      CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW) END,
      inet_client_addr()::text
    );
  END IF;
  
  -- Reset trigger depth after operation
  PERFORM set_config('app.trigger_depth', trigger_depth::text, true);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Create a safe one-way sync function for project worker assignments
CREATE OR REPLACE FUNCTION public.update_project_assigned_workers()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  worker_ids uuid[];
  project_uuid uuid;
BEGIN
  -- Determine which project to update
  project_uuid := COALESCE(NEW.project_id, OLD.project_id);
  
  -- Skip if no project or if this is a system operation
  IF project_uuid IS NULL OR current_setting('app.skip_worker_sync', true) = 'true' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Get all active worker IDs for this project
  SELECT ARRAY_AGG(upr.user_id) INTO worker_ids
  FROM user_project_role upr
  WHERE upr.project_id = project_uuid
    AND upr.role = 'worker';
  
  -- Update the project's assigned_workers field (with sync prevention)
  PERFORM set_config('app.skip_worker_sync', 'true', true);
  
  UPDATE projects 
  SET assigned_workers = COALESCE(worker_ids, '[]'::uuid[])::jsonb
  WHERE id = project_uuid;
  
  PERFORM set_config('app.skip_worker_sync', 'false', true);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Create trigger for one-way sync from user_project_role to projects
DROP TRIGGER IF EXISTS update_project_workers_trigger ON user_project_role;
CREATE TRIGGER update_project_workers_trigger
  AFTER INSERT OR UPDATE OR DELETE ON user_project_role
  FOR EACH ROW EXECUTE FUNCTION update_project_assigned_workers();

-- Clean up any potential trigger conflicts
DROP TRIGGER IF EXISTS enhanced_audit_trigger ON user_project_role;
CREATE TRIGGER enhanced_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON user_project_role
  FOR EACH ROW EXECUTE FUNCTION enhanced_audit_trigger();

-- Ensure proper order by recreating triggers in correct sequence
DROP TRIGGER IF EXISTS enhanced_audit_trigger ON documents;
CREATE TRIGGER enhanced_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON documents
  FOR EACH ROW EXECUTE FUNCTION enhanced_audit_trigger();

DROP TRIGGER IF EXISTS enhanced_audit_trigger ON profiles;
CREATE TRIGGER enhanced_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON profiles
  FOR EACH ROW EXECUTE FUNCTION enhanced_audit_trigger();