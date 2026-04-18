begin;

alter table public.employees
add column if not exists avatar_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  false,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists avatar_objects_select_own_or_admin on storage.objects;
create policy avatar_objects_select_own_or_admin
on storage.objects
for select
to authenticated
using (
  bucket_id = 'avatars'
  and (
    public.current_user_is_admin()
    or split_part(name, '/', 1) = auth.uid()::text
  )
);

drop policy if exists avatar_objects_insert_own_or_admin on storage.objects;
create policy avatar_objects_insert_own_or_admin
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (
    public.current_user_is_admin()
    or split_part(name, '/', 1) = auth.uid()::text
  )
);

drop policy if exists avatar_objects_update_own_or_admin on storage.objects;
create policy avatar_objects_update_own_or_admin
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and (
    public.current_user_is_admin()
    or split_part(name, '/', 1) = auth.uid()::text
  )
)
with check (
  bucket_id = 'avatars'
  and (
    public.current_user_is_admin()
    or split_part(name, '/', 1) = auth.uid()::text
  )
);

drop policy if exists avatar_objects_delete_own_or_admin on storage.objects;
create policy avatar_objects_delete_own_or_admin
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (
    public.current_user_is_admin()
    or split_part(name, '/', 1) = auth.uid()::text
  )
);

create or replace function public.update_my_avatar_url(next_avatar_url text)
returns public.employees
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_employee public.employees;
begin
  update public.employees
  set avatar_url = nullif(trim(next_avatar_url), '')
  where auth_user_id = auth.uid()
  returning * into updated_employee;

  if updated_employee.id is null then
    raise exception 'No se encontro un perfil de empleado asociado a la sesion actual.';
  end if;

  return updated_employee;
end;
$$;

grant execute on function public.update_my_avatar_url(text) to authenticated;

commit;
