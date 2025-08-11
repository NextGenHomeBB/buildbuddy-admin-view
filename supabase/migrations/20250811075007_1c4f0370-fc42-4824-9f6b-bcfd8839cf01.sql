-- Phase 1: Multi-tenant organization schema updates

-- Create invitations table
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'manager', 'worker', 'contractor')),
  token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days')
);

-- Update organization_members to support contractor status and expiry
ALTER TABLE public.organization_members 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'invited', 'revoked')),
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- Add org_id to domain tables (projects already exists based on schema)
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.shifts ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id); 
ALTER TABLE public.time_logs ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.phase_expenses ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_invitations_org_id ON public.invitations(org_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);
CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON public.organization_members(org_id);
CREATE INDEX IF NOT EXISTS idx_tasks_org_id ON public.tasks(org_id);
CREATE INDEX IF NOT EXISTS idx_shifts_org_id ON public.shifts(org_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_org_id ON public.time_logs(org_id);

-- Enable RLS on invitations table
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Create security definer functions
CREATE OR REPLACE FUNCTION public.fn_is_member(p_org UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.organization_members om
    WHERE om.org_id = p_org 
    AND om.user_id = auth.uid()
    AND om.status = 'active'
    AND (om.expires_at IS NULL OR om.expires_at > now())
  );
$$;

CREATE OR REPLACE FUNCTION public.fn_role_in_org(p_org UUID)
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT om.role
  FROM public.organization_members om
  WHERE om.org_id = p_org 
  AND om.user_id = auth.uid()
  AND om.status = 'active'
  AND (om.expires_at IS NULL OR om.expires_at > now())
  LIMIT 1;
$$;

-- RPC functions for invitations
CREATE OR REPLACE FUNCTION public.invite_user(p_org_id UUID, p_email TEXT, p_role TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  invite_token TEXT;
  current_user_role TEXT;
BEGIN
  -- Check if current user is admin/owner of org
  current_user_role := public.fn_role_in_org(p_org_id);
  IF current_user_role NOT IN ('owner', 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions');
  END IF;

  -- Generate unique token
  invite_token := gen_random_uuid()::text;
  
  -- Create invitation
  INSERT INTO public.invitations (org_id, email, role, token)
  VALUES (p_org_id, p_email, p_role, invite_token);
  
  result := jsonb_build_object(
    'success', true,
    'token', invite_token,
    'message', 'Invitation created successfully'
  );
  
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_invite(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invite_record RECORD;
  user_email TEXT;
  result JSONB;
BEGIN
  -- Get current user email
  SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();
  
  -- Get invitation details
  SELECT * INTO invite_record
  FROM public.invitations
  WHERE token = p_token 
  AND status = 'pending'
  AND expires_at > now()
  AND email = user_email;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;
  
  -- Create membership
  INSERT INTO public.organization_members (org_id, user_id, role, status)
  VALUES (invite_record.org_id, auth.uid(), invite_record.role, 'active')
  ON CONFLICT (org_id, user_id) DO UPDATE SET
    role = EXCLUDED.role,
    status = EXCLUDED.status;
  
  -- Mark invitation as accepted
  UPDATE public.invitations
  SET status = 'accepted'
  WHERE token = p_token;
  
  result := jsonb_build_object(
    'success', true,
    'org_id', invite_record.org_id,
    'role', invite_record.role
  );
  
  RETURN result;
END;
$$;

-- RLS Policies for invitations
CREATE POLICY "Org admins can manage invitations"
ON public.invitations
FOR ALL
USING (public.fn_role_in_org(org_id) IN ('owner', 'admin'));

CREATE POLICY "Users can view invitations by token"
ON public.invitations
FOR SELECT
USING (
  token IS NOT NULL AND 
  status = 'pending' AND 
  expires_at > now()
);

-- Update RLS policies for org-scoped access
CREATE POLICY "Org members can read org data"
ON public.tasks
FOR SELECT
USING (public.fn_is_member(org_id));

CREATE POLICY "Org admins can manage org data"
ON public.tasks
FOR ALL
USING (public.fn_role_in_org(org_id) IN ('owner', 'admin', 'manager'));

-- Update organization_members policies
DROP POLICY IF EXISTS "admins manage members (insert)" ON public.organization_members;
DROP POLICY IF EXISTS "admins manage members (update)" ON public.organization_members;
DROP POLICY IF EXISTS "admins manage members (delete)" ON public.organization_members;

CREATE POLICY "Org admins can manage members"
ON public.organization_members
FOR ALL
USING (public.fn_role_in_org(org_id) IN ('owner', 'admin'));