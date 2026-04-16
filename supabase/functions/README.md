## Funciones de Supabase

### `provision-employee`

Alta segura de empleados:

- Verifica que el usuario autenticado sea administrador.
- Crea el usuario en `auth.users` con `admin.createUser`.
- Crea la fila en `public.employees` enlazando `auth_user_id`.
- Devuelve una contraseña temporal para entregar al empleado.

### Variables necesarias

La función usa las variables estándar del runtime de Supabase:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Despliegue

```bash
supabase functions deploy provision-employee
```

### Nota operativa

Las cuentas nuevas se crean con `requires_password_change = true`, por lo que la app forzará el cambio de contraseña en el primer acceso.
