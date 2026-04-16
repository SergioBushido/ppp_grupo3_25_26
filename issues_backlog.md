# Backlog de TransferLog (Tareas y Mejoras)

Este documento centraliza todas las incidencias y mejoras planificadas para el proyecto **TransferLog**.
## 🚀 Próximas Tareas (Pendientes)

### Funcionalidades Core
- Todo completado.



- [ ] **Issue #11 - Suite de Pruebas:** 
  - *Descripción:* Configurar Jest y realizar tests de lógica de negocio.
  - *Prioridad:* Media.

### Seguridad y Autenticación
- [x] **Issue #18 - Migración a Supabase Auth:** 
  - *Descripción:* Implementado el sistema nativo de Supabase Auth para gestionar usuarios, sesiones persistentes y cambio de contraseña, vinculando `auth.users.id` con la tabla `employees.auth_user_id`.
  - *Prioridad:* Media.

### Auditoría Técnica (15/04)

#### 🔴 Urgente (Bloqueante)
- [x] **Issue #24 - Migrar autenticación a Supabase Auth y eliminar contraseñas en texto plano**
  - *Área:* Seguridad y privacidad.
  - *Severidad:* Crítica.
  - *Tipo:* Bug confirmado.
  - *Impacto:* Riesgo de exposición de credenciales y compromiso total de cuentas si se mantiene el modelo actual de login/password en tabla `employees`.
  - *Módulos afectados:* `src/database/employeeService.js`, `src/context/AuthContext.js`, `src/screens/LoginScreen.js`.
  - *Acción aplicada:* Sustituida la autenticación custom por `supabase.auth`, eliminadas consultas por password en cliente, enlazado el perfil por `auth_user_id` y eliminada la columna `password` de `employees`.
  - *Criterio de aceptación:* Cumplido. No existe ninguna comparación/lectura de `password` en cliente; login, logout y cambio de contraseña funcionan con Supabase Auth y sesión persistente.

- [ ] **Issue #25 - Corregir bug de fechas en edición admin de vacaciones**
  - *Área:* Bugs y errores.
  - *Severidad:* Alta.
  - *Tipo:* Bug confirmado.
  - *Impacto:* Posibles errores de ejecución y cálculos incorrectos al editar solicitudes desde Admin.
  - *Módulos afectados:* `src/screens/AdminRequestVacationScreen.js`.
  - *Acción recomendada:* Normalizar entradas con `parseISO` antes de usar `differenceInCalendarDays` y `format`, validando nulos.
  - *Criterio de aceptación:* La pantalla de edición no falla y calcula correctamente días solicitados/disponibles en todos los escenarios.

- [x] **Issue #26 - Corregir lógica de validación y mensajes en editRequestVacation**
  - *Área:* Bugs y errores.
  - *Severidad:* Alta.
  - *Tipo:* Bug confirmado.
  - *Impacto:* Validaciones inconsistentes y posibilidad de saldo de vacaciones incorrecto.
  - *Módulos afectados:* `src/database/vacationService.js`.
  - *Acción aplicada:* Corregida la variable `days` no definida en mensajes y corregido el retorno inválido de `editRequestVacation`.
  - *Criterio de aceptación:* Cumplido parcialmente. Los mensajes y el retorno ya son coherentes; queda recomendable revisar a futuro la regla de negocio completa del saldo en escenarios complejos.

- [ ] **Issue #27 - Hacer transaccional la aprobación/cancelación de vacaciones**
  - *Área:* Arquitectura y escalabilidad.
  - *Severidad:* Alta.
  - *Tipo:* Riesgo potencial.
  - *Impacto:* Inconsistencias de datos si una operación parcial actualiza `vacations` pero no `employees.available_days` (o viceversa).
  - *Módulos afectados:* `src/database/vacationService.js` y funciones SQL/RPC de Supabase.
  - *Acción recomendada:* Encapsular cada operación en una única transacción SQL/RPC idempotente.
  - *Criterio de aceptación:* Cada cambio de estado deja datos consistentes incluso ante fallos intermedios o reintentos.

#### 🟠 Importante (Siguiente iteración)
- [x] **Issue #28 - Implementar sesión persistente real en AuthContext**
  - *Área:* Seguridad y privacidad.
  - *Severidad:* Media.
  - *Tipo:* Deuda técnica.
  - *Impacto:* Pérdida de sesión al reiniciar la app y mayor fragilidad del flujo de autenticación.
  - *Módulos afectados:* `src/context/AuthContext.js`, `src/navigation/AppNavigator.js`.
  - *Acción aplicada:* Inicialización de sesión con `getSession`, suscripción a `onAuthStateChange`, persistencia mediante `AsyncStorage` y desacoplamiento entre sesión Auth y perfil de empleado.
  - *Criterio de aceptación:* Cumplido. El usuario autenticado mantiene sesión tras reiniciar app y la navegación se hidrata correctamente.

- [ ] **Issue #29 - Estandarizar manejo de errores y reintento en cargas de pantallas**
  - *Área:* Bugs y errores.
  - *Severidad:* Media.
  - *Tipo:* Bug confirmado.
  - *Impacto:* Estados de carga inconsistentes y mala recuperación ante fallos de red.
  - *Módulos afectados:* `src/screens/VacationsScreen.js`, `src/screens/CalendarScreen.js` (y homogeneizar resto).
  - *Acción recomendada:* Aplicar patrón común `try/catch/finally`, estado de error visual y CTA de reintento.
  - *Criterio de aceptación:* Ante fallo simulado de red, la UI muestra error controlado y permite recuperar sin reiniciar app.

- [ ] **Issue #30 - Configurar suite de tests para lógica de negocio**
  - *Área:* Cobertura de tests.
  - *Severidad:* Media.
  - *Tipo:* Deuda técnica.
  - *Impacto:* Alta probabilidad de regresiones en reglas críticas (vacaciones, fichajes, auth).
  - *Módulos afectados:* `package.json`, servicios de `src/database/*`.
  - *Acción recomendada:* Configurar `jest`/`jest-expo`, mocks de Supabase y casos de prueba críticos.
  - *Criterio de aceptación:* La suite se ejecuta en local y cubre al menos reglas principales de vacaciones/auth/fichajes.

#### 🟡 Mejora continua
- [x] **Issue #31 - Ocultar credenciales demo en producción**
  - *Área:* Seguridad y privacidad.
  - *Severidad:* Media.
  - *Tipo:* Riesgo potencial.
  - *Impacto:* Exposición innecesaria de cuentas de prueba en entornos no controlados.
  - *Módulos afectados:* `src/screens/LoginScreen.js`.
  - *Acción aplicada:* Eliminadas las credenciales demo visibles del login y sustituido el bloque informativo por una nota de autenticación segura.
  - *Criterio de aceptación:* Cumplido. La pantalla de login ya no muestra credenciales demo.

- [ ] **Issue #32 - Actualizar dependencias compatibles con Expo SDK actual**
  - *Área:* Arquitectura y escalabilidad.
  - *Severidad:* Baja.
  - *Tipo:* Deuda técnica.
  - *Impacto:* Acumulación de parches pendientes y mayor riesgo de bugs ya corregidos upstream.
  - *Módulos afectados:* `package.json`, `package-lock.json`.
  - *Acción recomendada:* Actualizar paquetes a versiones *wanted* compatibles con SDK actual y validar smoke tests.
  - *Criterio de aceptación:* App compila/arranca sin regresiones y con dependencias de parche al día.

---

## ✅ Tareas Completadas
- [x] **Cierre de seguridad Auth / RLS (16/04):** Migración completa del login a Supabase Auth, persistencia de sesión con `AsyncStorage`, enlace de perfiles mediante `employees.auth_user_id`, creación segura de empleados mediante Edge Function `provision-employee`, eliminación del campo `password` en `employees` y definición de políticas RLS para `employees`, `shifts`, `vacations` y `attendances`.
- [x] **Resumen breve de auditoría técnica Auth (16/04):**
  - *Hallazgos:* Existía autenticación custom contra `employees.password`, cambio/reset de contraseña desde cliente y acoplamiento entre credenciales y perfil.
  - *Problemas encontrados:* Riesgo crítico de exposición de credenciales, cuentas nuevas sin usuario Auth asociado, ausencia de RLS y bug en `editRequestVacation` por variables inconsistentes.
  - *Soluciones aplicadas:* Supabase Auth como fuente única de autenticación, Edge Function para provisionado seguro, migración a `auth_user_id`, sesión persistente real, eliminación de credenciales demo, RLS por rol/propiedad y corrección del bug en edición de vacaciones.
- [x] **Cierre técnico Issue #19 (Monitor de Fichajes Admin) (15/04):** Finalización de criterios pendientes del monitor con orden cronológico consistente, refresco manual y automático cada 30s, estados de carga/error y ajuste visual de tipo de salida en color naranja para facilitar auditoría y trazabilidad diaria.
- [x] **Issue #23 - Limpieza de SQLite y Consolidación:** Eliminación del código legado (database.js), limpieza de App.js y desinstalación de la dependencia `expo-sqlite` para optimizar el proyecto tras la migración a Supabase.
- [x] **Issue #21 - Finalización Exportación PDF y Restauración UI Premium (15/04):** Despliegue final de la lógica de generación de PDF, corrección de errores críticos de sintaxis JSX en `AdminScreen.js` y restauración de la estética Premium (Timeline y visualización dinámica) tras la limpieza de código legado.
- [x] **BugFix - Sintaxis JSX y Layout en Admin (14/04):** Corrección de etiquetas `<View>` mal cerradas y refactorización de contenedores `flex: 1` para restaurar la visibilidad de la pestaña de Fichajes.
- [x] **Issue #16 - Gestión de Vacaciones Aprobadas (Control Admin):** Botón para cancelar vacaciones aprobadas y devolver días automáticamente de forma segura.
- [x] **Issue #20 - Rediseño Premium del Monitor de Fichajes:** Implementada interfaz tipo Timeline con tarjetas, avatares dinámicos e indicadores de estado activo para el administrador.
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
