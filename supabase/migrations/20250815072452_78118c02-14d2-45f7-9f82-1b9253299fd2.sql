-- Fix infinite recursion in organization_members RLS policies

-- Drop all existing policies that might conflict
DROP POLICY IF EXISTS "Org owners can manage members" ON public.organization_members;
DROP POLICY IF EXISTS "Users can view own memberships" ON public.organization_members;
DROP POLICY IF EXISTS "Users can view own membership" ON public.organization_members;

-- Create a security definer function to safely check user org role
CREATE OR REPLACE FUNCTION public.get_user_org_role(p_org_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT role FROM public.organization_members 
  WHERE user_id = auth.uid() 
  AND org_id = p_org_id 
  AND status = 'active' 
  AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1;
$$;

-- Recreate the policy using the security definer function
CREATE POLICY "Org owners can manage members"
ON public.organization_members
FOR ALL
USING (
  public.get_user_org_role(org_id) IN ('owner', 'admin') OR
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

-- Ensure users can view their own membership
CREATE POLICY "Users can view own membership"
ON public.organization_members
FOR SELECT
USING (user_id = auth.uid());