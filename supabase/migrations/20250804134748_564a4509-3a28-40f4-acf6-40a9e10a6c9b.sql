-- Fix auto-scheduling by updating sample data to include start_date for tasks
UPDATE public.tasks 
SET start_date = '2025-08-05'
WHERE id IN (
  '00000000-0000-0000-0000-000000000301',
  '00000000-0000-0000-0000-000000000302', 
  '00000000-0000-0000-0000-000000000303'
);

-- Set other tasks for different dates
UPDATE public.tasks 
SET start_date = '2025-08-06'
WHERE id = '00000000-0000-0000-0000-000000000304';

UPDATE public.tasks 
SET start_date = '2025-08-04'
WHERE id = '00000000-0000-0000-0000-000000000305';