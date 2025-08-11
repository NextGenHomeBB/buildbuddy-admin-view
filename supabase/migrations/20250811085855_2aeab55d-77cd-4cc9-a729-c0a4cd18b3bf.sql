-- Fix organization_members table and seed initial data

-- First, ensure we have proper constraints on organization_members
ALTER TABLE public.organization_members 
DROP CONSTRAINT IF EXISTS organization_members_pkey;

ALTER TABLE public.organization_members 
ADD CONSTRAINT organization_members_pkey PRIMARY KEY (org_id, user_id);

-- Create a default organization if none exists
INSERT INTO public.organizations (id, name, created_by)
SELECT 
  gen_random_uuid(),
  'Default Organization',
  (SELECT id FROM auth.users LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM public.organizations);

-- Add all existing users to the default organization as members
WITH default_org AS (
  SELECT id as org_id FROM public.organizations LIMIT 1
),
existing_users AS (
  SELECT p.id as user_id FROM public.profiles p
  WHERE NOT EXISTS (
    SELECT 1 FROM public.organization_members om 
    WHERE om.user_id = p.id
  )
)
INSERT INTO public.organization_members (org_id, user_id, role, status)
SELECT 
  default_org.org_id,
  existing_users.user_id,
  'worker',
  'active'
FROM default_org, existing_users;

-- Set default_org_id for users who don't have one
WITH default_org AS (
  SELECT id as org_id FROM public.organizations LIMIT 1
)
UPDATE public.profiles 
SET default_org_id = default_org.org_id
FROM default_org
WHERE default_org_id IS NULL;