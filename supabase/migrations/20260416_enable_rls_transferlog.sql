begin;

create or replace function public.current_employee_id()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select e.id
  from public.employees e
  where e.auth_user_id = auth.uid()
  limit 1;
$$;

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.employees e
    where e.auth_user_id = auth.uid()
      and e.role = 'admin'
  );
$$;

grant execute on function public.current_employee_id() to authenticated;
grant execute on function public.current_user_is_admin() to authenticated;

alter table public.employees enable row level security;
alter table public.shifts enable row level security;
alter table public.vacations enable row level security;
alter table public.attendances enable row level security;

drop policy if exists employees_select_own_or_admin on public.employees;
create policy employees_select_own_or_admin
on public.employees
for select
to authenticated
using (
  public.current_user_is_admin()
  or auth_user_id = auth.uid()
);

drop policy if exists employees_insert_admin_only on public.employees;
create policy employees_insert_admin_only
on public.employees
for insert
to authenticated
with check (public.current_user_is_admin());

drop policy if exists employees_update_admin_only on public.employees;
create policy employees_update_admin_only
on public.employees
for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists employees_delete_admin_only on public.employees;
create policy employees_delete_admin_only
on public.employees
for delete
to authenticated
using (public.current_user_is_admin());

drop policy if exists shifts_select_own_or_admin on public.shifts;
create policy shifts_select_own_or_admin
on public.shifts
for select
to authenticated
using (
  public.current_user_is_admin()
  or employee_id = public.current_employee_id()
);

drop policy if exists shifts_insert_admin_only on public.shifts;
create policy shifts_insert_admin_only
on public.shifts
for insert
to authenticated
with check (public.current_user_is_admin());

drop policy if exists shifts_update_admin_only on public.shifts;
create policy shifts_update_admin_only
on public.shifts
for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists shifts_delete_admin_only on public.shifts;
create policy shifts_delete_admin_only
on public.shifts
for delete
to authenticated
using (public.current_user_is_admin());

drop policy if exists vacations_select_own_or_admin on public.vacations;
create policy vacations_select_own_or_admin
on public.vacations
for select
to authenticated
using (
  public.current_user_is_admin()
  or employee_id = public.current_employee_id()
);

drop policy if exists vacations_insert_own_or_admin on public.vacations;
create policy vacations_insert_own_or_admin
on public.vacations
for insert
to authenticated
with check (
  public.current_user_is_admin()
  or employee_id = public.current_employee_id()
);

drop policy if exists vacations_update_own_pending_or_admin on public.vacations;
create policy vacations_update_own_pending_or_admin
on public.vacations
for update
to authenticated
using (
  public.current_user_is_admin()
  or (
    employee_id = public.current_employee_id()
    and status = 'pending'
  )
)
with check (
  public.current_user_is_admin()
  or (
    employee_id = public.current_employee_id()
    and status = 'pending'
  )
);

drop policy if exists vacations_delete_own_pending_or_admin on public.vacations;
create policy vacations_delete_own_pending_or_admin
on public.vacations
for delete
to authenticated
using (
  public.current_user_is_admin()
  or (
    employee_id = public.current_employee_id()
    and status = 'pending'
  )
);

drop policy if exists attendances_select_own_or_admin on public.attendances;
create policy attendances_select_own_or_admin
on public.attendances
for select
to authenticated
using (
  public.current_user_is_admin()
  or employee_id = public.current_employee_id()
);

drop policy if exists attendances_insert_own_or_admin on public.attendances;
create policy attendances_insert_own_or_admin
on public.attendances
for insert
to authenticated
with check (
  public.current_user_is_admin()
  or employee_id = public.current_employee_id()
);

commit;
