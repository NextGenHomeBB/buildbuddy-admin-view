-- Phase 2: Seed data and migrate existing data to support multi-tenancy

-- First, let's create a default organization if none exist
INSERT INTO public.organizations (name, created_by)
SELECT 'BuildBuddy Demo Org', auth.uid()
WHERE NOT EXISTS (SELECT 1 FROM public.organizations LIMIT 1)
AND auth.uid() IS NOT NULL;

-- Get the first org for data migration
DO $$
DECLARE
  default_org_id UUID;
  admin_user_id UUID;
BEGIN
  -- Get first organization
  SELECT id INTO default_org_id FROM public.organizations LIMIT 1;
  
  -- Get first admin user
  SELECT user_id INTO admin_user_id 
  FROM public.user_roles 
  WHERE role = 'admin' 
  LIMIT 1;
  
  IF default_org_id IS NOT NULL THEN
    -- Migrate existing projects to the default org
    UPDATE public.projects 
    SET org_id = default_org_id 
    WHERE org_id IS NULL;
    
    -- Migrate existing tasks to the default org (via their projects)
    UPDATE public.tasks 
    SET org_id = (
      SELECT p.org_id 
      FROM public.projects p 
      WHERE p.id = tasks.project_id
    )
    WHERE org_id IS NULL 
    AND project_id IS NOT NULL;
    
    -- Migrate other domain tables
    UPDATE public.shifts 
    SET org_id = default_org_id 
    WHERE org_id IS NULL;
    
    UPDATE public.time_logs 
    SET org_id = default_org_id 
    WHERE org_id IS NULL;
    
    UPDATE public.phase_expenses 
    SET org_id = default_org_id 
    WHERE org_id IS NULL;
    
    UPDATE public.materials 
    SET org_id = default_org_id 
    WHERE org_id IS NULL;
    
    -- Create organization memberships for existing users who don't have them
    INSERT INTO public.organization_members (org_id, user_id, role, status)
    SELECT default_org_id, ur.user_id, ur.role, 'active'
    FROM public.user_roles ur
    WHERE NOT EXISTS (
      SELECT 1 FROM public.organization_members om 
      WHERE om.org_id = default_org_id AND om.user_id = ur.user_id
    );
  END IF;
END $$;

-- Create sample contractor invitation (expires in 7 days)
INSERT INTO public.invitations (org_id, email, role, status, expires_at)
SELECT 
  o.id, 
  'contractor@example.com', 
  'contractor', 
  'pending',
  now() + INTERVAL '7 days'
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.invitations 
  WHERE email = 'contractor@example.com'
)
LIMIT 1;