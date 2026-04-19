begin;

alter table public.attendances
add column if not exists record_status text not null default 'active',
add column if not exists voided_at timestamptz,
add column if not exists voided_by_employee_id bigint references public.employees(id) on delete set null,
add column if not exists void_reason text;

alter table public.attendances
drop constraint if exists attendances_record_status_check;

alter table public.attendances
add constraint attendances_record_status_check
check (record_status in ('active', 'voided'));

drop policy if exists attendances_update_admin_only on public.attendances;
create policy attendances_update_admin_only
on public.attendances
for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

commit;
