-- Fix the security definer view issue
-- Find and fix any views that use SECURITY DEFINER

-- Check if the view exists and recreate it without SECURITY DEFINER
DROP VIEW IF EXISTS worker.my_tasks_view;

-- Recreate the view without SECURITY DEFINER (it will use SECURITY INVOKER by default)
CREATE VIEW worker.my_tasks_view AS
SELECT 
  t.id,
  t.title,
  t.description,
  t.status,
  t.priority,
  t.assignee as assigned_worker_id,
  t.completed_at::timestamp without time zone as due_date,
  t.created_at,
  t.updated_at
FROM public.tasks t
WHERE t.assignee = auth.uid();