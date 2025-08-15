-- Fix infinite recursion in organization_members RLS policy
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view their memberships" ON public.organization_members;

-- Create a simple, non-recursive policy for users to view their own memberships
CREATE POLICY "Users can view own memberships" 
ON public.organization_members FOR SELECT 
USING (user_id = auth.uid());

-- Also fix the organizations policy to not cause recursion
DROP POLICY IF EXISTS "Workers can view their organization" ON public.organizations;

-- Create a direct policy for organization access that doesn't call functions
CREATE POLICY "Members can view their organizations" 
ON public.organizations FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.org_id = organizations.id 
    AND om.user_id = auth.uid()
    AND om.status = 'active'
    AND (om.expires_at IS NULL OR om.expires_at > now())
  )
);