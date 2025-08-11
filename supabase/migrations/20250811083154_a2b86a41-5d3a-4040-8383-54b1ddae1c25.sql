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

-- 6. Add unique constraints
ALTER TABLE public.invitations 
ADD CONSTRAINT IF NOT EXISTS invitations_org_email_unique UNIQUE (org_id, email);

ALTER TABLE public.organization_members 
ADD CONSTRAINT IF NOT EXISTS memberships_unique UNIQUE (org_id, user_id);

-- 7. Update RLS policies for org-scoped tables

-- Projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS proj_read ON public.projects;
CREATE POLICY proj_read ON public.projects 
FOR SELECT USING (public.fn_is_member(org_id));

DROP POLICY IF EXISTS proj_write ON public.projects;
CREATE POLICY proj_write ON public.projects 
FOR ALL USING (public.fn_is_member(org_id)) 
WITH CHECK (public.fn_is_member(org_id));

-- Tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Org admins can manage org data" ON public.tasks;
DROP POLICY IF EXISTS "Org members can read org data" ON public.tasks;
CREATE POLICY task_read ON public.tasks 
FOR SELECT USING (public.fn_is_member(org_id));

CREATE POLICY task_write ON public.tasks 
FOR ALL USING (public.fn_is_member(org_id)) 
WITH CHECK (public.fn_is_member(org_id));

-- Project Phases
ALTER TABLE public.project_phases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin only access to project_phases" ON public.project_phases;
CREATE POLICY phase_read ON public.project_phases 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = project_phases.project_id 
    AND public.fn_is_member(p.org_id)
  )
);

CREATE POLICY phase_write ON public.project_phases 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = project_phases.project_id 
    AND public.fn_is_member(p.org_id)
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = project_phases.project_id 
    AND public.fn_is_member(p.org_id)
  )
);

-- Shifts
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage all shifts" ON public.shifts;
DROP POLICY IF EXISTS "Workers can update their shift status" ON public.shifts;
DROP POLICY IF EXISTS "Workers can view their own shifts" ON public.shifts;
CREATE POLICY shift_read ON public.shifts 
FOR SELECT USING (public.fn_is_member(org_id));

CREATE POLICY shift_write ON public.shifts 
FOR ALL USING (public.fn_is_member(org_id)) 
WITH CHECK (public.fn_is_member(org_id));

-- Materials
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin only access to materials" ON public.materials;
CREATE POLICY material_read ON public.materials 
FOR SELECT USING (public.fn_is_member(org_id));

CREATE POLICY material_write ON public.materials 
FOR ALL USING (public.fn_is_member(org_id)) 
WITH CHECK (public.fn_is_member(org_id));

-- Time logs (if has org_id)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'time_logs' AND column_name = 'org_id') THEN
    ALTER TABLE public.time_logs ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS timelog_read ON public.time_logs;
    CREATE POLICY timelog_read ON public.time_logs 
    FOR SELECT USING (public.fn_is_member(org_id));
    
    CREATE POLICY timelog_write ON public.time_logs 
    FOR ALL USING (public.fn_is_member(org_id)) 
    WITH CHECK (public.fn_is_member(org_id));
  END IF;
END $$;

-- Phase expenses
ALTER TABLE public.phase_expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage all phase expenses" ON public.phase_expenses;
DROP POLICY IF EXISTS "Project managers can manage phase expenses for their projects" ON public.phase_expenses;
CREATE POLICY expense_read ON public.phase_expenses 
FOR SELECT USING (public.fn_is_member(org_id));

CREATE POLICY expense_write ON public.phase_expenses 
FOR ALL USING (public.fn_is_member(org_id)) 
WITH CHECK (public.fn_is_member(org_id));

-- Invitations RLS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Org admins can manage invitations" ON public.invitations;
DROP POLICY IF EXISTS "Users can view invitations by token" ON public.invitations;

CREATE POLICY inv_read ON public.invitations 
FOR SELECT USING (
  public.fn_is_member(org_id) AND 
  public.fn_role_in_org(org_id) IN ('owner', 'admin', 'manager')
);

CREATE POLICY inv_write ON public.invitations 
FOR ALL USING (
  public.fn_is_member(org_id) AND 
  public.fn_role_in_org(org_id) IN ('owner', 'admin')
) WITH CHECK (
  public.fn_is_member(org_id) AND 
  public.fn_role_in_org(org_id) IN ('owner', 'admin')
);

-- Public access for token validation
CREATE POLICY inv_token_access ON public.invitations 
FOR SELECT USING (
  token IS NOT NULL AND 
  status = 'pending' AND 
  expires_at > now()
);