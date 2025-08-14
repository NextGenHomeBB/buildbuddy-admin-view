-- Create the missing get_current_user_role RPC function that frontend expects
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

-- Create missing helper functions for security monitoring
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
  
  DELETE FROM public.rate_limits 
  WHERE window_start < window_start_time;
  
  SELECT COALESCE(SUM(attempt_count), 0) INTO current_attempts
  FROM public.rate_limits
  WHERE user_id = auth.uid() 
    AND operation = operation_name 
    AND window_start >= window_start_time;
  
  IF current_attempts >= max_attempts THEN
    RETURN false;
  END IF;
  
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

-- Create safe logging function  
CREATE OR REPLACE FUNCTION public.safe_log_critical_security_event(event_type text, severity text DEFAULT 'medium'::text, details jsonb DEFAULT '{}'::jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
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
    RETURN true;
  EXCEPTION WHEN OTHERS THEN
    RETURN false;
  END;
END;
$$;

-- Create log critical security event function
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

-- Create is_hr_administrator function
CREATE OR REPLACE FUNCTION public.is_hr_administrator()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  );
$$;

-- Update progress functions needed for projects
CREATE OR REPLACE FUNCTION public.update_phase_progress(p_phase_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total_tasks integer;
  completed_tasks integer;
  phase_progress numeric;
BEGIN
  SELECT COUNT(*) INTO total_tasks
  FROM public.tasks
  WHERE phase_id = p_phase_id;
  
  SELECT COUNT(*) INTO completed_tasks
  FROM public.tasks
  WHERE phase_id = p_phase_id AND status = 'completed';
  
  IF total_tasks > 0 THEN
    phase_progress := (completed_tasks::numeric / total_tasks::numeric) * 100;
  ELSE
    phase_progress := 0;
  END IF;
  
  UPDATE public.project_phases
  SET progress = phase_progress, updated_at = now()
  WHERE id = p_phase_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_project_progress(p_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total_phases integer;
  avg_progress numeric;
BEGIN
  SELECT COUNT(*), AVG(progress) INTO total_phases, avg_progress
  FROM public.project_phases
  WHERE project_id = p_project_id;
  
  UPDATE public.projects
  SET progress = COALESCE(avg_progress, 0)
  WHERE id = p_project_id;
END;
$$;

-- Create document number sequence function
CREATE OR REPLACE FUNCTION public.next_document_number(doc_type text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_year integer;
  next_number integer;
  prefix_text text;
  full_number text;
BEGIN
  current_year := EXTRACT(year FROM CURRENT_DATE);
  
  -- Get or create sequence for this document type and year
  INSERT INTO public.document_sequences (document_type, year, prefix, current_number)
  VALUES (doc_type, current_year, UPPER(doc_type), 0)
  ON CONFLICT (document_type, year) DO NOTHING;
  
  -- Get next number and increment
  UPDATE public.document_sequences
  SET current_number = current_number + 1
  WHERE document_type = doc_type AND year = current_year
  RETURNING current_number, prefix INTO next_number, prefix_text;
  
  -- Format number
  full_number := prefix_text || '-' || current_year || '-' || LPAD(next_number::text, 4, '0');
  
  RETURN full_number;
END;
$$;