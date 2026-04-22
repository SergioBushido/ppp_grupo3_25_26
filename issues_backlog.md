# Backlog de TransferLog (Tareas y Mejoras)

Este documento centraliza todas las incidencias y mejoras planificadas para el proyecto **TransferLog**.
## 🚀 Próximas Tareas (Pendientes)

### Funcionalidades Core
- Todo completado.



- [ ] **Issue #11 - Suite de Pruebas:** 
  - *Descripción:* Configurar Jest y realizar tests de lógica de negocio.
  - *Prioridad:* Media.

### Seguridad y Autenticación
- [x] **Issue #28 - Migración a Supabase Auth:** 
  - *Descripción:* Implementado el sistema nativo de Supabase Auth para gestionar usuarios, sesiones persistentes y cambio de contraseña, vinculando `auth.users.id` con la tabla `employees.auth_user_id`.
  - *Prioridad:* Media.

### Auditoría Técnica (15/04)

#### 🔴 Urgente (Bloqueante)
- [x] **Issue #28 - Migrar autenticación a Supabase Auth y eliminar contraseñas en texto plano**
  - *Área:* Seguridad y privacidad.
  - *Severidad:* Crítica.
  - *Tipo:* Bug confirmado.
  - *Impacto:* Riesgo de exposición de credenciales y compromiso total de cuentas si se mantiene el modelo actual de login/password en tabla `employees`.
  - *Módulos afectados:* `src/database/employeeService.js`, `src/context/AuthContext.js`, `src/screens/LoginScreen.js`.
  - *Acción aplicada:* Sustituida la autenticación custom por `supabase.auth`, eliminadas consultas por password en cliente, enlazado el perfil por `auth_user_id` y eliminada la columna `password` de `employees`.
  - *Criterio de aceptación:* Cumplido. No existe ninguna comparación/lectura de `password` en cliente; login, logout y cambio de contraseña funcionan con Supabase Auth y sesión persistente.

- [x] **Issue #31 - Corregir bug de fechas en edición admin de vacaciones**
  - *Área:* Bugs y errores.
  - *Severidad:* Alta.
  - *Tipo:* Bug confirmado.
  - *Impacto:* Posibles errores de ejecución y cálculos incorrectos al editar solicitudes desde Admin.
  - *Módulos afectados:* `src/screens/AdminRequestVacationScreen.js`.
  - *Acción aplicada:* Normalizadas las fechas de entrada con parseo seguro y validación de nulos, unificadas las comparaciones de rango usando valores ya parseados y ajustado el calendario para editar solicitudes existentes sin romper el flujo por fechas inválidas o anteriores.
  - *Criterio de aceptación:* Cumplido. La pantalla de edición ya no falla por parseo inconsistente y calcula correctamente días solicitados/disponibles en los escenarios contemplados.

- [x] **Bugfix interno - Corregir lógica de validación y mensajes en `editRequestVacation`**
  - *Área:* Bugs y errores.
  - *Severidad:* Alta.
  - *Tipo:* Bug confirmado.
  - *Impacto:* Validaciones inconsistentes y posibilidad de saldo de vacaciones incorrecto.
  - *Módulos afectados:* `src/database/vacationService.js`.
  - *Acción aplicada:* Corregida la variable `days` no definida en mensajes y corregido el retorno inválido de `editRequestVacation`.
  - *Criterio de aceptación:* Cumplido parcialmente. Los mensajes y el retorno ya son coherentes; queda recomendable revisar a futuro la regla de negocio completa del saldo en escenarios complejos.

- [x] **Issue #30 - Hacer transaccional la aprobación/cancelación de vacaciones**
  - *Área:* Arquitectura y escalabilidad.
  - *Severidad:* Alta.
  - *Tipo:* Riesgo potencial.
  - *Impacto:* Inconsistencias de datos si una operación parcial actualiza `vacations` pero no `employees.available_days` (o viceversa).
  - *Módulos afectados:* `src/database/vacationService.js` y `supabase/migrations/20260418103200_issue_30_transactional_vacations.sql`.
  - *Problemas encontrados:* La app seguía aprobando/cancelando vacaciones con dos escrituras separadas y podía dejar datos inconsistentes. Durante el despliegue en Supabase SQL Editor apareció además un falso positivo de RLS sobre `vacation_record` y un error `42P01 relation "vacation_record" does not exist` al ejecutar bloques parciales o interpretar de forma problemática `%rowtype`.
  - *Solución aplicada:* Se movió la lógica crítica a las RPCs `approve_vacation_transactional` y `cancel_vacation_transactional` con bloqueo `FOR UPDATE`, validación de estado y actualización atómica de vacaciones y saldo. Para evitar problemas del editor de Supabase, la migración quedó usando el tipo compuesto `public.vacations` en lugar de `%rowtype`, y se documentó su ejecución completa en el SQL Editor.
  - *Criterio de aceptación:* Cumplido. Aprobación y cancelación se ejecutan ya desde RPC transaccional y la migración quedó aplicada en Supabase sin errores.

#### 🟠 Importante (Siguiente iteración)
- [x] **Issue #28 - Implementar sesión persistente real en AuthContext**
  - *Área:* Seguridad y privacidad.
  - *Severidad:* Media.
  - *Tipo:* Deuda técnica.
  - *Impacto:* Pérdida de sesión al reiniciar la app y mayor fragilidad del flujo de autenticación.
  - *Módulos afectados:* `src/context/AuthContext.js`, `src/navigation/AppNavigator.js`.
  - *Acción aplicada:* Inicialización de sesión con `getSession`, suscripción a `onAuthStateChange`, persistencia mediante `AsyncStorage` y desacoplamiento entre sesión Auth y perfil de empleado.
  - *Criterio de aceptación:* Cumplido. El usuario autenticado mantiene sesión tras reiniciar app y la navegación se hidrata correctamente.

- [x] **Issue #33 - Permitir a cada usuario subir y cambiar su foto de perfil**
  - *Área:* Experiencia de usuario.
  - *Severidad:* Media.
  - *Tipo:* Nueva funcionalidad.
  - *Impacto:* Mejora la identificación visual del empleado en ajustes, fichajes, panel admin y futuras vistas con avatar persistente.
  - *Objetivo:* Que cada usuario pueda seleccionar, subir, reemplazar y visualizar su imagen de perfil de forma segura desde la app.
  - *Módulos afectados:* `src/screens/SettingsScreen.js`, `src/context/AuthContext.js`, componentes con avatar (`AdminScreen`, monitor de fichajes, futuras tarjetas de perfil), Storage y SQL de Supabase.
  - *Propuesta técnica:* Añadir campo `avatar_url` en `employees`, crear bucket privado o controlado en Supabase Storage, subir imágenes redimensionadas desde la app, guardar la URL pública o firmada en el perfil y refrescar el contexto de usuario tras cada cambio.
  - *Plan de implementación:*
    1. Crear migración SQL para añadir `avatar_url` en `employees` y revisar políticas RLS relacionadas con lectura/actualización del perfil.
    2. Configurar bucket de Supabase Storage y definir reglas de acceso para que cada empleado solo pueda gestionar su propia foto.
    3. Implementar servicio cliente para elegir imagen, validar tipo/tamaño, subirla a Storage y persistir la referencia en `employees`.
    4. Añadir UI en `SettingsScreen` para previsualizar, cambiar y eliminar la foto de perfil, con estados de carga y error.
    5. Sustituir iniciales por avatar real en pantallas donde ya se muestran usuarios, manteniendo fallback visual cuando no haya imagen.
    6. Validar manualmente subida inicial, reemplazo, persistencia tras reinicio y comportamiento ante fallo de red o imagen inválida.
  - *Acción aplicada:* Añadido `avatar_url` en `employees`, bucket privado `avatars` en Supabase Storage con políticas de acceso por usuario/admin, RPC segura para actualizar la referencia, selector de imagen en `SettingsScreen`, refresco del perfil autenticado y reutilización de avatar real con fallback en ajustes y panel de administración.
  - *Criterios de aceptación:* Cumplido. El usuario autenticado puede actualizar su foto desde ajustes, la imagen persiste tras reiniciar sesión, se refleja en las vistas principales con fallback correcto y no permite modificar imágenes de otros usuarios.

- [x] **Issue #34 - Configurar fichaje por geolocalización flexible por empleado**
  - *Área:* Operativa y control horario.
  - *Severidad:* Media.
  - *Tipo:* Nueva funcionalidad.
  - *Impacto:* Permite adaptar el fichaje a la realidad de cada trabajador, diferenciando entre personal móvil y personal que debe registrar entrada/salida desde un centro concreto.
  - *Objetivo:* Que el administrador pueda decidir por empleado si el fichaje se valida en cualquier ubicación o solo dentro del radio de un centro de trabajo asignado.
  - *Módulos afectados:* `src/screens/AdminScreen.js`, flujo de edición de empleados, `src/database/employeeService.js`, `src/database/attendanceService.js`, pantalla de fichaje/Home, permisos de ubicación en Expo y SQL de Supabase.
  - *Propuesta técnica:* Añadir configuración de política de fichaje en `employees` (`anywhere`, `assigned_center`, opcionalmente `manual_only`), tabla `work_centers` con latitud/longitud/radio, almacenamiento de coordenadas y precisión en `attendances`, y validación previa al fichaje según la política del empleado.
  - *Plan de implementación:*
    1. Crear migraciones SQL para `work_centers`, relación opcional con `employees`, campos de política de fichaje y columnas de geolocalización/precisión en `attendances`.
    2. Definir políticas RLS y consultas para que el admin gestione centros y configuración, y cada empleado solo consuma lo necesario para validar su fichaje.
    3. Implementar en la app la lectura de ubicación con permisos explícitos, timeout controlado y captura de precisión usando `expo-location`.
    4. Añadir en administración la configuración por empleado del modo de fichaje y, si aplica, el centro de trabajo asignado con radio editable.
    5. Validar en el flujo de fichaje si el usuario puede registrar desde cualquier sitio o si debe estar dentro del radio permitido, mostrando mensajes claros de dentro/fuera de zona.
    6. Guardar en cada fichaje la evidencia mínima de ubicación (latitud, longitud, precisión, centro validado o motivo de exención) para futuras auditorías.
    7. Probar manualmente escenarios de empleado móvil, empleado con centro asignado, GPS impreciso, permisos denegados y fichaje fuera de zona.
  - *Problemas encontrados:* Durante la implantación en Supabase SQL Editor, la RPC prevista para validar y registrar el fichaje con geolocalización (`register_attendance_with_location`) provocó errores inconsistentes de parseo/compilación (`42P01 relation ... does not exist`, advertencias falsas de RLS sobre identificadores locales y bloques PL/pgSQL corrompidos por el propio editor), impidiendo cerrar con seguridad la validación sensible en SQL en esta iteración. En pruebas manuales posteriores también apareció un rechazo RLS al insertar fichajes (`42501 new row violates row-level security policy for table "attendances"`) al pasar de RPC a inserción directa desde cliente. Además, en móvil el modal de edición de empleado de administración no permitía desplazarse hasta los botones de acción al seleccionar política de fichaje, bloqueando el guardado en pantallas pequeñas.
  - *Solución aplicada en esta iteración:* Se mantuvo la parte estable en base de datos (`work_centers`, política de fichaje en `employees`, columnas de evidencia en `attendances`, RLS de centros y función `calculate_distance_meters`) y se movió temporalmente la validación operativa al cliente: la app solicita permisos con `expo-location`, calcula distancia/radio en cliente, bloquea fichajes inválidos y persiste la evidencia mínima de ubicación en `attendances`. Se corrigió la política `attendances_insert_own_or_admin` para permitir inserciones del empleado autenticado vinculando `employee_id` con `auth.uid()`. En administración ya se pueden crear centros y asignar la política por empleado, y el modal de edición se adaptó con `ScrollView` y altura máxima para recuperar el guardado en responsive. También se añadió un botón `Mostrar ubicación` en el monitor de fichajes para consultar coordenadas, precisión y abrir el punto en mapas.
  - *Estado actual:* Cerrada funcionalmente. La app ya soporta `anywhere`, `assigned_center` y `manual_only`, muestra trazabilidad en admin, abre la evidencia de ubicación desde el monitor y reconsulta la configuración vigente del empleado antes de fichar para evitar decisiones con estado obsoleto en cliente. La validación crítica permanece en cliente en esta iteración, con opción futura de volver a moverla a RPC/backend si se quiere endurecer aún más la lógica sensible.
  - *Criterios de aceptación:* Cumplidos tras validación manual. Se verificó el comportamiento esperado en `manual_only` y el monitor admin recuperó visibilidad correcta del histórico con evidencia de ubicación; la operativa de geolocalización y trazabilidad queda aceptada para esta iteración.
  - *Cierre técnico:* Se da por concluida la issue en cliente. Como mejora futura no bloqueante, sigue siendo razonable estudiar una consolidación backend/RPC de la validación de fichaje cuando el ciclo de despliegue SQL sea más estable.

- [ ] **Issue #35 - Permitir anulación auditada de fichajes desde administración**
  - *Área:* Operativa y control horario.
  - *Severidad:* Media.
  - *Tipo:* Nueva funcionalidad.
  - *Impacto:* Permite corregir errores operativos en fichajes sin perder trazabilidad ni comprometer la auditoría del registro horario.
  - *Objetivo:* Que el administrador pueda anular fichajes erróneos desde el monitor diario dejando motivo y rastro del cambio, evitando el borrado físico del dato.
  - *Módulos afectados:* `src/screens/AdminScreen.js`, `src/database/attendanceService.js`, políticas RLS de `attendances` y nueva migración SQL en `supabase/migrations`.
  - *Propuesta técnica:* Añadir estado auditado al fichaje (`active`/`voided`), motivo de anulación, marca temporal y referencia al admin que ejecuta la acción. Restringir la anulación al último fichaje activo del empleado en ese día para no romper la secuencia de entrada/salida.
  - *Problema encontrado durante la implantación:* Tras aplicar la migración y el primer cambio de frontend, el monitor de fichajes del panel admin dejó de mostrar registros aunque la tabla `attendances` seguía conteniendo datos. El incidente se manifestó de dos formas: primero con error de columna inexistente (`42703 column attendances.record_status does not exist`) cuando el entorno no tenía aún la migración aplicada; después, incluso con la migración ejecutada, la vista seguía vacía por una combinación de dependencias frágiles en la carga del monitor (filtro diario sensible a fecha/hora y consulta con relación embebida a `employees`).
  - *Solución aplicada:* Se implementó la migración `20260419113000_issue_35_admin_attendance_controls.sql` con columnas de auditoría y política `update` solo para admin; se añadió servicio `invalidateAttendanceByAdmin` con validación de “último fichaje activo del día”; se reforzó `attendanceService` con compatibilidad hacia atrás cuando `record_status` todavía no existe; y se estabilizó el monitor admin cargando fichajes recientes desde `attendances` sin depender del join embebido con `employees`, resolviendo el nombre del empleado desde el estado ya cargado en administración y aplicando el filtro de fecha en cliente. Con ello volvió a visualizarse el histórico y quedó operativa la anulación auditada.
  - *Criterios de aceptación:* Pendiente de validación manual tras aplicar migración. El admin puede anular el último fichaje activo del día con motivo obligatorio, el registro sigue visible como anulado en el monitor y el empleado vuelve a operar solo con los fichajes activos restantes.

- [x] **Issue #26 - Permitir registro manual de fichajes por administración**
  - *Área:* Operativa y control horario.
  - *Severidad:* Media.
  - *Tipo:* Nueva funcionalidad.
  - *Impacto:* Completa el flujo `manual_only` permitiendo que el administrador registre entradas y salidas cuando el empleado no puede hacerlo desde la app.
  - *Objetivo:* Que el admin pueda crear manualmente un fichaje de entrada o salida desde el panel, con fecha/hora y motivo operativo opcional, respetando las reglas básicas de secuencia.
  - *Módulos afectados:* `src/screens/Admin/modals/ManualAttendanceModal.js`, `src/screens/Admin/tabs/AttendancesTab.js`, `src/screens/AdminScreen.js`, `src/database/attendanceService.js`, migración `20260419152000_issue_26_admin_manual_attendance.sql`.
  - *Solución aplicada:* Implementado modal de registro manual con selector de empleado (con `check` visual), tipo entrada/salida, input de hora con validación en tiempo real, selector rápido de horas frecuentes (`08:00`, `09:00`…), nota administrativa con contador de caracteres y bloqueo del botón guardar hasta que los campos requeridos son válidos. Validaciones de secuencia (`in` antes de `out`, sin duplicados) gestionadas en `createManualAttendanceByAdmin`. El fichaje queda marcado con `entry_mode: 'admin_manual'` y muestra el badge "Creado por administración" en el monitor. También se corrigió el monitor (Audit M-01): ahora usa `getAllAttendancesByDate` en lugar de obtener 200 registros y filtrar en cliente.
  - *Criterios de aceptación:* Cumplidos. El admin puede registrar manualmente una entrada o salida válida, el movimiento aparece inmediatamente en el monitor con badge de auditoría, la operación es bloqueada si la secuencia es inválida y convive correctamente con empleados `manual_only`.

- [x] **Tarea técnica - Estandarizar manejo de errores y reintento en cargas de pantallas**
  - *Área:* Bugs y errores.
  - *Severidad:* Media.
  - *Tipo:* Bug confirmado.
  - *Impacto:* Estados de carga inconsistentes y mala recuperación ante fallos de red.
  - *Módulos afectados:* `src/screens/VacationsScreen.js`, `src/screens/CalendarScreen.js` (y homogeneizar resto).
  - *Acción recomendada:* Aplicar patrón común `try/catch/finally`, estado de error visual y CTA de reintento.
  - *Acción aplicada:* Se han añadido bloques `try/catch` con `Alert` descriptivo para la anulación de vacaciones y para los errores de carga inicial en el calendario.
  - *Criterio de aceptación:* Cumplido parcialmente (queda iterar y estandarizar componentes reusables de error, pero las pantallas críticas ya están cubiertas).

- [ ] **Issue #11 - Configurar suite de tests para lógica de negocio**
  - *Área:* Cobertura de tests.
  - *Severidad:* Media.
  - *Tipo:* Deuda técnica.
  - *Impacto:* Alta probabilidad de regresiones en reglas críticas (vacaciones, fichajes, auth).
  - *Módulos afectados:* `package.json`, servicios de `src/database/*`.
  - *Acción recomendada:* Configurar `jest`/`jest-expo`, mocks de Supabase y casos de prueba críticos.
  - *Criterio de aceptación:* La suite se ejecuta en local y cubre al menos reglas principales de vacaciones/auth/fichajes.

### 🔍 Auditoría Técnica Profunda (19/04)

> [!IMPORTANT]
> Los detalles técnicos completos y la priorización se encuentran en el informe de [Auditoría Técnica](file:///c:/Users/sergi/Proyectos/ppp_grupo3/auditorias/2026-04-19_auditoria_tecnica.md).
> Todas las implementaciones deben cumplir con el **[Criterio para Nuevas Issues Técnicas](file:///c:/Users/sergi/Proyectos/ppp_grupo3/AGENTS.md)** definido en `AGENTS.md`.

#### 🔴 Prioridad Alta (Integridad y Estabilidad)
- [x] **Issue #44 - Corregir bloqueo por RLS en el primer cambio de contraseña:**
  - *Área:* Seguridad y Autenticación.
  - *Severidad:* Crítica.
  - *Tipo:* Bug confirmado.
  - *Impacto:* Bloqueo total del acceso para nuevos empleados tras el primer login al no poder limpiar su propio flag de cambio obligatorio por restricciones de RLS.
  - *Solución aplicada:* Creada una RPC `complete_own_password_change` con `security definer` en Supabase para permitir que los usuarios limpien su propio flag de forma segura. Actualizado `employeeService.js` para invocar esta RPC y reforzada la lógica de `ForcePasswordChangeScreen.js` con un retardo de consistencia y verificación de perfil antes de transicionar.
  - *Migración:* `supabase/migrations/20260420_fix_password_change_rls.sql`.
  - *Criterio de aceptación:* Cumplido. Los nuevos usuarios pueden cambiar su contraseña y acceder a la sesión principal sin intervención manual del administrador.

- [x] **Issue #37 - Refactor transaccional de `editRequestVacation` (C-01):**
  - *Problema:* La edición de vacaciones no era atómica y podía dejar saldos inconsistentes si fallaba a mitad.
  - *Impacto:* Crítico para la integridad de datos de recursos humanos.
  - *Solución aplicada:* Creada RPC `edit_vacation_transactional` en Supabase con bloqueo `FOR UPDATE` en las filas de `vacations` y `employees`, cálculo atómico del diferencial de días y validación de saldo dentro de la transacción. Simplificado el servicio cliente para delegar toda la lógica a la RPC, eliminando los cálculos de saldo en cliente y las dos escrituras separadas.
  - *Migración:* `supabase/migrations/20260419125400_issue_37_transactional_edit_vacation.sql`
  - *Archivos modificados:* `src/database/vacationService.js`, `src/screens/AdminRequestVacationScreen.js`.
  - *Severidad:* Crítica.
  - *Criterio de aceptación:* Cumplido. La edición de vacaciones se ejecuta ahora desde RPC transaccional. Si falla cualquier paso, la transacción se revierte completamente sin dejar estado inconsistente.

- [x] **Issue #38 - Estabilidad y Robustez: Manejo de errores y duplicados (A-02, A-03, A-04, L-03):**
  - *Problema:* Pantallas críticas (`Vacations`, `Calendar`) sin `try/catch`, `useFocusEffect` duplicado en AdminScreen y comparación de Date por referencia en RequestVacationScreen.
  - *Solución aplicada:*
    - **A-02:** Eliminado `useFocusEffect` duplicado en `AdminScreen.js` (líneas 1070-1074).
    - **A-03:** Añadido `try/catch/finally` en `VacationsScreen.loadVacations` con `Alert` de error.
    - **A-04:** Añadido `catch` en `CalendarScreen.loadData` para capturar errores de red.
    - **L-03:** Corregida comparación `startDate !== endDate` a `startDate.getTime() !== endDate.getTime()` en `RequestVacationScreen`.
  - *Severidad:* Alta.
  - *Criterio de aceptación:* Cumplido. La app no se bloquea ante fallos de red, AdminScreen no duplica cargas y la comparación de fechas es correcta por valor.

- [x] **Issue #39 - Seguridad y Limpieza de Entorno (C-02):**
  - *Acción:* Implementar pre-commit hooks para evitar fugas de `.env` y documentar rotado de claves.
  - *Severidad:* Crítica.
  - *Acción aplicada:* Husky y lint-staged configurados con un script para bloquear commits que contengan el patrón `.env`.

#### 🟠 Prioridad Media (Refactor y Deuda Técnica)
- [x] **Issue #40 - Refactor Estructural de `AdminScreen.js` (A-01):**
  - *Problema:* Fichero de ~3000 líneas. Inmantenible y lento.
  - *Solución aplicada:* Dividido el monolito en 16 módulos independientes: 5 tabs (`RequestsTab`, `ShiftsTab`, `AttendancesTab`, `EmployeesTab`, `ReportsTab`), 9 modales, 1 fichero de estilos y 1 de constantes. `AdminScreen.js` reducido de ~2870 a ~500 líneas como container.
  - *Archivos creados:* `src/screens/Admin/tabs/`, `src/screens/Admin/modals/`, `AdminScreen.styles.js`, `constants.js`.
  - *Severidad:* Alta (Técnica).
  - *Criterio de aceptación:* Cumplido. Metro compila sin errores (2384 módulos), UI y funcionalidad idénticas al original.

- [x] **Issue #41 - Consistencia Visual y Limpieza de Código (A-05, A-06, M-06, M-07, M-10):**
  - *Solución aplicada:*
    - **A-05:** Corregidos iconos de `ShiftBadge` (`wrench` → `weather-sunset` / `weather-night`).
    - **A-06:** Centralizado `LocaleConfig` en `src/config/calendarLocale.js`, importado una vez en `App.js` y eliminadas 3 copias idénticas.
    - **M-06:** Eliminada función muerta `handleFillAll`.
    - **M-07:** Sustituido import dinámico de `deleteShift` por import estático ya existente.
    - **M-10:** Eliminada función muerta `construirMatrizPDF`.
  - *Severidad:* Media.
  - *Criterio de aceptación:* Cumplido. Iconos coherentes, configuración centralizada y ~60 líneas de código muerto eliminadas.

- [x] **Issue #42 - Integridad de Usuarios en Borrado de Empleados (M-02):**
  - *Solución aplicada:* Creada Edge Function `delete-employee` que elimina coordinadamente el perfil de `public.employees`, el usuario de `auth.users` y el avatar del bucket de Storage. Refactorizado `deleteEmployee` en `employeeService.js` para invocar la Edge Function en lugar de un `DELETE` directo. Actualizado `AdminScreen.js` para pasar `auth_user_id` y mostrar confirmación al completar. Se implementó protección contra auto-eliminación del admin.
  - *Severidad:* Media.
  - *Criterio de aceptación:* Cumplido. Al borrar un empleado desde el panel, se eliminan el perfil, la cuenta Auth y el avatar. El email queda liberado para futuras altas.

- [x] **Issue #43 - Optimización de Carga de Datos en Panel Admin (M-03):**
  - *Solución aplicada:* Se eliminó la función monolítica `loadAll` y se implementó carga perezosa (`lazy loading`) por pestañas. Se restauró un wrapper `loadAll` de compatibilidad para evitar errores en handlers existentes.
  - *Nota Técnica (Bugfix):* Se detectó que el Gateway de Supabase no soporta tokens ES256 de React Native; se solucionó desplegando con `--no-verify-jwt` y validando manualmente dentro de la función.
  - *Severidad:* Media.
  - *Módulos afectados:* `src/screens/AdminScreen.js`, `supabase/functions/delete-employee/index.ts`.
  - *Criterio de aceptación:* Cumplido. La app es más rápida y el borrado es totalmente íntegro.

#### 🟡 Mejora continua
- [x] **Mejora interna - Ocultar credenciales demo en producción**
  - *Área:* Seguridad y privacidad.
  - *Severidad:* Media.
  - *Tipo:* Riesgo potencial.
  - *Impacto:* Exposición innecesaria de cuentas de prueba en entornos no controlados.
  - *Módulos afectados:* `src/screens/LoginScreen.js`.
  - *Acción aplicada:* Eliminadas las credenciales demo visibles del login y sustituido el bloque informativo por una nota de autenticación segura.
  - *Criterio de aceptación:* Cumplido. La pantalla de login ya no muestra credenciales demo.

- [ ] **Tarea técnica - Actualizar dependencias compatibles con Expo SDK actual**
  - *Área:* Arquitectura y escalabilidad.
  - *Severidad:* Baja.
  - *Tipo:* Deuda técnica.
  - *Impacto:* Acumulación de parches pendientes y mayor riesgo de bugs ya corregidos upstream.
  - *Módulos afectados:* `package.json`, `package-lock.json`.
  - *Acción recomendada:* Actualizar paquetes a versiones *wanted* compatibles con SDK actual y validar smoke tests.
  - *Criterio de aceptación:* App compila/arranca sin regresiones y con dependencias de parche al día.

---

## ✅ Tareas Completadas
- [x] **Issue #33 - Foto de perfil por usuario (18/04):** Implementada la subida, reemplazo y eliminación de avatar desde ajustes con `expo-image-picker`, Storage privado de Supabase, persistencia en `employees.avatar_url`, refresco del contexto autenticado y visualización del avatar en administración con fallback por iniciales.
- [x] **Issue #1 - Gestión de empleados:** Altas, edición y bajas de personal implementadas en el panel de administración.
- [x] **Issue #2 - Validar conflictos entre turnos asignados y vacaciones aprobadas:** Añadidas comprobaciones para evitar solapamientos en la planificación.
- [x] **Issue #3 - Optimización de asignación de turnos mediante copia semanal o patrones:** Incorporadas mejoras para agilizar la planificación repetitiva.
- [x] **Issue #4 - Autogestión del empleado para cancelar vacaciones y cambiar contraseña:** Flujo de autogestión habilitado para vacaciones y credenciales.
- [x] **Issue #5 - Generar reportes mensuales de turnos por empleado:** Implementado el cálculo mensual y el resumen por trabajador.
- [x] **Issue #6 - Migración de infraestructura local (SQLite) a Supabase Cloud:** Migración funcional completada y sincronización centralizada en Supabase.
- [x] **Issue #7 - Corregir carga inicial de vacaciones y turnos en `CalendarScreen`:** Ajustado el flujo de carga para evitar estados inconsistentes al entrar en calendario.
- [x] **Cierre de seguridad Auth / RLS (16/04):** Migración completa del login a Supabase Auth, persistencia de sesión con `AsyncStorage`, enlace de perfiles mediante `employees.auth_user_id`, creación segura de empleados mediante Edge Function `provision-employee`, eliminación del campo `password` en `employees` y definición de políticas RLS para `employees`, `shifts`, `vacations` y `attendances`.
- [x] **Resumen breve de auditoría técnica Auth (16/04):**
  - *Hallazgos:* Existía autenticación custom contra `employees.password`, cambio/reset de contraseña desde cliente y acoplamiento entre credenciales y perfil.
  - *Problemas encontrados:* Riesgo crítico de exposición de credenciales, cuentas nuevas sin usuario Auth asociado, ausencia de RLS y bug en `editRequestVacation` por variables inconsistentes.
  - *Soluciones aplicadas:* Supabase Auth como fuente única de autenticación, Edge Function para provisionado seguro, migración a `auth_user_id`, sesión persistente real, eliminación de credenciales demo, RLS por rol/propiedad y corrección del bug en edición de vacaciones.
- [x] **Cierre técnico Issue #19 (Monitor de Fichajes Admin) (15/04):** Finalización de criterios pendientes del monitor con orden cronológico consistente, refresco manual y automático cada 30s, estados de carga/error y ajuste visual de tipo de salida en color naranja para facilitar auditoría y trazabilidad diaria.
- [x] **Issue #23 - Limpieza de SQLite y Consolidación:** Eliminación del código legado (database.js), limpieza de App.js y desinstalación de la dependencia `expo-sqlite` para optimizar el proyecto tras la migración a Supabase.
- [x] **Issue #21 - Finalización Exportación PDF y Restauración UI Premium (15/04):** Despliegue final de la lógica de generación de PDF, corrección de errores críticos de sintaxis JSX en `AdminScreen.js` y restauración de la estética Premium (Timeline y visualización dinámica) tras la limpieza de código legado.
- [x] **BugFix - Sintaxis JSX y Layout en Admin (14/04):** Corrección de etiquetas `<View>` mal cerradas y refactorización de contenedores `flex: 1` para restaurar la visibilidad de la pestaña de Fichajes.
- [x] **Issue #14 - Gestión de Vacaciones Aprobadas (Control Admin):** Botón para cancelar vacaciones aprobadas y devolver días automáticamente de forma segura.
- [x] **Issue #20 - Rediseño Premium del Monitor de Fichajes:** Implementada interfaz tipo Timeline con tarjetas, avatares dinámicos e indicadores de estado activo para el administrador.
- [x] **Issue #19 - Monitor de Fichajes (Panel Admin):** Pestaña nueva con auditoría diaria del horario exacto de entrada y salida de los empleados.
- [x] **Issue #12 - Plantillas Horarias y gestión de horas de entrada/salida:** Añadidos campos `start_time` y `end_time` a turnos, junto con el soporte funcional para la gestión de horas de entrada y salida.
- [x] **Registro de Jornada (Fichaje):** Botón de Entrada/Salida vinculado a Supabase.
- [x] **Issue #15 - Reseteo de Contraseñas (Admin):** Panel de reseteo temporal y flujo cautivo de cambio obligatorio. (Anteriormente citada como #17).
- [x] **Issue #17 - Pantalla de Ajustes de Usuario (Settings):** Creada pantalla independiente con gestión de perfil, cambio de contraseña y cierre de sesión. Limpieza del `HomeScreen`.
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
- [x] **Issue #13:** Selector táctil de vacaciones para empleados.
- [x] **Migración a Supabase:** Sincronización en tiempo real finalizada.
