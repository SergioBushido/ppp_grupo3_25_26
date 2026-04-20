-- Migración para solucionar el bloqueo de RLS al cambiar la contraseña
-- Permite que un usuario autenticado limpie su propio flag de 'cambio de contraseña obligatorio'
-- sin requerir permisos de actualización generales en la tabla de empleados.

create or replace function public.complete_own_password_change()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.employees
  set requires_password_change = false
  where auth_user_id = auth.uid();
  
  return found;
end;
$$;

-- Otorgar permisos de ejecución a usuarios autenticados
grant execute on function public.complete_own_password_change() to authenticated;

comment on function public.complete_own_password_change() is 'Marca el cambio de contraseña como completado para el usuario actualmente autenticado.';
