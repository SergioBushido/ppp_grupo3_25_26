# Backlog de TransferLog (Tareas y Mejoras)

Este documento centraliza todas las incidencias y mejoras planificadas para el proyecto **TransferLog**.

## 🚀 Próximas Tareas (Pendientes)

### Funcionalidades Core
- [ ] **Issue #16 - Gestión de Vacaciones Aprobadas (Control Admin):** 
  - *Descripción:* Botón para cancelar vacaciones aprobadas y devolver días automáticamente.
  - *Prioridad:* Alta.
- [ ] **Issue #20 - Rediseño Premium del Monitor de Fichajes:** 
  - *Descripción:* Transformar la lista de fichajes en un panel con tarjetas, timeline visual, avatares y estados activos ("En el centro").
  - *Prioridad:* Media.



### Reportes e Ingeniería
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
- [x] **Issue #17 - Monitor de Fichajes (Panel Admin):** Pestaña nueva con auditoría diaria del horario exacto de entrada y salida de los empleados.
- [x] **Issue #12 - Plantillas Horarias:** Añadidos campos `start_time` y `end_time` a turnos. Edición manual y vista explícita.
- [x] **Issue #13 - Registro de Jornada (Fichaje):** Botón de Entrada/Salida vinculado a Supabase.
- [x] **Issue #15 - Reseteo de Contraseñas (Admin):** Panel de reseteo temporal y flujo cautivo de cambio obligatorio. (Anteriormente citada como #17).
- [x] **Issue #19 - Pantalla de Ajustes de Usuario (Settings):** Creada pantalla independiente con gestión de perfil, cambio de contraseña y cierre de sesión. Limpieza del `HomeScreen`.
- [x] **Issue #9 - Rediseño del Dashboard:** Pantalla de inicio minimalista con botones degradados (`expo-linear-gradient`).
- [x] **Issue #10 - Navegación Premium:** Iconos con estados personalizados, indicadores de pestaña activa y botón de Vacaciones destacado en rojo.
- [x] **BugFix - Espaciado en Tab Bar:** 
  - *Incidencia:* Los iconos aparecían desplazados a la izquierda y no se centraban correctamente a pesar de los estilos. Se descubrió que la pestaña `Admin` (oculta con `tabBarButton: () => null`) seguía consumiendo espacio en el layout del Tab Navigator.
  - *Solución:* Se extrajo `AdminScreen` del `Tab.Navigator` y se movió al `Stack.Navigator` principal. Esto liberó el espacio y permitió que las 4 pestañas visibles se distribuyeran de forma equidistante y centrada.
- [x] **BugFix - Navegación y Carga del Panel Admin:** 
  - *Incidencia:* Error `The action 'NAVIGATE' with payload {"name":"Admin"} was not handled by any navigator` al pulsar el botón desde Home, seguido de un problema donde los datos de administración no se cargaban.
  - *Solución:* Se reintegró `AdminScreen` al `MainTabs` con el botón oculto (`tabBarButton: () => null`) para preservar la visibilidad del menú inferior. Se añadió `useFocusEffect` en `AdminScreen` para forzar la recarga de datos de la base de datos al mostrar la pestaña, en lugar de usar un `useEffect` que solo cargaba una vez en segundo plano.
- [x] **BugFix - Calendario de Asignaciones (Issue #8 / #17):**
  - *Incidencia:* El modal de asignación de turnos ("pincel") sólo guardaba el 'Día Seleccionado' en lugar de todas las fechas pintadas. Además, no mostraba visualmente los turnos que el empleado ya tenía configurados en la base de datos.
  - *Solución:* Se integró `getShiftsByEmployee` en el componente modal para precargar todo el historial del trabajador seleccionado como `dailyAssignments`. Se refactorizó la lógica en `handleAddShift` para grabar todos los cambios localizados en el `Set` `modifiedAssignmentDates`, resolviendo las inserciones desfasadas.
- [x] **Issue #8:** Asignación masiva de turnos mediante calendario interactivo.
- [x] **Issue #22:** Selector táctil de vacaciones para empleados. (Reenumerado para evitar colisión con Issue #20).
- [x] **Migración a Supabase:** Sincronización en tiempo real finalizada.
