-- === SAFETY & STRUCTURE =====================================================
-- PK يضمن عدم تكرار العضوية
alter table if exists public.user_project_role
  add constraint user_project_role_pkey primary key (project_id, user_id);

create index if not exists idx_upr_project on public.user_project_role(project_id);
create index if not exists idx_upr_user on public.user_project_role(user_id);

-- === RLS POLICIES ===========================================================
alter table public.user_project_role enable row level security;

-- القراءة: أي عضو نشِط بنفس منظمة المشروع يقدر يشوف
drop policy if exists upr_read on public.user_project_role;
create policy upr_read
on public.user_project_role
for select to authenticated
using (
  exists (
    select 1
    from public.projects p
    join public.organization_members om
      on om.org_id = p.org_id
     and om.user_id = auth.uid()
     and om.status = 'active'
    where p.id = user_project_role.project_id
  )
);

-- الإدخال: فقط من معه دور owner/admin/manager بنفس منظمة المشروع
drop policy if exists upr_insert on public.user_project_role;
create policy upr_insert
on public.user_project_role
for insert to authenticated
with check (
  exists (
    select 1
    from public.projects p
    join public.organization_members om
      on om.org_id = p.org_id
     and om.user_id = auth.uid()
     and om.status = 'active'
     and om.role in ('owner','admin','manager')
    where p.id = user_project_role.project_id
  )
);

-- الحذف (اختياري): نفس أذونات الإدخال
drop policy if exists upr_delete on public.user_project_role;
create policy upr_delete
on public.user_project_role
for delete to authenticated
using (
  exists (
    select 1
    from public.projects p
    join public.organization_members om
      on om.org_id = p.org_id
     and om.user_id = auth.uid()
     and om.status = 'active'
     and om.role in ('owner','admin','manager')
    where p.id = user_project_role.project_id
  )
);

-- === OPTION: دالة تعيين جماعي SECURITY DEFINER =============================
-- بتتحقق من صلاحية المرسل (admin/manager على منظمة المشروع) وبعدين تعمل upsert
create or replace function public.assign_project_workers(p_project uuid, p_user_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- تحقق الصلاحية
  if not exists (
    select 1
    from public.projects p
    join public.organization_members om
      on om.org_id = p.org_id
     and om.user_id = auth.uid()
     and om.status = 'active'
     and om.role in ('owner','admin','manager')
    where p.id = p_project
  ) then
    raise exception 'You are not allowed to assign workers to this project';
  end if;

  -- upsert جماعي
  insert into public.user_project_role(project_id, user_id, role)
  select p_project, unnest(p_user_ids), 'worker'
  on conflict (project_id, user_id) do nothing;
end;
$$;

revoke all on function public.assign_project_workers(uuid,uuid[]) from public;
grant execute on function public.assign_project_workers(uuid,uuid[]) to authenticated;

-- === VALIDATION: مهمّة، تمنع تعيين task لشخص ما عنده access =================
create or replace function public.validate_task_assignment()
returns trigger
language plpgsql
as $$
declare v_project uuid;
begin
  v_project := coalesce(new.project_id, old.project_id);
  if new.assignee is not null then
    if not exists (
      select 1 from public.user_project_role upr
      where upr.project_id = v_project
        and upr.user_id   = new.assignee
        and upr.role in ('worker','manager','admin')
    ) then
      raise exception 'Assignee % has no access to project %', new.assignee, v_project;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validate_task_assignment on public.tasks;
create trigger trg_validate_task_assignment
before insert or update of assignee, project_id on public.tasks
for each row execute function public.validate_task_assignment();

-- === DIAGNOSTICS: من يفترض إضافته وما عنده access بعد؟ ======================
create or replace function public.missing_project_access(p_project uuid)
returns table(user_id uuid, email text)
language sql stable as $$
  select u.id, u.email
  from public.organization_members om
  join auth.users u on u.id = om.user_id
  join public.projects p on p.org_id = om.org_id
  where p.id = p_project and om.status='active' and om.role in ('worker','manager','admin')
  except
  select upr.user_id, u2.email
  from public.user_project_role upr
  join auth.users u2 on u2.id = upr.user_id
  where upr.project_id = p_project and upr.role in ('worker','manager','admin');
$$;