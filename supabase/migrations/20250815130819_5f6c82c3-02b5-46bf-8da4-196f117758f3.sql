-- C) Freeze JSON so it won't diverge again (if column exists)
CREATE OR REPLACE FUNCTION public.block_assigned_workers_json()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP IN ('INSERT','UPDATE') AND NEW.assigned_workers IS DISTINCT FROM OLD.assigned_workers THEN
    NEW.assigned_workers := OLD.assigned_workers;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_block_assigned_workers ON public.projects;
CREATE TRIGGER trg_block_assigned_workers
BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.block_assigned_workers_json();

-- D) Helpful function: who is missing access for a project?
CREATE OR REPLACE FUNCTION public.missing_project_access(p_project uuid)
RETURNS TABLE(user_id uuid, email text)
LANGUAGE SQL STABLE AS $$
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