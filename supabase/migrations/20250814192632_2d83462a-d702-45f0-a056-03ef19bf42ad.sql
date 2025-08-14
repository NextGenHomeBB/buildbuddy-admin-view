-- Fix organization assignment for new workers

-- First, get the default organization ID (NextGenHome)
DO $$
DECLARE
  target_org_id uuid;
BEGIN
  -- Get the NextGenHome organization ID
  SELECT id INTO target_org_id 
  FROM public.organizations 
  WHERE name = 'NextGenHome' 
  LIMIT 1;
  
  IF target_org_id IS NULL THEN
    RAISE EXCEPTION 'NextGenHome organization not found';
  END IF;
  
  -- Assign all users without organization membership to NextGenHome
  INSERT INTO public.organization_members (org_id, user_id, role, status)
  SELECT target_org_id, p.id, 'worker', 'active'
  FROM public.profiles p
  WHERE p.id NOT IN (
    SELECT user_id 
    FROM public.organization_members 
    WHERE status = 'active'
  )
  ON CONFLICT (org_id, user_id) DO NOTHING;
  
  -- Update profiles to set default_org_id for users without one
  UPDATE public.profiles 
  SET default_org_id = target_org_id
  WHERE default_org_id IS NULL;
END $$;

-- Create function to automatically assign new users to default organization
CREATE OR REPLACE FUNCTION public.handle_new_user_organization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  target_org_id uuid;
BEGIN
  -- Get the default organization (NextGenHome)
  SELECT id INTO target_org_id 
  FROM public.organizations 
  WHERE name = 'NextGenHome' 
  LIMIT 1;
  
  -- If default org exists, assign the new user to it
  IF target_org_id IS NOT NULL THEN
    -- Add user to organization_members
    INSERT INTO public.organization_members (org_id, user_id, role, status)
    VALUES (target_org_id, NEW.id, 'worker', 'active')
    ON CONFLICT (org_id, user_id) DO NOTHING;
    
    -- Set default_org_id in profile
    NEW.default_org_id := target_org_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to run on profile creation
DROP TRIGGER IF EXISTS trigger_handle_new_user_organization ON public.profiles;
CREATE TRIGGER trigger_handle_new_user_organization
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_organization();