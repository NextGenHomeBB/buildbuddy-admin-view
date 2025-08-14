-- Fix circular RLS dependency on organization_members table
-- Remove the problematic policy that calls fn_role_in_org() on organization_members
DROP POLICY IF EXISTS "Org admins can manage members" ON public.organization_members;

-- Create a simpler policy that doesn't cause circular dependency
-- Allow global admins to manage all members
CREATE POLICY "Global admins can manage all members" 
ON public.organization_members 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Allow organization owners to manage members in their org
CREATE POLICY "Org owners can manage members" 
ON public.organization_members 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om2
    WHERE om2.user_id = auth.uid() 
    AND om2.org_id = organization_members.org_id
    AND om2.role = 'owner'
    AND om2.status = 'active'
    AND (om2.expires_at IS NULL OR om2.expires_at > now())
  )
);

-- Ensure users can always see their own membership
-- This policy should already exist but let's make sure it's correct
DROP POLICY IF EXISTS "members: select my rows" ON public.organization_members;
CREATE POLICY "Users can view own membership" 
ON public.organization_members 
FOR SELECT 
USING (user_id = auth.uid());