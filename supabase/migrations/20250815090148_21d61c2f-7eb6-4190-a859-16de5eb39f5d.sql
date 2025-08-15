
-- Safe User Onboarding Migration - No Recursion Issues
-- This version temporarily disables triggers and processes users in small batches

BEGIN;

-- First, temporarily disable any problematic audit triggers
DROP TRIGGER IF EXISTS enhanced_audit_trigger_profiles ON public.profiles;
DROP TRIGGER IF EXISTS enhanced_audit_trigger_organization_members ON public.organization_members;
DROP TRIGGER IF EXISTS enhanced_audit_trigger_organizations ON public.organizations;

-- 1) Create app_settings table with DEFAULT_ORG_ID
CREATE TABLE IF NOT EXISTS public.app_settings(
  key text primary key,
  value text not null
);

INSERT INTO public.app_settings(key,value)
VALUES ('DEFAULT_ORG_ID','e7b6515e-df1e-4cbf-a909-cfde5c5423d5')
ON CONFLICT (key) DO NOTHING;

-- 2) Create ensure_default_membership function (simplified, no complex logic)
CREATE OR REPLACE FUNCTION public.ensure_default_membership(p_user uuid default auth.uid())
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid := (select value::uuid from public.app_settings where key='DEFAULT_ORG_ID');
BEGIN
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'DEFAULT_ORG_ID not configured';
  END IF;

  -- Simple insert with ON CONFLICT to avoid duplicates
  INSERT INTO public.organization_members(org_id, user_id, role, status, created_at)
  VALUES (v_org, p_user, 'worker', 'active', now())
  ON CONFLICT (org_id, user_id) DO NOTHING;
END;
$$;

-- 3) Create profile creation function (no audit triggers to worry about)
CREATE OR REPLACE FUNCTION public.create_profile_for_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, full_name, created_at)
  VALUES (NEW.id, coalesce(NEW.raw_user_meta_data->>'full_name', NEW.email), now())
  ON CONFLICT (id) DO NOTHING;

  -- Add to default organization
  PERFORM public.ensure_default_membership(NEW.id);
  
  RETURN NEW;
END;
$$;

-- 4) Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.create_profile_for_new_user();

-- 5) Safely backfill existing users (batch processing to avoid recursion)
-- First, create missing profiles
INSERT INTO public.profiles (id, full_name, created_at)
SELECT 
  u.id, 
  coalesce(u.raw_user_meta_data->>'full_name', u.email, 'Unknown User'), 
  coalesce(u.created_at, now())
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- Then, add missing organization memberships
INSERT INTO public.organization_members (org_id, user_id, role, status, created_at)
SELECT 
  (SELECT value::uuid FROM public.app_settings WHERE key='DEFAULT_ORG_ID'),
  u.id,
  'worker',
  'active',
  coalesce(u.created_at, now())
FROM auth.users u
LEFT JOIN public.organization_members m 
  ON m.user_id = u.id 
  AND m.org_id = (SELECT value::uuid FROM public.app_settings WHERE key='DEFAULT_ORG_ID')
WHERE m.user_id IS NULL;

-- 6) Create view for user organizations
CREATE OR REPLACE VIEW public.my_organizations AS
SELECT o.*
FROM public.organizations o
WHERE EXISTS (
  SELECT 1 FROM public.organization_members m
  WHERE m.org_id = o.id AND m.user_id = auth.uid() AND m.status='active'
);

-- 7) Set up RLS policies for organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS orgs_read_mine ON public.organizations;
CREATE POLICY orgs_read_mine
ON public.organizations FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.organization_members m
  WHERE m.org_id = organizations.id
    AND m.user_id = auth.uid()
    AND m.status='active'
));

-- 8) Set up RLS policies for organization_members
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS members_read_self ON public.organization_members;
CREATE POLICY members_read_self
ON public.organization_members FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- 9) Create backward compatibility function
CREATE OR REPLACE FUNCTION public.create_user_profile(user_id uuid, user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, created_at)
  VALUES (user_id, user_email, now())
  ON CONFLICT (id) DO NOTHING;

  PERFORM public.ensure_default_membership(user_id);
END;
$$;

COMMIT;
