-- Phase module polish migration (fixed)
-- 1. Drop dependent objects before removing progress column
DROP TRIGGER IF EXISTS trg_phase_progress ON project_phases;
DROP VIEW IF EXISTS project_phases_v;

-- 2. Remove static progress column from project_phases (it will be calculated client-side)
ALTER TABLE project_phases DROP COLUMN IF EXISTS progress;

-- 3. Create phase_budget table if it doesn't exist
CREATE TABLE IF NOT EXISTS phase_budget (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id UUID NOT NULL REFERENCES project_phases(id) ON DELETE CASCADE,
  budget DECIMAL(12,2) DEFAULT 0,
  spent DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Create phase_budget_v view for cost calculations
CREATE OR REPLACE VIEW phase_budget_v AS
SELECT 
  p.id,
  p.project_id,
  p.name as phase_name,
  COALESCE(b.budget, 0) as budget,
  COALESCE(b.spent, 0) as spent,
  COALESCE(b.spent, 0) - COALESCE(b.budget, 0) as variance
FROM project_phases p
LEFT JOIN phase_budget b ON b.phase_id = p.id;

-- 5. Add RLS policy for phase_budget table
ALTER TABLE phase_budget ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin only access to phase_budget"
ON phase_budget FOR ALL
USING (get_current_user_role() = 'admin');

-- 6. Add RLS policy for phase_budget_v view
CREATE POLICY "Admins read phase budget view"
ON phase_budget_v FOR SELECT
USING (get_current_user_role() = 'admin');

-- 7. Add trigger to update updated_at on phase_budget
CREATE OR REPLACE FUNCTION update_phase_budget_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER phase_budget_updated_at
  BEFORE UPDATE ON phase_budget
  FOR EACH ROW
  EXECUTE FUNCTION update_phase_budget_updated_at();

-- 8. Insert some sample budget data for existing phases
INSERT INTO phase_budget (phase_id, budget, spent)
SELECT 
  id,
  CASE 
    WHEN RANDOM() < 0.5 THEN 5000 + (RANDOM() * 15000)::INTEGER
    ELSE 0
  END as budget,
  CASE 
    WHEN RANDOM() < 0.7 THEN (RANDOM() * 8000)::INTEGER
    ELSE 0
  END as spent
FROM project_phases
WHERE NOT EXISTS (SELECT 1 FROM phase_budget WHERE phase_id = project_phases.id);