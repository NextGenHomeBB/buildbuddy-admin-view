-- A) Quick integrity checks
CREATE OR REPLACE VIEW public.v_project_worker_counts AS
SELECT p.id, p.name,
       (SELECT count(*) FROM public.user_project_role upr
         WHERE upr.project_id=p.id AND upr.role IN ('worker','manager','admin')) AS workers
FROM public.projects p;

-- B) Backfill: from legacy JSON and from tasks.assignee (if access missing)
DO $$
DECLARE r RECORD;
BEGIN
  -- 1) JSON -> relation - handle object format
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='projects' AND column_name='assigned_workers') THEN
    FOR r IN
      SELECT p.id AS project_id, (aw->>'id')::uuid AS user_id
      FROM public.projects p,
           LATERAL jsonb_array_elements(COALESCE(p.assigned_workers,'[]'::jsonb)) aw
      WHERE jsonb_typeof(aw) = 'object' AND aw ? 'id'
    LOOP
      INSERT INTO public.user_project_role(project_id, user_id, role)
      VALUES (r.project_id, r.user_id, 'worker')
      ON CONFLICT (project_id,user_id) DO NOTHING;
    END LOOP;
    
    -- Also handle simple string arrays (UUIDs as strings)
    FOR r IN
      SELECT p.id AS project_id, aw::text::uuid AS user_id
      FROM public.projects p,
           LATERAL jsonb_array_elements(COALESCE(p.assigned_workers,'[]'::jsonb)) aw
      WHERE jsonb_typeof(aw) = 'string'
    LOOP
      INSERT INTO public.user_project_role(project_id, user_id, role)
      VALUES (r.project_id, r.user_id, 'worker')
      ON CONFLICT (project_id,user_id) DO NOTHING;
    END LOOP;
  END IF;

  -- 2) tasks.assignee -> relation (so existing tasks don't fail validation)
  INSERT INTO public.user_project_role(project_id, user_id, role)
  SELECT DISTINCT t.project_id, t.assignee, 'worker'
  FROM public.tasks t
  WHERE t.assignee IS NOT NULL
  ON CONFLICT (project_id,user_id) DO NOTHING;
END $$;