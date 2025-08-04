-- Security Fix Migration: Address Critical Database Security Issues

-- Fix 1: Update security-sensitive functions to include SET search_path = 'public'
-- This prevents SQL injection attacks through search_path manipulation

CREATE OR REPLACE FUNCTION public.get_current_user_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
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

CREATE OR REPLACE FUNCTION public.user_has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.validate_role_assignment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $$
BEGIN
  -- Prevent self-assignment of admin or manager roles unless done by an admin
  IF NEW.role IN ('admin', 'manager') AND NEW.user_id = auth.uid() THEN
    IF NOT public.user_has_role(auth.uid(), 'admin'::public.app_role) THEN
      RAISE EXCEPTION 'Users cannot assign themselves admin or manager roles';
    END IF;
  END IF;
  
  -- Only admins can assign admin role
  IF NEW.role = 'admin' AND NOT public.user_has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins can assign admin roles';
  END IF;
  
  -- Only admins or managers can assign manager role
  IF NEW.role = 'manager' AND NOT (public.user_has_role(auth.uid(), 'admin'::public.app_role) OR public.user_has_role(auth.uid(), 'manager'::public.app_role)) THEN
    RAISE EXCEPTION 'Only admins or managers can assign manager roles';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_task_assignment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $$
BEGIN
  -- If assigning a task to someone, verify they have project access
  IF NEW.assignee IS NOT NULL AND NEW.project_id IS NOT NULL THEN
    -- Check if assignee has access to the project
    IF NOT EXISTS (
      SELECT 1 FROM public.user_project_role 
      WHERE user_id = NEW.assignee AND project_id = NEW.project_id
    ) AND NOT public.user_has_role(NEW.assignee, 'admin'::public.app_role) THEN
      RAISE EXCEPTION 'Cannot assign task to user without project access';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_trigger_function()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.security_audit_log (user_id, action, table_name, record_id, new_values, ip_address)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, NEW.id, row_to_json(NEW), inet_client_addr()::text);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.security_audit_log (user_id, action, table_name, record_id, old_values, new_values, ip_address)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, NEW.id, row_to_json(OLD), row_to_json(NEW), inet_client_addr()::text);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.security_audit_log (user_id, action, table_name, record_id, old_values, ip_address)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, OLD.id, row_to_json(OLD), inet_client_addr()::text);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.enhanced_audit_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $$
DECLARE
  sensitive_tables text[] := ARRAY['user_roles', 'user_project_role', 'profiles'];
BEGIN
  -- Log all operations on sensitive tables with additional context
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
      TG_OP, 
      TG_TABLE_NAME, 
      COALESCE(NEW.id, OLD.id),
      CASE WHEN TG_OP != 'INSERT' THEN row_to_json(OLD) END,
      CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW) END,
      inet_client_addr()::text
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Fix 2: Add rate limiting for sensitive operations
CREATE OR REPLACE FUNCTION public.check_rate_limit(operation_name text, max_attempts integer DEFAULT 5, window_minutes integer DEFAULT 15)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
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

-- Fix 3: Add security constraint for unique user-operation rate limiting
CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_limits_user_operation 
ON public.rate_limits (user_id, operation);

-- Fix 4: Add trigger for enhanced audit logging on sensitive tables
DO $$
BEGIN
  -- Drop existing triggers if they exist
  DROP TRIGGER IF EXISTS enhanced_audit_trigger_user_roles ON public.user_roles;
  DROP TRIGGER IF EXISTS enhanced_audit_trigger_user_project_role ON public.user_project_role;
  DROP TRIGGER IF EXISTS enhanced_audit_trigger_profiles ON public.profiles;
  
  -- Create new enhanced audit triggers
  CREATE TRIGGER enhanced_audit_trigger_user_roles
    AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
    FOR EACH ROW EXECUTE FUNCTION public.enhanced_audit_trigger();
    
  CREATE TRIGGER enhanced_audit_trigger_user_project_role
    AFTER INSERT OR UPDATE OR DELETE ON public.user_project_role
    FOR EACH ROW EXECUTE FUNCTION public.enhanced_audit_trigger();
    
  CREATE TRIGGER enhanced_audit_trigger_profiles
    AFTER INSERT OR UPDATE OR DELETE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.enhanced_audit_trigger();
END
$$;