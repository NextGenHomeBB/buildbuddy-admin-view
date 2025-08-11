-- Add RLS policies for org-scoped tables

-- Projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin full access to projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can read all projects" ON public.projects;
DROP POLICY IF EXISTS "Users can read their assigned projects" ON public.projects;
CREATE POLICY proj_read ON public.projects 
FOR SELECT USING (public.fn_is_member(org_id));

CREATE POLICY proj_write ON public.projects 
FOR ALL USING (public.fn_is_member(org_id)) 
WITH CHECK (public.fn_is_member(org_id));

-- Tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Org admins can manage org data" ON public.tasks;
DROP POLICY IF EXISTS "Org members can read org data" ON public.tasks;
DROP POLICY IF EXISTS "Tasks: admin and project managers can delete" ON public.tasks;
DROP POLICY IF EXISTS "Tasks: comprehensive read access" ON public.tasks;
DROP POLICY IF EXISTS "Tasks: comprehensive update access" ON public.tasks;
DROP POLICY IF EXISTS "Tasks: create access for authorized users" ON public.tasks;
CREATE POLICY task_read ON public.tasks 
FOR SELECT USING (public.fn_is_member(org_id));

CREATE POLICY task_write ON public.tasks 
FOR ALL USING (public.fn_is_member(org_id)) 
WITH CHECK (public.fn_is_member(org_id));

-- Project Phases
ALTER TABLE public.project_phases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin only access to project_phases" ON public.project_phases;
CREATE POLICY phase_read ON public.project_phases 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = project_phases.project_id 
    AND public.fn_is_member(p.org_id)
  )
);

CREATE POLICY phase_write ON public.project_phases 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = project_phases.project_id 
    AND public.fn_is_member(p.org_id)
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = project_phases.project_id 
    AND public.fn_is_member(p.org_id)
  )
);

-- Shifts
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage all shifts" ON public.shifts;
DROP POLICY IF EXISTS "Workers can update their shift status" ON public.shifts;
DROP POLICY IF EXISTS "Workers can view their own shifts" ON public.shifts;
CREATE POLICY shift_read ON public.shifts 
FOR SELECT USING (public.fn_is_member(org_id));

CREATE POLICY shift_write ON public.shifts 
FOR ALL USING (public.fn_is_member(org_id)) 
WITH CHECK (public.fn_is_member(org_id));

-- Materials
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin only access to materials" ON public.materials;
CREATE POLICY material_read ON public.materials 
FOR SELECT USING (public.fn_is_member(org_id));

CREATE POLICY material_write ON public.materials 
FOR ALL USING (public.fn_is_member(org_id)) 
WITH CHECK (public.fn_is_member(org_id));

-- Phase expenses
ALTER TABLE public.phase_expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage all phase expenses" ON public.phase_expenses;
DROP POLICY IF EXISTS "Project managers can manage phase expenses for their projects" ON public.phase_expenses;
CREATE POLICY expense_read ON public.phase_expenses 
FOR SELECT USING (public.fn_is_member(org_id));

CREATE POLICY expense_write ON public.phase_expenses 
FOR ALL USING (public.fn_is_member(org_id)) 
WITH CHECK (public.fn_is_member(org_id));

-- Invitations RLS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Org admins can manage invitations" ON public.invitations;
DROP POLICY IF EXISTS "Users can view invitations by token" ON public.invitations;

CREATE POLICY inv_read ON public.invitations 
FOR SELECT USING (
  public.fn_is_member(org_id) AND 
  public.fn_role_in_org(org_id) IN ('owner', 'admin', 'manager')
);

CREATE POLICY inv_write ON public.invitations 
FOR ALL USING (
  public.fn_is_member(org_id) AND 
  public.fn_role_in_org(org_id) IN ('owner', 'admin')
) WITH CHECK (
  public.fn_is_member(org_id) AND 
  public.fn_role_in_org(org_id) IN ('owner', 'admin')
);

-- Public access for token validation
CREATE POLICY inv_token_access ON public.invitations 
FOR SELECT USING (
  token IS NOT NULL AND 
  status = 'pending' AND 
  expires_at > now()
);