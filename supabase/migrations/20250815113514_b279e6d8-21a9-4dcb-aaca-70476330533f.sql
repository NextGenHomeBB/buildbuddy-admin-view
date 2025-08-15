-- Data repair migration to sync projects.assigned_workers with user_project_role
-- This fixes the inconsistency causing worker assignment issues

-- Step 1: Update all projects to sync assigned_workers with actual user_project_role data
UPDATE projects 
SET assigned_workers = (
  SELECT COALESCE(jsonb_agg(upr.user_id), '[]'::jsonb)
  FROM user_project_role upr 
  WHERE upr.project_id = projects.id 
  AND upr.role = 'worker'
)
WHERE id IN (
  SELECT DISTINCT project_id 
  FROM user_project_role 
  WHERE project_id IS NOT NULL
);

-- Step 2: Clean up any orphaned user_project_role records
DELETE FROM user_project_role 
WHERE project_id NOT IN (SELECT id FROM projects);

-- Step 3: Add data consistency check function
CREATE OR REPLACE FUNCTION public.check_project_worker_consistency()
RETURNS TABLE(
  project_id uuid,
  project_name text,
  assigned_workers_count int,
  user_project_role_count int,
  is_consistent boolean
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    p.id as project_id,
    p.name as project_name,
    CASE 
      WHEN p.assigned_workers IS NULL THEN 0
      ELSE jsonb_array_length(p.assigned_workers)
    END as assigned_workers_count,
    COUNT(upr.user_id)::int as user_project_role_count,
    CASE 
      WHEN p.assigned_workers IS NULL AND COUNT(upr.user_id) = 0 THEN true
      WHEN p.assigned_workers IS NOT NULL AND jsonb_array_length(p.assigned_workers) = COUNT(upr.user_id) THEN true
      ELSE false
    END as is_consistent
  FROM projects p
  LEFT JOIN user_project_role upr ON p.id = upr.project_id AND upr.role = 'worker'
  GROUP BY p.id, p.name, p.assigned_workers
  ORDER BY is_consistent, p.name;
$$;

-- Step 4: Create automated repair function for future use
CREATE OR REPLACE FUNCTION public.repair_project_worker_assignments()
RETURNS TABLE(repaired_projects int, total_projects int)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  repaired_count int := 0;
  total_count int := 0;
BEGIN
  -- Count total projects
  SELECT COUNT(*) INTO total_count FROM projects;
  
  -- Update inconsistent projects
  WITH repaired AS (
    UPDATE projects 
    SET assigned_workers = (
      SELECT COALESCE(jsonb_agg(upr.user_id), '[]'::jsonb)
      FROM user_project_role upr 
      WHERE upr.project_id = projects.id 
      AND upr.role = 'worker'
    )
    WHERE id IN (
      SELECT p.id
      FROM projects p
      LEFT JOIN user_project_role upr ON p.id = upr.project_id AND upr.role = 'worker'
      GROUP BY p.id, p.assigned_workers
      HAVING CASE 
        WHEN p.assigned_workers IS NULL AND COUNT(upr.user_id) = 0 THEN false
        WHEN p.assigned_workers IS NOT NULL AND jsonb_array_length(p.assigned_workers) = COUNT(upr.user_id) THEN false
        ELSE true
      END
    )
    RETURNING 1
  )
  SELECT COUNT(*) INTO repaired_count FROM repaired;
  
  RETURN QUERY SELECT repaired_count, total_count;
END;
$$;