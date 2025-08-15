-- Update the check_task_assignee function to check both user_project_role AND assigned_workers
CREATE OR REPLACE FUNCTION check_task_assignee()
RETURNS TRIGGER AS $$
BEGIN
  -- Skip validation if assignee is NULL
  IF NEW.assignee IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Check if the user has project access via user_project_role table OR assigned_workers JSONB
  IF NOT EXISTS (
    -- Check user_project_role table
    SELECT 1 FROM user_project_role upr 
    WHERE upr.user_id = NEW.assignee 
    AND upr.project_id = NEW.project_id
  ) AND NOT EXISTS (
    -- Check assigned_workers JSONB field in projects table
    SELECT 1 FROM projects p
    WHERE p.id = NEW.project_id 
    AND p.assigned_workers ? NEW.assignee::text
  ) THEN
    RAISE EXCEPTION 'Cannot assign task to user without project access';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;