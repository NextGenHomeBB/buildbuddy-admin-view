
-- Update the sample project to match the screenshots
UPDATE projects 
SET 
  name = 'Maria Austriastraat 1019',
  description = 'Residential renovation project in Amsterdam IJburg',
  location = 'Amsterdam IJburg',
  start_date = '2025-07-18',
  budget = 50000,
  progress = 75,
  status = 'active'
WHERE id = '56b4fc08-50c1-4507-88cb-0f170d2aecbd';

-- Delete existing phases for this project
DELETE FROM project_phases WHERE project_id = '56b4fc08-50c1-4507-88cb-0f170d2aecbd';

-- Insert new phases matching the screenshots
INSERT INTO project_phases (id, project_id, name, description, status, start_date, end_date, progress) VALUES
  (gen_random_uuid(), '56b4fc08-50c1-4507-88cb-0f170d2aecbd', 'Bouwtekening', 'Architectural drawings and permits', 'completed', '2025-07-18', '2025-07-20', 100),
  (gen_random_uuid(), '56b4fc08-50c1-4507-88cb-0f170d2aecbd', 'Sloop/Strip', 'Demolition and stripping work', 'completed', '2025-07-21', '2025-07-23', 100),
  (gen_random_uuid(), '56b4fc08-50c1-4507-88cb-0f170d2aecbd', 'Styling & Opmeten', 'Styling consultation and measurements', 'in_progress', '2025-07-24', '2025-07-26', 60),
  (gen_random_uuid(), '56b4fc08-50c1-4507-88cb-0f170d2aecbd', 'Installatie', 'Installation work', 'not_started', '2025-07-27', '2025-07-29', 0),
  (gen_random_uuid(), '56b4fc08-50c1-4507-88cb-0f170d2aecbd', 'Afwerking', 'Finishing work', 'not_started', '2025-07-30', '2025-07-31', 0);
