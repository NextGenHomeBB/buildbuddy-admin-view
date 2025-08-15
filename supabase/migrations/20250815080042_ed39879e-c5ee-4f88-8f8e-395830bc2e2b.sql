-- Update user role to org_admin in organization
UPDATE organization_members 
SET role = 'org_admin' 
WHERE user_id = '63fba0e3-f026-4eb7-8f44-1bbc10cbb598' 
  AND org_id = 'e7b6515e-df1e-4cbf-a909-cfde5c5423d5';