-- === SAFETY & STRUCTURE =====================================================
-- Remove existing constraints that might conflict
ALTER TABLE public.user_project_role DROP CONSTRAINT IF EXISTS user_project_role_pkey;
ALTER TABLE public.user_project_role DROP CONSTRAINT IF EXISTS user_project_role_unique;

-- Add new primary key constraint
ALTER TABLE public.user_project_role ADD CONSTRAINT user_project_role_pkey PRIMARY KEY (project_id, user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_upr_project ON public.user_project_role(project_id);
CREATE INDEX IF NOT EXISTS idx_upr_user ON public.user_project_role(user_id);

-- === RLS POLICIES ===========================================================
ALTER TABLE public.user_project_role ENABLE ROW LEVEL SECURITY;

-- Reading: Any active member of the project's organization can view
DROP POLICY IF EXISTS upr_read ON public.user_project_role;
CREATE POLICY upr_read
ON public.user_project_role
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.projects p
    JOIN public.organization_members om
      ON om.org_id = p.org_id
     AND om.user_id = auth.uid()
     AND om.status = 'active'
    WHERE p.id = user_project_role.project_id
  )
);

-- Insert: Only users with owner/admin/manager role in the project's organization
DROP POLICY IF EXISTS upr_insert ON public.user_project_role;
CREATE POLICY upr_insert
ON public.user_project_role
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.projects p
    JOIN public.organization_members om
      ON om.org_id = p.org_id
     AND om.user_id = auth.uid()
     AND om.status = 'active'
     AND om.role IN ('owner','admin','manager')
    WHERE p.id = user_project_role.project_id
  )
);

-- Delete: Same permissions as insert
DROP POLICY IF EXISTS upr_delete ON public.user_project_role;
CREATE POLICY upr_delete
ON public.user_project_role
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.projects p
    JOIN public.organization_members om
      ON om.org_id = p.org_id
     AND om.user_id = auth.uid()
     AND om.status = 'active'
     AND om.role IN ('owner','admin','manager')
    WHERE p.id = user_project_role.project_id
  )
);

-- === SECURITY DEFINER FUNCTION FOR BULK ASSIGNMENT =========================
CREATE OR REPLACE FUNCTION public.assign_project_workers(p_project uuid, p_user_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check permissions
  IF NOT EXISTS (
    SELECT 1
    FROM public.projects p
    JOIN public.organization_members om
      ON om.org_id = p.org_id
     AND om.user_id = auth.uid()
     AND om.status = 'active'
     AND om.role IN ('owner','admin','manager')
    WHERE p.id = p_project
  ) THEN
    RAISE EXCEPTION 'You are not allowed to assign workers to this project';
  END IF;

  -- Bulk upsert
  INSERT INTO public.user_project_role(project_id, user_id, role)
  SELECT p_project, unnest(p_user_ids), 'worker'
  ON CONFLICT (project_id, user_id) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.assign_project_workers(uuid,uuid[]) FROM public;
GRANT EXECUTE ON FUNCTION public.assign_project_workers(uuid,uuid[]) TO authenticated;