-- Fix critical security vulnerability: Profile role escalation
-- Remove the ability for users to update their own role

-- Drop the existing self-update policy that allows role changes
DROP POLICY IF EXISTS "Profiles: self update" ON public.profiles;

-- Create a new self-update policy that excludes role updates
CREATE POLICY "Profiles: self update (no role)" 
ON public.profiles 
FOR UPDATE 
USING (id = auth.uid())
WITH CHECK (id = auth.uid() AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()));

-- Create admin-only policy for role updates
CREATE POLICY "Admins can update any profile role" 
ON public.profiles 
FOR UPDATE 
USING (get_current_user_role() = 'admin')
WITH CHECK (get_current_user_role() = 'admin');

-- Secure the user_project_role table with proper RLS
-- Add policy for users to view their own assignments
CREATE POLICY "Users can view their own project assignments" 
ON public.user_project_role 
FOR SELECT 
USING (user_id = auth.uid());

-- Fix database functions security - update with proper search path
CREATE OR REPLACE FUNCTION public.create_user_profile(user_id uuid, user_email text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Insert or update the user profile
  INSERT INTO public.profiles(id, full_name, role) 
  VALUES (user_id, COALESCE(user_email, 'User'), 'worker')
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);
    -- Note: Explicitly do NOT update role on conflict

  -- Return success information
  result := jsonb_build_object(
    'success', true,
    'user_id', user_id,
    'message', 'User profile created successfully'
  );
  
  RETURN result;
END;
$$;

-- Update setup_demo_data function with proper security
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
  IF get_current_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Only admins can setup demo data';
  END IF;

  -- 1. Create a company
  INSERT INTO public.companies(id, name) 
  VALUES (gen_random_uuid(), 'Demo Construction') 
  RETURNING id INTO company_id;

  -- 2. Add users (manager & worker)
  INSERT INTO public.profiles(id, full_name, role, company_id) 
  VALUES 
    (manager_id, 'Jane Manager', 'manager', company_id),
    (worker_id, 'Bob Worker', 'worker', company_id);

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