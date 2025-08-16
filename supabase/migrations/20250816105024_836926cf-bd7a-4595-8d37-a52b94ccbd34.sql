-- Fix RLS infinite recursion and project assignment issues (part 2)

-- 1. Drop existing function with different parameter names
DROP FUNCTION IF EXISTS public.can_access_project(uuid, uuid);

-- 2. Create security definer function to check project assignment permissions
CREATE OR REPLACE FUNCTION public.can_assign_to_project(p_project_id uuid, p_assigner_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  assigner_role text;
  project_org_id uuid;
  assigner_org_role text;
BEGIN
  -- Get assigner's global role
  SELECT role::text INTO assigner_role
  FROM public.user_roles 
  WHERE user_id = p_assigner_id 
  LIMIT 1;
  
  -- Global admins can assign anyone to any project
  IF assigner_role = 'admin' THEN
    RETURN true;
  END IF;
  
  -- Get project's organization
  SELECT org_id INTO project_org_id
  FROM public.projects 
  WHERE id = p_project_id;
  
  -- If project has no org_id, only global admins can assign
  IF project_org_id IS NULL THEN
    RETURN assigner_role = 'admin';
  END IF;
  
  -- Check if assigner is org admin/owner for this project's org
  SELECT role INTO assigner_org_role
  FROM public.organization_members
  WHERE user_id = p_assigner_id 
    AND org_id = project_org_id
    AND status = 'active'
    AND (expires_at IS NULL OR expires_at > now());
  
  RETURN assigner_org_role IN ('owner', 'admin');
END;
$$;

-- 3. Create helper function to check if user can access project
CREATE OR REPLACE FUNCTION public.can_access_project(p_project_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role text;
  project_org_id uuid;
BEGIN
  -- Get user's global role
  SELECT role::text INTO user_role
  FROM public.user_roles 
  WHERE user_id = p_user_id 
  LIMIT 1;
  
  -- Global admins can access any project
  IF user_role = 'admin' THEN
    RETURN true;
  END IF;
  
  -- Check if user is assigned to the project
  IF EXISTS (
    SELECT 1 FROM public.user_project_role
    WHERE user_id = p_user_id AND project_id = p_project_id
  ) THEN
    RETURN true;
  END IF;
  
  -- Check if user is org member for this project's organization
  SELECT org_id INTO project_org_id
  FROM public.projects 
  WHERE id = p_project_id;
  
  IF project_org_id IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE user_id = p_user_id 
        AND org_id = project_org_id
        AND status = 'active'
        AND (expires_at IS NULL OR expires_at > now())
    );
  END IF;
  
  RETURN false;
END;
$$;