-- A) Quick integrity checks
CREATE OR REPLACE VIEW public.v_project_worker_counts AS
SELECT p.id, p.name,
       (SELECT count(*) FROM public.user_project_role upr
         WHERE upr.project_id=p.id AND upr.role IN ('worker','manager','admin')) AS workers
FROM public.projects p;

-- B) Backfill: from legacy JSON and from tasks.assignee (if access missing)
DO $$
DECLARE 
  r RECORD;
BEGIN
  -- 1) JSON -> relation (handle both object and string formats)
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='projects' AND column_name='assigned_workers') THEN
    
    -- Handle object format: [{"id": "uuid"}, ...]
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
    
    -- Handle string format: ["uuid1", "uuid2", ...]
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
END
$$;

-- C) Freeze JSON so it won't diverge again (if column exists)
CREATE OR REPLACE FUNCTION public.block_assigned_workers_json()
RETURNS TRIGGER 
LANGUAGE plpgsql 
AS $$
BEGIN
  IF TG_OP IN ('INSERT','UPDATE') AND NEW.assigned_workers IS DISTINCT FROM OLD.assigned_workers THEN
    NEW.assigned_workers := OLD.assigned_workers;
  END IF;
  RETURN NEW;
END;
$$;

-- Only create trigger if projects.assigned_workers column exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='projects' AND column_name='assigned_workers') THEN
    DROP TRIGGER IF EXISTS trg_block_assigned_workers ON public.projects;
    CREATE TRIGGER trg_block_assigned_workers
    BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.block_assigned_workers_json();
  END IF;
END
$$;

-- D) Helpful function: who is missing access for a project?
CREATE OR REPLACE FUNCTION public.missing_project_access(p_project uuid)
RETURNS TABLE(user_id uuid, email text)
LANGUAGE SQL 
STABLE 
AS $$
  SELECT u.id, u.email
  FROM public.organization_members om
  JOIN auth.users u ON u.id = om.user_id
  JOIN public.projects p ON p.org_id = om.org_id
  WHERE p.id = p_project AND om.status='active' AND om.role IN ('worker','manager','admin')
  EXCEPT
  SELECT upr.user_id, u2.email
  FROM public.user_project_role upr
  JOIN auth.users u2 ON u2.id = upr.user_id
  WHERE upr.project_id = p_project AND upr.role IN ('worker','manager','admin');
$$;