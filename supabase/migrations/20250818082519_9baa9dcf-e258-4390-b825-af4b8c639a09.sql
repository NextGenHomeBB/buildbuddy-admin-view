-- Set up standard business hours for workers without availability records
-- Monday-Friday: 08:00-17:00 (available), Saturday-Sunday: unavailable

INSERT INTO public.worker_availability (worker_id, day_of_week, is_available, start_time, end_time, max_hours)
SELECT 
  p.id as worker_id,
  days.day_of_week,
  CASE 
    WHEN days.day_of_week IN (1, 2, 3, 4, 5) THEN true  -- Monday-Friday
    ELSE false  -- Saturday-Sunday
  END as is_available,
  CASE 
    WHEN days.day_of_week IN (1, 2, 3, 4, 5) THEN '08:00:00'::time
    ELSE NULL
  END as start_time,
  CASE 
    WHEN days.day_of_week IN (1, 2, 3, 4, 5) THEN '17:00:00'::time
    ELSE NULL
  END as end_time,
  CASE 
    WHEN days.day_of_week IN (1, 2, 3, 4, 5) THEN 8
    ELSE NULL
  END as max_hours
FROM public.profiles p
CROSS JOIN (
  SELECT 1 as day_of_week UNION ALL  -- Monday
  SELECT 2 UNION ALL                 -- Tuesday  
  SELECT 3 UNION ALL                 -- Wednesday
  SELECT 4 UNION ALL                 -- Thursday
  SELECT 5 UNION ALL                 -- Friday
  SELECT 6 UNION ALL                 -- Saturday
  SELECT 0                           -- Sunday
) days
WHERE NOT EXISTS (
  SELECT 1 FROM public.worker_availability wa 
  WHERE wa.worker_id = p.id 
  AND wa.day_of_week = days.day_of_week
);