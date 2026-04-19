begin;

alter table public.attendances
add column if not exists entry_mode text not null default 'self_service',
add column if not exists created_by_employee_id bigint references public.employees(id) on delete set null,
add column if not exists admin_note text;

alter table public.attendances
drop constraint if exists attendances_entry_mode_check;

alter table public.attendances
add constraint attendances_entry_mode_check
check (entry_mode in ('self_service', 'admin_manual'));

commit;
