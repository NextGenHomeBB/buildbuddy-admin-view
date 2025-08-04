-- Create sample test data for auto-scheduling feature

-- First, let's create some sample projects if they don't exist
INSERT INTO public.projects (id, name, status, start_date, created_at)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Sample Construction Project', 'active', '2025-08-01', now()),
  ('00000000-0000-0000-0000-000000000002', 'Sample Renovation Project', 'active', '2025-08-01', now())
ON CONFLICT (id) DO NOTHING;

-- Create some sample project phases with valid status values
INSERT INTO public.project_phases (id, project_id, name, status, start_date, end_date)
VALUES 
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 'Foundation Work', 'active', '2025-08-01', '2025-08-10'),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', 'Framing', 'not_started', '2025-08-05', '2025-08-15'),
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000002', 'Demolition', 'active', '2025-08-03', '2025-08-08')
ON CONFLICT (id) DO NOTHING;

-- Create sample tasks scheduled for August 5, 2025 (Tuesday) and nearby dates
INSERT INTO public.tasks (id, project_id, phase_id, title, description, status, priority, end_date, required_roles, crew_min, crew_max, is_scheduled)
VALUES 
  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000101', 'Pour concrete foundation', 'Pour and level concrete for main foundation', 'todo', 'high', '2025-08-05', '["Construction Worker"]', 2, 4, true),
  ('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000101', 'Install rebar', 'Install reinforcement bars for foundation', 'todo', 'medium', '2025-08-05', '["Construction Worker"]', 1, 2, true),
  ('00000000-0000-0000-0000-000000000303', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000201', 'Remove old drywall', 'Demolish existing drywall in living room', 'todo', 'medium', '2025-08-05', '["Construction Worker"]', 1, 3, true),
  ('00000000-0000-0000-0000-000000000304', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000102', 'Frame exterior walls', 'Frame the exterior walls of the structure', 'todo', 'high', '2025-08-06', '["Construction Worker"]', 2, 3, true),
  ('00000000-0000-0000-0000-000000000305', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000201', 'Electrical rough-in', 'Install electrical wiring and outlets', 'todo', 'medium', '2025-08-04', '["Electrician"]', 1, 1, true)
ON CONFLICT (id) DO NOTHING;

-- Get existing worker profiles and create availability for Tuesday (day_of_week = 2)
-- August 5, 2025 is a Tuesday, so we need workers available on day 2
WITH existing_workers AS (
  SELECT p.id as worker_id 
  FROM public.profiles p
  JOIN public.user_roles ur ON p.id = ur.user_id
  WHERE ur.role IN ('worker', 'admin')
  LIMIT 5
)
INSERT INTO public.worker_availability (worker_id, day_of_week, is_available, start_time, end_time, max_hours)
SELECT 
  ew.worker_id,
  2, -- Tuesday
  true,
  '08:00:00'::time,
  '17:00:00'::time,
  8.0
FROM existing_workers ew
ON CONFLICT (worker_id, day_of_week) 
DO UPDATE SET 
  is_available = true,
  start_time = '08:00:00'::time,
  end_time = '17:00:00'::time,
  max_hours = 8.0;

-- Also add availability for Monday (day 1) and Wednesday (day 3) for more flexibility
WITH existing_workers AS (
  SELECT p.id as worker_id 
  FROM public.profiles p
  JOIN public.user_roles ur ON p.id = ur.user_id
  WHERE ur.role IN ('worker', 'admin')
  LIMIT 5
)
INSERT INTO public.worker_availability (worker_id, day_of_week, is_available, start_time, end_time, max_hours)
SELECT 
  ew.worker_id,
  day_num,
  true,
  '08:00:00'::time,
  '17:00:00'::time,
  8.0
FROM existing_workers ew
CROSS JOIN (VALUES (1), (3)) AS days(day_num)
ON CONFLICT (worker_id, day_of_week) 
DO UPDATE SET 
  is_available = true,
  start_time = '08:00:00'::time,
  end_time = '17:00:00'::time,
  max_hours = 8.0;

-- Update profiles to have work roles that match our task requirements
UPDATE public.profiles 
SET work_role = '["Construction Worker"]'::jsonb
WHERE id IN (
  SELECT p.id 
  FROM public.profiles p
  JOIN public.user_roles ur ON p.id = ur.user_id
  WHERE ur.role IN ('worker', 'admin')
  LIMIT 3
);

-- Add one electrician role
UPDATE public.profiles 
SET work_role = '["Electrician"]'::jsonb
WHERE id IN (
  SELECT p.id 
  FROM public.profiles p
  JOIN public.user_roles ur ON p.id = ur.user_id
  WHERE ur.role IN ('worker', 'admin')
  LIMIT 1
);