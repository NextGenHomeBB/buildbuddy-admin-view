-- Remove org switching and implement single org scoping with RPCs and RLS

-- 1. Add default_org_id to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS default_org_id UUID REFERENCES public.organizations(id);

-- 2. Update profiles to have default_org_id (set to first org membership)
UPDATE public.profiles 
SET default_org_id = (
  SELECT om.org_id 
  FROM public.organization_members om 
  WHERE om.user_id = profiles.id 
  AND om.status = 'active'
  ORDER BY om.created_at ASC 
  LIMIT 1
)
WHERE default_org_id IS NULL;

-- 3. Create security definer functions for org access
CREATE OR REPLACE FUNCTION public.fn_is_member(p_org UUID)
RETURNS BOOLEAN 
LANGUAGE SQL 
SECURITY DEFINER 
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.organization_members m
    WHERE m.org_id = p_org 
    AND m.user_id = auth.uid()
    AND m.status = 'active'
    AND (m.expires_at IS NULL OR now() < m.expires_at)
  );
$$;

CREATE OR REPLACE FUNCTION public.fn_role_in_org(p_org UUID)
RETURNS TEXT 
LANGUAGE SQL 
SECURITY DEFINER 
SET search_path = public
AS $$
  SELECT m.role 
  FROM public.organization_members m
  WHERE m.org_id = p_org 
  AND m.user_id = auth.uid()
  AND m.status = 'active'
  AND (m.expires_at IS NULL OR now() < m.expires_at)
  LIMIT 1;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.fn_is_member(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_role_in_org(UUID) TO anon, authenticated;

-- 4. Create invite user RPC
CREATE OR REPLACE FUNCTION public.invite_user(
  p_org_id UUID,
  p_email TEXT,
  p_role TEXT,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token TEXT;
  v_current_role TEXT;
  v_invite_url TEXT;
BEGIN
  -- Check if current user has permission to invite
  v_current_role := public.fn_role_in_org(p_org_id);
  IF v_current_role NOT IN ('owner', 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions');
  END IF;

  -- Generate unique token
  v_token := gen_random_uuid()::text;
  
  -- Create invitation (with unique constraint on org_id, email)
  INSERT INTO public.invitations (org_id, email, role, token, expires_at)
  VALUES (p_org_id, p_email, p_role, v_token, COALESCE(p_expires_at, now() + INTERVAL '7 days'))
  ON CONFLICT (org_id, email) DO UPDATE SET
    role = EXCLUDED.role,
    token = EXCLUDED.token,
    expires_at = EXCLUDED.expires_at,
    status = 'pending',
    created_at = now();
  
  -- Build invite URL
  v_invite_url := format('%s/invite/%s', current_setting('app.base_url', true), v_token);
  
  RETURN jsonb_build_object(
    'success', true,
    'token', v_token,
    'invite_url', v_invite_url,
    'message', 'Invitation created successfully'
  );
END;
$$;

-- 5. Create accept invite RPC
CREATE OR REPLACE FUNCTION public.accept_invite(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite RECORD;
  v_user_email TEXT;
BEGIN
  -- Get current user email
  SELECT email INTO v_user_email FROM auth.users WHERE id = auth.uid();
  
  IF v_user_email IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not authenticated');
  END IF;
  
  -- Get invitation details
  SELECT * INTO v_invite
  FROM public.invitations
  WHERE token = p_token 
  AND status = 'pending'
  AND expires_at > now();
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;
  
  -- Verify email matches
  IF v_invite.email != v_user_email THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email does not match invitation');
  END IF;
  
  -- Create or update membership
  INSERT INTO public.organization_members (org_id, user_id, role, status, expires_at)
  VALUES (v_invite.org_id, auth.uid(), v_invite.role, 'active', v_invite.expires_at)
  ON CONFLICT (org_id, user_id) DO UPDATE SET
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    expires_at = EXCLUDED.expires_at;
  
  -- Update user's default_org_id if not set
  UPDATE public.profiles
  SET default_org_id = v_invite.org_id
  WHERE id = auth.uid() AND default_org_id IS NULL;
  
  -- Mark invitation as accepted
  UPDATE public.invitations
  SET status = 'accepted'
  WHERE token = p_token;
  
  RETURN jsonb_build_object(
    'success', true,
    'org_id', v_invite.org_id,
    'role', v_invite.role
  );
END;
$$;

-- 6. Add unique constraints (check if they exist first)
DO $$
BEGIN
  -- Add invitations unique constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'invitations_org_email_unique' 
    AND table_name = 'invitations'
  ) THEN
    ALTER TABLE public.invitations 
    ADD CONSTRAINT invitations_org_email_unique UNIQUE (org_id, email);
  END IF;
  
  -- Add organization_members unique constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'memberships_unique' 
    AND table_name = 'organization_members'
  ) THEN
    ALTER TABLE public.organization_members 
    ADD CONSTRAINT memberships_unique UNIQUE (org_id, user_id);
  END IF;
END $$;