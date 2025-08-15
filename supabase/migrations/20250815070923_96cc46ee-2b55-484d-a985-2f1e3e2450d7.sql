-- Fix function conflict and RLS policies

-- 1. Drop existing function and recreate with correct signature
DROP FUNCTION IF EXISTS public.is_org_member(uuid);
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

-- 2. Update organizations RLS policy
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

-- 3. Update organization_members policies
DROP POLICY IF EXISTS "Users can view their memberships" ON public.organization_members;
CREATE POLICY "Users can view their memberships" 
ON public.organization_members 
FOR SELECT 
USING (user_id = auth.uid());