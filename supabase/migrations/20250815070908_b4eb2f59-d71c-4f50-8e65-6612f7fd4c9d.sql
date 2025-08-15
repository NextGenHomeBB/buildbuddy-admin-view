-- Fix RLS policies for worker organization access

-- 1. Create is_org_member function if it doesn't exist
CREATE OR REPLACE FUNCTION public.is_org_member(org_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
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

-- 2. Update organizations RLS policy to allow workers to see their org
DROP POLICY IF EXISTS "Workers can view their organization" ON public.organizations;
CREATE POLICY "Workers can view their organization" 
ON public.organizations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.organization_members m
    WHERE m.org_id = organizations.id 
    AND m.user_id = auth.uid()
    AND m.status = 'active'
    AND (m.expires_at IS NULL OR m.expires_at > now())
  )
);

-- 3. Ensure organization_members RLS allows workers to read their own memberships
DROP POLICY IF EXISTS "Users can view their memberships" ON public.organization_members;
CREATE POLICY "Users can view their memberships" 
ON public.organization_members 
FOR SELECT 
USING (user_id = auth.uid());

-- 4. Add policy to allow workers to view profiles for org lookup
DROP POLICY IF EXISTS "Users can view profiles for org context" ON public.profiles;
CREATE POLICY "Users can view profiles for org context" 
ON public.profiles 
FOR SELECT 
USING (id = auth.uid());