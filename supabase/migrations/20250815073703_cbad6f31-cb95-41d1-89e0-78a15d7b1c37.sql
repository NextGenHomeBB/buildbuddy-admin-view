-- Fix RLS policies for organization members and create secure user role function
-- First drop existing problematic policies to avoid conflicts
DROP POLICY IF EXISTS "Org owners can manage members" ON public.organization_members;
DROP POLICY IF EXISTS "Users can view own membership" ON public.organization_members;
DROP POLICY IF EXISTS "Users can view own memberships" ON public.organization_members;

-- Create a secure function to get user's role in an organization
CREATE OR REPLACE FUNCTION public.get_user_org_role(p_org_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT role FROM public.organization_members 
  WHERE user_id = auth.uid() 
  AND org_id = p_org_id 
  AND status = 'active' 
  AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1;
$$;

-- Create a function to check if user is org member
CREATE OR REPLACE FUNCTION public.is_org_member(org_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.organization_members m
    WHERE m.org_id = org_uuid 
    AND m.user_id = auth.uid()
    AND m.status = 'active'
    AND (m.expires_at IS NULL OR m.expires_at > now())
  );
$$;

-- Create secure function to get current user role (global)
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- First check if user has admin role in user_roles table (global admin)
  SELECT COALESCE(
    (SELECT role::text FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin' LIMIT 1),
    -- Otherwise get role from organization membership
    (SELECT role FROM public.organization_members 
     WHERE user_id = auth.uid() 
     AND status = 'active' 
     AND (expires_at IS NULL OR expires_at > now())
     ORDER BY CASE role
       WHEN 'owner' THEN 1
       WHEN 'admin' THEN 2
       WHEN 'manager' THEN 3
       WHEN 'worker' THEN 4
       ELSE 5
     END
     LIMIT 1),
    'worker'  -- Default role
  );
$$;

-- Recreate organization_members policies
CREATE POLICY "Global admins can manage all members"
ON public.organization_members
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

CREATE POLICY "Org owners can manage members"
ON public.organization_members
FOR ALL
USING (
  get_user_org_role(org_id) IN ('owner', 'admin') OR
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

CREATE POLICY "Users can view own membership"
ON public.organization_members
FOR SELECT
USING (user_id = auth.uid());

-- Ensure profiles can be read by admins and users can read their own
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;

CREATE POLICY "Admins can read all profiles"
ON public.profiles
FOR SELECT
USING (get_current_user_role() = 'admin');

CREATE POLICY "Users can read own profile"
ON public.profiles
FOR SELECT
USING (id = auth.uid());

-- Allow org members to read profiles of other org members
CREATE POLICY "Org members can read member profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om1
    JOIN public.organization_members om2 ON om1.org_id = om2.org_id
    WHERE om1.user_id = auth.uid() 
    AND om2.user_id = profiles.id
    AND om1.status = 'active' 
    AND om2.status = 'active'
    AND (om1.expires_at IS NULL OR om1.expires_at > now())
    AND (om2.expires_at IS NULL OR om2.expires_at > now())
  )
);