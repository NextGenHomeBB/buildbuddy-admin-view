
-- Add sample tasks for each phase
WITH phase_data AS (
  SELECT id, name FROM project_phases 
  WHERE project_id = '56b4fc08-50c1-4507-88cb-0f170d2aecbd'
)
INSERT INTO tasks (id, project_id, phase_id, title, description, status, priority, created_at) 
SELECT 
  gen_random_uuid(),
  '56b4fc08-50c1-4507-88cb-0f170d2aecbd',
  p.id,
  task_title,
  task_desc,
  task_status,
  task_priority,
  now()
FROM phase_data p
CROSS JOIN (
  VALUES 
    ('Bouwtekening', 'Review architectural plans', 'Check building permits and compliance', 'done', 'high'),
    ('Bouwtekening', 'Submit permit application', 'Submit to local authorities', 'done', 'high'),
    ('Sloop/Strip', 'Remove old fixtures', 'Remove bathroom and kitchen fixtures', 'done', 'medium'),
    ('Sloop/Strip', 'Strip walls and floors', 'Prepare surfaces for renovation', 'done', 'medium'),
    ('Styling & Opmeten', 'Interior design consultation', 'Meet with interior designer', 'done', 'medium'),
    ('Styling & Opmeten', 'Measure rooms', 'Take precise measurements', 'in_progress', 'medium'),
    ('Styling & Opmeten', 'Select materials', 'Choose tiles, paint, fixtures', 'todo', 'low'),
    ('Installatie', 'Electrical work', 'Install new electrical systems', 'todo', 'high'),
    ('Installatie', 'Plumbing work', 'Install new plumbing', 'todo', 'high'),
    ('Afwerking', 'Paint walls', 'Apply final paint coats', 'todo', 'medium'),
    ('Afwerking', 'Install flooring', 'Install new flooring materials', 'todo', 'medium')
) AS task_info(phase_name, task_title, task_desc, task_status, task_priority)
WHERE p.name = task_info.phase_name;
