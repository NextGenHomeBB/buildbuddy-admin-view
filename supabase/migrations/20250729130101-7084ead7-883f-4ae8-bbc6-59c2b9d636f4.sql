-- Fix database function security issues
-- Set secure search paths for all functions to prevent security vulnerabilities

-- Fix get_current_user_role function security
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

-- Fix user_has_role function security
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

-- Fix update_updated_at_column function security
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix create_user_profile function security
CREATE OR REPLACE FUNCTION public.create_user_profile(user_id uuid, user_email text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Insert or update the user profile (without role - roles managed separately)
  INSERT INTO public.profiles(id, full_name) 
  VALUES (user_id, COALESCE(user_email, 'User'))
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);

  -- Assign default worker role if user doesn't have any roles
  INSERT INTO public.user_roles(user_id, role)
  VALUES (user_id, 'worker'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  result := jsonb_build_object(
    'success', true,
    'user_id', user_id,
    'message', 'User profile created successfully'
  );
  
  RETURN result;
END;
$$;

-- Fix setup_demo_data function security
CREATE OR REPLACE FUNCTION public.setup_demo_data(manager_id uuid, worker_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  company_id UUID;
  project_id UUID;
  phase_id UUID;
  result JSONB;
BEGIN
  -- Only allow admins to run this function
  IF public.get_current_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Only admins can setup demo data';
  END IF;

  -- 1. Create a company
  INSERT INTO public.companies(id, name) 
  VALUES (gen_random_uuid(), 'Demo Construction') 
  RETURNING id INTO company_id;

  -- 2. Add users (manager & worker)
  INSERT INTO public.profiles(id, full_name, company_id) 
  VALUES 
    (manager_id, 'Jane Manager', company_id),
    (worker_id, 'Bob Worker', company_id);

  -- 3. Create a project
  INSERT INTO public.projects(id, company_id, name, manager_id, status) 
  VALUES (gen_random_uuid(), company_id, 'Sample Home', manager_id, 'active') 
  RETURNING id INTO project_id;

  -- 4. Create a phase
  INSERT INTO public.project_phases(id, project_id, name, status) 
  VALUES (gen_random_uuid(), project_id, 'Foundation', 'active') 
  RETURNING id INTO phase_id;

  -- 5. Create tasks
  INSERT INTO public.tasks(id, phase_id, project_id, title, assignee) 
  VALUES 
    (gen_random_uuid(), phase_id, project_id, 'Excavate trench', worker_id),
    (gen_random_uuid(), phase_id, project_id, 'Pour concrete', worker_id);

  -- 6. Map user roles to project
  INSERT INTO public.user_project_role(id, user_id, project_id, role) 
  VALUES 
    (gen_random_uuid(), manager_id, project_id, 'manager'),
    (gen_random_uuid(), worker_id, project_id, 'worker');

  -- Return success information
  result := jsonb_build_object(
    'success', true,
    'company_id', company_id,
    'project_id', project_id
  );
  
  RETURN result;
END;
$$;

-- Fix check_rate_limit function security
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

-- Fix complete_daily_task function security
CREATE OR REPLACE FUNCTION public.complete_daily_task(assignment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  assignment_record public.daily_task_assignments%ROWTYPE;
  task_record public.tasks%ROWTYPE;
  result jsonb;
BEGIN
  -- Get the assignment
  SELECT * INTO assignment_record
  FROM public.daily_task_assignments
  WHERE id = assignment_id AND worker_id = auth.uid();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Assignment not found');
  END IF;

  -- Get the task details
  SELECT * INTO task_record
  FROM public.tasks
  WHERE id = assignment_record.task_template_id;

  -- Update assignment as completed
  UPDATE public.daily_task_assignments
  SET status = 'completed', completed_at = NOW()
  WHERE id = assignment_id;

  -- Insert into history
  INSERT INTO public.task_completion_history (
    daily_assignment_id,
    worker_id,
    project_id,
    task_title,
    task_description,
    completion_date,
    completed_at
  ) VALUES (
    assignment_id,
    assignment_record.worker_id,
    assignment_record.project_id,
    task_record.title,
    task_record.description,
    CURRENT_DATE,
    NOW()
  );

  result := jsonb_build_object('success', true);
  RETURN result;
END;
$$;

-- Fix expire_old_daily_tasks function security
CREATE OR REPLACE FUNCTION public.expire_old_daily_tasks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Mark tasks as expired after 24 hours
  UPDATE public.daily_task_assignments 
  SET status = 'expired'
  WHERE expires_at < NOW() 
    AND status = 'pending';
END;
$$;