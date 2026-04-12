# Backlog de TransferLog (Tareas y Mejoras)

Este documento centraliza todas las incidencias y mejoras planificadas para el proyecto **TransferLog**.

## 🚀 Próximas Tareas (Pendientes)

### Diseño y Experiencia de Usuario (UI/UX)
- [ ] **Issue #19 - Pantalla de Ajustes de Usuario (Settings):** 
  - *Descripción:* Crear una pantalla independiente `SettingsScreen` accesible desde la Tab Bar. Migrar allí las opciones de "Cerrar sesión", el recuadro para "Cambiar contraseña" y mostrar información útil del perfil del usuario (nombre, rol y resumen de días disponibles). Esto limpiará completamente el `HomeScreen`.
  - *Prioridad:* Alta.
- [ ] **Issue #10 - Navegación Premium:** 
  - *Descripción:* Iconos sólidos en la Tab Bar y destaque del botón central.
  - *Prioridad:* Media.

### Funcionalidades Core
- [ ] **Issue #13 - Registro de Jornada (Fichaje):** 
  - *Descripción:* Botón de 'Entrada/Salida' que registre eventos en Supabase.
  - *Prioridad:* Alta.
- [ ] **Issue #16 - Gestión de Vacaciones Aprobadas (Control Admin):** 
  - *Descripción:* Botón para cancelar vacaciones aprobadas y devolver días automáticamente.
  - *Prioridad:* Alta.
- [ ] **Issue #17 - Reseteo de Contraseñas:** 
  - *Descripción:* Permitir al admin cambiar la clave de un empleado.
  - *Prioridad:* Media.

### Reportes e Ingeniería
- [ ] **Issue #12 - Plantillas Horarias:** 
  - *Descripción:* Añadir campos `start_time` y `end_time` a los turnos.
  - *Prioridad:* Baja.
- [ ] **Issue #14 - Exportación a PDF:** 
  - *Descripción:* Generar cuadrícula mensual en PDF.
  - *Prioridad:* Baja.
- [ ] **Issue #11 - Suite de Pruebas:** 
  - *Descripción:* Configurar Jest y realizar tests de lógica de negocio.
  - *Prioridad:* Media.

### Seguridad y Autenticación
- [ ] **Issue #18 - Migración a Supabase Auth:** 
  - *Descripción:* Implementar el sistema nativo de Supabase Auth para gestionar usuarios, sesiones persistentes y encriptación de contraseñas, vinculando el `UID` de Auth con la tabla `employees`.
  - *Prioridad:* Media.

---

## ✅ Tareas Completadas
- [x] **Issue #9 - Rediseño del Dashboard:** Pantalla de inicio minimalista con botones degradados (`expo-linear-gradient`).
- [x] **BugFix - Navegación y Carga del Panel Admin:** 
  - *Incidencia:* Error `The action 'NAVIGATE' with payload {"name":"Admin"} was not handled by any navigator` al pulsar el botón desde Home, seguido de un problema donde los datos de administración no se cargaban.
  - *Solución:* Se reintegró `AdminScreen` al `MainTabs` con el botón oculto (`tabBarButton: () => null`) para preservar la visibilidad del menú inferior. Se añadió `useFocusEffect` en `AdminScreen` para forzar la recarga de datos de la base de datos al mostrar la pestaña, en lugar de usar un `useEffect` que solo cargaba una vez en segundo plano.
- [x] **Issue #8:** Asignación masiva de turnos mediante calendario interactivo.
- [x] **Issue #15:** Selector táctil de vacaciones para empleados.
- [x] **Migración a Supabase:** Sincronización en tiempo real finalizada.
