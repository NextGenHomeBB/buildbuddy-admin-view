-- Fix invitation RLS policies to work properly with global admins and organization roles
-- Remove existing policies
DROP POLICY IF EXISTS "Only org admins can delete invitations" ON public.invitations;
DROP POLICY IF EXISTS "Org admins can manage invitations" ON public.invitations;
DROP POLICY IF EXISTS "Restrict invitation updates to org admins only" ON public.invitations;
DROP POLICY IF EXISTS "Users can view own invitations by email" ON public.invitations;

-- Create new simplified policies

-- Global admins can manage all invitations
CREATE POLICY "Global admins can manage all invitations" 
ON public.invitations 
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Organization owners can manage invitations for their org
CREATE POLICY "Org owners can manage their invitations" 
ON public.invitations 
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = auth.uid() 
    AND om.org_id = invitations.org_id
    AND om.role = 'owner'
    AND om.status = 'active'
    AND (om.expires_at IS NULL OR om.expires_at > now())
  )
);

-- Users can view invitations sent to their email
CREATE POLICY "Users can view their email invitations" 
ON public.invitations 
FOR SELECT
USING (
  email = (
    SELECT users.email 
    FROM auth.users 
    WHERE users.id = auth.uid()
  )
);