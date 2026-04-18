begin;

create or replace function public.approve_vacation_transactional(p_vacation_id bigint)
returns public.vacations
language plpgsql
security definer
set search_path = public
as $$
declare
  vacation_record public.vacations;
  updated_vacation public.vacations;
  employee_days integer;
  requested_days integer;
begin
  if not public.current_user_is_admin() then
    raise exception 'Solo los administradores pueden aprobar vacaciones'
      using errcode = '42501';
  end if;

  select *
  into vacation_record
  from public.vacations
  where id = p_vacation_id
  for update;

  if not found then
    raise exception 'Solicitud no encontrada'
      using errcode = 'P0002';
  end if;

  if vacation_record.status <> 'pending' then
    raise exception 'Solo se pueden aprobar solicitudes pendientes';
  end if;

  requested_days := (vacation_record.end_date - vacation_record.start_date) + 1;

  select available_days
  into employee_days
  from public.employees
  where id = vacation_record.employee_id
  for update;

  if not found then
    raise exception 'Empleado no encontrado'
      using errcode = 'P0002';
  end if;

  if employee_days < requested_days then
    raise exception 'No hay suficientes días disponibles para aprobar la solicitud';
  end if;

  update public.employees
  set available_days = employee_days - requested_days
  where id = vacation_record.employee_id;

  update public.vacations
  set
    status = 'approved',
    reviewed_at = timezone('utc', now())
  where id = p_vacation_id
  returning *
  into updated_vacation;

  return updated_vacation;
end;
$$;

create or replace function public.cancel_vacation_transactional(p_vacation_id bigint)
returns public.vacations
language plpgsql
security definer
set search_path = public
as $$
declare
  vacation_record public.vacations;
  updated_vacation public.vacations;
  employee_days integer;
  requested_days integer;
begin
  if not public.current_user_is_admin() then
    raise exception 'Solo los administradores pueden cancelar vacaciones aprobadas'
      using errcode = '42501';
  end if;

  select *
  into vacation_record
  from public.vacations
  where id = p_vacation_id
  for update;

  if not found then
    raise exception 'Solicitud no encontrada'
      using errcode = 'P0002';
  end if;

  if vacation_record.status <> 'approved' then
    raise exception 'Solo se pueden cancelar solicitudes aprobadas';
  end if;

  requested_days := (vacation_record.end_date - vacation_record.start_date) + 1;

  select available_days
  into employee_days
  from public.employees
  where id = vacation_record.employee_id
  for update;

  if not found then
    raise exception 'Empleado no encontrado'
      using errcode = 'P0002';
  end if;

  update public.employees
  set available_days = employee_days + requested_days
  where id = vacation_record.employee_id;

  update public.vacations
  set
    status = 'pending',
    reviewed_at = timezone('utc', now())
  where id = p_vacation_id
  returning *
  into updated_vacation;

  return updated_vacation;
end;
$$;

grant execute on function public.approve_vacation_transactional(bigint) to authenticated;
grant execute on function public.cancel_vacation_transactional(bigint) to authenticated;

commit;
