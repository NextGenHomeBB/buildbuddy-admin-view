-- PHASE 1: temporarily freeze ALL audit triggers so migration can't recurse,
-- install an audit guard, and add a safe task-assignment validator.

-- 0) Timeouts so the UI doesn't hang forever
SET LOCAL statement_timeout = '90s';
SET LOCAL lock_timeout = '5s';

-- 1) Disable every trigger that looks like an audit trigger in public schema
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT event_object_schema, event_object_table, trigger_name
    FROM information_schema.triggers
    WHERE event_object_schema = 'public'
      AND (trigger_name ILIKE '%audit%' OR action_statement ILIKE '%audit%')
  LOOP
    EXECUTE format('ALTER TABLE %I.%I DISABLE TRIGGER %I;',
                   r.event_object_schema, r.event_object_table, r.trigger_name);
  END LOOP;
END $$;

-- 2) Install an audit guard (GUC) we can check inside audit functions
CREATE OR REPLACE FUNCTION public.audit_guard_on() 
RETURNS VOID
LANGUAGE SQL AS $$ 
  SELECT set_config('app.audit_disabled','on', true); 
$$;

CREATE OR REPLACE FUNCTION public.audit_guard_off() 
RETURNS VOID
LANGUAGE SQL AS $$ 
  SELECT set_config('app.audit_disabled','off', true); 
$$;

-- Helper that audit functions can call
CREATE OR REPLACE FUNCTION public.audit_guard_blocked()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT COALESCE(current_setting('app.audit_disabled', true),'off') = 'on'
         OR pg_trigger_depth() > 1;
$$;

-- 3) Patch existing audit functions to respect the guard
CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  -- Check audit guard first
  IF public.audit_guard_blocked() THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.security_audit_log (user_id, action, table_name, record_id, new_values, ip_address)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, NEW.id, row_to_json(NEW), COALESCE(inet_client_addr()::text, 'unknown'));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.security_audit_log (user_id, action, table_name, record_id, old_values, new_values, ip_address)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, NEW.id, row_to_json(OLD), row_to_json(NEW), COALESCE(inet_client_addr()::text, 'unknown'));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.security_audit_log (user_id, action, table_name, record_id, old_values, ip_address)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, OLD.id, row_to_json(OLD), COALESCE(inet_client_addr()::text, 'unknown'));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.enhanced_audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  sensitive_tables text[] := ARRAY['user_roles', 'user_project_role', 'profiles', 'documents', 'document_payments', 'apple_calendar_credentials', 'calendar_oauth_tokens'];
  trigger_depth int;
BEGIN
  -- Check audit guard first
  IF public.audit_guard_blocked() THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

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
$$;

-- 4) SAFE validator for task assignment (no cross-table writes = no recursion)
CREATE OR REPLACE FUNCTION public.validate_task_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_project uuid;
BEGIN
  -- Derive project id
  IF TG_OP = 'INSERT' THEN
    v_project := NEW.project_id;
  ELSE
    v_project := COALESCE(NEW.project_id, OLD.project_id);
  END IF;

  -- Only validate if assignee is being set
  IF NEW.assignee IS NOT NULL THEN
    -- Check if user has project access via user_project_role table
    IF NOT EXISTS (
      SELECT 1
      FROM public.user_project_role upr
      WHERE upr.project_id = v_project
        AND upr.user_id = NEW.assignee
        AND upr.role IN ('worker', 'manager', 'admin')
    ) THEN
      -- Also check if user is in assigned_workers JSONB array
      IF NOT EXISTS (
        SELECT 1
        FROM public.projects p
        WHERE p.id = v_project
          AND p.assigned_workers ? NEW.assignee::text
      ) THEN
        RAISE EXCEPTION 'Assignee % has no access to project %', NEW.assignee, v_project
          USING ERRCODE = 'P0001';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing task assignment triggers to avoid conflicts
DROP TRIGGER IF EXISTS check_task_assignee_trigger ON public.tasks;
DROP TRIGGER IF EXISTS trg_validate_task_assignment ON public.tasks;

-- Create the new safe task assignment trigger
CREATE TRIGGER trg_validate_task_assignment
  BEFORE INSERT OR UPDATE OF assignee, project_id
  ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_task_assignment();

-- 5) Re-enable all audit triggers we disabled in step 1
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT event_object_schema, event_object_table, trigger_name
    FROM information_schema.triggers
    WHERE event_object_schema = 'public'
      AND (trigger_name ILIKE '%audit%' OR action_statement ILIKE '%audit%')
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE TRIGGER %I;',
                   r.event_object_schema, r.event_object_table, r.trigger_name);
  END LOOP;
END $$;