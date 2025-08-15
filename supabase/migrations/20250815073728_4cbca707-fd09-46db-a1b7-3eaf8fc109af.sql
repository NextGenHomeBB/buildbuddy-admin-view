-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Global admins can manage all members" ON public.organization_members;
DROP POLICY IF EXISTS "Org owners can manage members" ON public.organization_members;
DROP POLICY IF EXISTS "Users can view own membership" ON public.organization_members;
DROP POLICY IF EXISTS "Org members can read member profiles" ON public.profiles;

-- Recreate organization_members policies with unique names
CREATE POLICY "Org_global_admin_manage_all"
ON public.organization_members
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

CREATE POLICY "Org_owner_admin_manage"
ON public.organization_members
FOR ALL
USING (
  get_user_org_role(org_id) IN ('owner', 'admin') OR
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

CREATE POLICY "User_view_own_membership"
ON public.organization_members
FOR SELECT
USING (user_id = auth.uid());

-- Allow org members to read profiles of other org members
CREATE POLICY "Org_member_read_profiles"
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