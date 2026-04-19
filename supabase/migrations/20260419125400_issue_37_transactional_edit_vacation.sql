begin;

-- Issue #37: RPC transaccional para editar vacaciones aprobadas.
-- Recalcula el saldo atómicamente dentro de la transacción,
-- evitando inconsistencias si falla a mitad y protegiendo
-- contra condiciones de carrera con FOR UPDATE.

create or replace function public.edit_vacation_transactional(
  p_vacation_id bigint,
  p_new_start_date date,
  p_new_end_date date
)
returns public.vacations
language plpgsql
security definer
set search_path = public
as $$
declare
  vacation_record public.vacations;
  updated_vacation public.vacations;
  employee_days integer;
  old_days integer;
  new_days integer;
  day_difference integer;
begin
  -- Solo admins pueden editar vacaciones
  if not public.current_user_is_admin() then
    raise exception 'Solo los administradores pueden editar vacaciones'
      using errcode = '42501';
  end if;

  -- Validar fechas de entrada
  if p_new_start_date is null or p_new_end_date is null then
    raise exception 'Las fechas de inicio y fin son obligatorias';
  end if;

  if p_new_end_date < p_new_start_date then
    raise exception 'La fecha de fin no puede ser anterior a la de inicio';
  end if;

  -- Bloquear la vacación para evitar modificaciones concurrentes
  select *
  into vacation_record
  from public.vacations
  where id = p_vacation_id
  for update;

  if not found then
    raise exception 'Solicitud de vacaciones no encontrada'
      using errcode = 'P0002';
  end if;

  if vacation_record.status <> 'approved' then
    raise exception 'Solo se pueden editar vacaciones aprobadas';
  end if;

  -- Calcular días originales y nuevos
  old_days := (vacation_record.end_date - vacation_record.start_date) + 1;
  new_days := (p_new_end_date - p_new_start_date) + 1;
  day_difference := new_days - old_days;

  -- Bloquear la fila del empleado para evitar condiciones de carrera
  select available_days
  into employee_days
  from public.employees
  where id = vacation_record.employee_id
  for update;

  if not found then
    raise exception 'Empleado no encontrado'
      using errcode = 'P0002';
  end if;

  -- Si los nuevos días son más que los originales, verificar saldo
  if day_difference > 0 and employee_days < day_difference then
    raise exception 'No hay suficientes días disponibles. Se necesitan % días adicionales pero solo quedan %.',
      day_difference, employee_days;
  end if;

  -- Actualizar saldo del empleado (restar diferencia: positiva si crece, negativa si decrece)
  update public.employees
  set available_days = employee_days - day_difference
  where id = vacation_record.employee_id;

  -- Actualizar las fechas de la vacación
  update public.vacations
  set
    start_date = p_new_start_date,
    end_date = p_new_end_date,
    reviewed_at = timezone('utc', now())
  where id = p_vacation_id
  returning *
  into updated_vacation;

  return updated_vacation;
end;
$$;

grant execute on function public.edit_vacation_transactional(bigint, date, date) to authenticated;

commit;
