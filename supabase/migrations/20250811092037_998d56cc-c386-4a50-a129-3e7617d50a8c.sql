-- Update organization name from "Default Organization" to "NextGenHome"
UPDATE public.organizations 
SET name = 'NextGenHome' 
WHERE name = 'Default Organization';

-- Also update any organizations that might be named similar variations
UPDATE public.organizations 
SET name = 'NextGenHome' 
WHERE name ILIKE '%default%organization%' OR name = 'Demo Construction';