# Memoria de tareas efectivas realizadas, esfuerzo y problemas encontrados

Proyecto: **TransferLog**  
Periodo documentado: **14/04/2026 - 24/04/2026**  
Fuente principal: `issues_backlog.md`, auditorias tecnicas, historial de commits, migraciones Supabase y estructura actual del repositorio.

---

## 1. Criterio utilizado para documentar el trabajo

Este documento resume las tareas efectivamente realizadas durante la fase final de desarrollo y estabilizacion de TransferLog. Se ha elaborado a partir de evidencias del propio repositorio: backlog, commits, migraciones SQL, Edge Functions, servicios de negocio, pantallas React Native y pruebas automatizadas.

Los tiempos indicados son **estimaciones razonadas de dedicacion efectiva**, no registros horarios exactos. Se han calculado considerando:

- Complejidad funcional de cada issue.
- Numero de modulos afectados.
- Existencia de migraciones, funciones backend o cambios de arquitectura.
- Problemas encontrados durante la implantacion.
- Necesidad de validacion manual, pruebas, correcciones y documentacion.

La finalidad es que la memoria refleje no solo que se implemento, sino tambien el proceso tecnico seguido, los riesgos detectados, las decisiones tomadas y las soluciones aplicadas.

---

## 2. Resumen global del esfuerzo

| Bloque de trabajo | Tareas principales | Esfuerzo estimado |
|---|---|---:|
| Seguridad, autenticacion y RLS | Migracion a Supabase Auth, sesiones persistentes, provisionado seguro, cambio forzado de contrasena, RLS, limpieza de credenciales | 22 h |
| Vacaciones y consistencia transaccional | Correccion de fechas, aprobacion/cancelacion transaccional, edicion transaccional, saldo de dias, validaciones | 18 h |
| Fichajes y control horario | Monitor admin, geolocalizacion, anulacion auditada, fichaje manual, politicas por empleado | 24 h |
| Panel de administracion | Refactor estructural, carga modular, empleados, turnos, modales, rendimiento y estabilidad | 20 h |
| Reportes, PDF y UI | Exportacion mensual, restauracion UI premium, dashboard, navegacion, calendario y ajustes visuales | 16 h |
| Testing, auditoria y documentacion | Jest, mocks Supabase, cobertura de `vacationService` y `attendanceService`, auditorias tecnicas, backlog y documentacion | 16 h |
| Limpieza tecnica y dependencias | Eliminacion SQLite, hooks, `.gitignore`, dependencias, coverage, configuracion EAS | 8 h |
| **Total estimado** |  | **124 h** |

---

## 3. Cronologia resumida de ejecucion

| Fecha | Trabajo realizado | Evidencia |
|---|---|---|
| 14/04/2026 | Exportacion PDF, correcciones JSX, restauracion de layout y monitor premium de fichajes | Commits `feat(pdf)`, `fix(ui)`, `UI: finalizacion monitor` |
| 15/04/2026 | Limpieza SQLite, cierre monitor fichajes, auditoria inicial y backlog tecnico | Commits `#19`, `#23`, auditoria 15/04 en backlog |
| 16/04/2026 | Migracion de autenticacion a Supabase Auth, RLS y provisionado seguro | Migracion `20260416_enable_rls_transferlog.sql`, commits issue #28 |
| 17/04/2026 | Correccion de fechas en edicion admin de vacaciones | Commits `fix(vacaciones)` y backlog issue #31 |
| 18/04/2026 | Vacaciones transaccionales, avatar de perfil y geolocalizacion de fichaje | Migraciones issues #30, #33 y #34 |
| 19/04/2026 | Anulacion auditada, fichaje manual admin, edicion transaccional de vacaciones, auditoria profunda | Migraciones issues #35, #26, #37 y auditoria 19/04 |
| 20/04/2026 | Refactor de AdminScreen y correccion RLS en primer cambio de contrasena | Commits issues #40 y #44 |
| 21/04/2026 | Baja integral de empleados, carga modular admin y compatibilidad Edge Function | Commits issues #42 y #43 |
| 22/04/2026 | Testing Jest, cobertura de vacaciones, auditoria complementaria, correcciones A-07/A-08, dependencias y EAS | Commits de test, auditoria 22/04 y configuracion |
| 24/04/2026 | Documentacion final y generacion de mapa documental | Commit `Documentacion`, `docs/transferlog_markmap.*` |

---

## 4. Tareas efectivas realizadas

### 4.1 Seguridad y autenticacion

#### Issue #28 - Migracion a Supabase Auth

**Objetivo.** Sustituir el sistema de autenticacion propio basado en contrasenas almacenadas en la tabla `employees` por Supabase Auth, reduciendo el riesgo critico de exposicion de credenciales.

**Trabajo realizado.**

- Se elimino el flujo de login contra `employees.password`.
- Se enlazo cada empleado con `auth.users.id` mediante `employees.auth_user_id`.
- Se adapto `AuthContext` para trabajar con sesiones reales de Supabase.
- Se incorporo persistencia de sesion mediante `AsyncStorage`.
- Se actualizo la navegacion para hidratar correctamente la sesion y el perfil del empleado.
- Se elimino la dependencia funcional de contrasenas en texto plano.
- Se preparo el provisionado seguro de empleados a traves de una Edge Function.
- Se definieron politicas RLS para proteger tablas sensibles.

**Tiempo estimado.** 10 h.

**Problemas encontrados.**

- El sistema anterior mezclaba identidad, perfil y contrasena en una misma tabla.
- Las cuentas existentes necesitaban quedar asociadas a usuarios Auth.
- El cliente no debia poder crear usuarios Auth directamente con privilegios administrativos.

**Solucion aplicada.**

Se adopto Supabase Auth como fuente unica de autenticacion. La tabla `employees` quedo como perfil funcional de la aplicacion y no como almacen de credenciales. Para altas de empleados se uso una Edge Function de provisionado, evitando exponer operaciones privilegiadas en el cliente.

**Resultado.**

Login, logout, sesion persistente y asociacion usuario-perfil quedaron integrados. El riesgo de contrasenas en texto plano quedo eliminado.

---

#### Issue #44 - Bloqueo RLS en el primer cambio de contrasena

**Objetivo.** Permitir que un empleado nuevo complete el cambio obligatorio de contrasena sin quedar bloqueado por politicas RLS.

**Trabajo realizado.**

- Se creo la RPC `complete_own_password_change`.
- Se utilizo `security definer` para permitir una actualizacion controlada del propio flag.
- Se actualizo `employeeService.js` para invocar la RPC.
- Se reforzo `ForcePasswordChangeScreen.js` con verificacion posterior del perfil.

**Tiempo estimado.** 4 h.

**Problemas encontrados.**

- El usuario podia autenticarse, pero no limpiar su propio indicador de cambio obligatorio.
- RLS protegia correctamente la tabla, pero bloqueaba tambien una accion legitima del propio usuario.

**Solucion aplicada.**

Se traslado la operacion concreta a una RPC segura. La funcion valida implicitamente el usuario autenticado y actualiza solo el perfil correspondiente.

**Resultado.**

Los empleados nuevos pueden cambiar su contrasena inicial y acceder a la aplicacion sin intervencion manual del administrador.

---

#### Issue #39 - Seguridad y limpieza de entorno

**Objetivo.** Reducir el riesgo de filtracion accidental de credenciales y mejorar la higiene del repositorio.

**Trabajo realizado.**

- Se configuro Husky.
- Se anadio `lint-staged`.
- Se preparo un control preventivo para evitar commits de `.env`.
- Se reforzo `.gitignore`.
- Se documentaron medidas de seguridad relacionadas con credenciales.

**Tiempo estimado.** 3 h.

**Problemas encontrados.**

- Aunque `.env` no estaba trackeado, seguia existiendo el riesgo de anadirlo por error.
- La carpeta `coverage/` se genero durante pruebas y podia introducir ruido en control de versiones.

**Solucion aplicada.**

Se incorporaron hooks y reglas de ignore. La carpeta `coverage/` fue eliminada del seguimiento y anadida al `.gitignore`.

**Resultado.**

El repositorio quedo mas protegido frente a filtraciones accidentales y artefactos generados.

---

#### Ocultacion de credenciales demo en produccion

**Objetivo.** Evitar que la pantalla de login muestre cuentas de prueba o informacion sensible.

**Trabajo realizado.**

- Se elimino el bloque de credenciales demo visibles.
- Se sustituyo por un mensaje neutro sobre autenticacion segura.

**Tiempo estimado.** 1 h.

**Problema encontrado.**

Las credenciales demo podian facilitar accesos no deseados o transmitir una imagen poco profesional en una entrega final.

**Solucion aplicada.**

Se limpio la UI del login y se dejo orientada a uso real.

---

### 4.2 Vacaciones, fechas e integridad de datos

#### Issue #31 - Correccion de fechas en edicion admin de vacaciones

**Objetivo.** Evitar errores de parseo, calculos incorrectos y bloqueos al editar vacaciones desde administracion.

**Trabajo realizado.**

- Se normalizaron fechas de entrada.
- Se incorporo parseo seguro.
- Se validaron nulos y fechas invalidas.
- Se unificaron comparaciones de rango.
- Se adapto el calendario para editar solicitudes existentes.

**Tiempo estimado.** 4 h.

**Problemas encontrados.**

- Algunas fechas se comparaban como objetos o cadenas sin normalizacion consistente.
- La pantalla podia romperse con valores invalidos.
- La edicion de solicitudes existentes no siempre respetaba correctamente dias pasados o rangos ya almacenados.

**Solucion aplicada.**

Se centralizo el tratamiento de fechas en valores parseados y comparables, evitando operar directamente con entradas ambiguas.

**Resultado.**

La edicion admin de vacaciones quedo estable y con calculo correcto de dias solicitados.

---

#### Issue #30 - Aprobacion y cancelacion transaccional de vacaciones

**Objetivo.** Garantizar que la aprobacion o cancelacion de vacaciones actualice de forma atomica la solicitud y el saldo disponible del empleado.

**Trabajo realizado.**

- Se creo la migracion `20260418103200_issue_30_transactional_vacations.sql`.
- Se implementaron las RPCs `approve_vacation_transactional` y `cancel_vacation_transactional`.
- Se aplicaron bloqueos `FOR UPDATE`.
- Se movio la logica critica desde cliente a base de datos.
- Se adapto `vacationService.js` para usar las RPC.

**Tiempo estimado.** 6 h.

**Problemas encontrados.**

- La app realizaba dos escrituras separadas: una en `vacations` y otra en `employees.available_days`.
- Si una escritura fallaba, el saldo podia quedar inconsistente.
- Durante el despliegue en Supabase SQL Editor aparecieron errores como `42P01 relation "vacation_record" does not exist`.
- El uso de `%rowtype` genero problemas o falsos positivos en el editor.

**Solucion aplicada.**

Se implementaron funciones SQL transaccionales con bloqueo de filas y validacion de estado. La migracion se ajusto para usar el tipo compuesto `public.vacations` en lugar de `%rowtype`, evitando el problema del editor.

**Resultado.**

La aprobacion y cancelacion de vacaciones quedaron protegidas ante fallos parciales y condiciones de carrera.

---

#### Issue #37 - Edicion transaccional de vacaciones

**Objetivo.** Hacer atomica la modificacion de una solicitud de vacaciones ya existente.

**Trabajo realizado.**

- Se creo la RPC `edit_vacation_transactional`.
- Se bloqueo la fila de `vacations` y la fila de `employees`.
- Se calculo el diferencial de dias dentro de la transaccion.
- Se valido el saldo disponible en backend.
- Se simplifico el servicio cliente para delegar en la RPC.

**Tiempo estimado.** 5 h.

**Problemas encontrados.**

- `editRequestVacation` calculaba saldo en cliente.
- Existia riesgo de condicion de carrera.
- Si una de las escrituras fallaba, el saldo podia no coincidir con la solicitud.

**Solucion aplicada.**

Se centralizo la operacion en PostgreSQL mediante una RPC transaccional.

**Resultado.**

La edicion de vacaciones ya no depende de calculos sensibles en cliente y mantiene consistencia incluso ante errores.

---

#### Bugfix interno - Validacion y mensajes en `editRequestVacation`

**Objetivo.** Corregir inconsistencias internas del servicio de vacaciones.

**Trabajo realizado.**

- Se corrigio una variable `days` no definida en mensajes.
- Se ajusto el retorno de `editRequestVacation`.
- Se reviso la coherencia de los mensajes de error.

**Tiempo estimado.** 2 h.

**Problema encontrado.**

El servicio podia devolver mensajes incoherentes o fallar por referencias a variables inexistentes.

**Solucion aplicada.**

Se normalizaron variables, retorno y mensajes.

---

#### Issue #14 - Cancelacion de vacaciones aprobadas desde administracion

**Objetivo.** Permitir al administrador cancelar vacaciones ya aprobadas y devolver dias disponibles.

**Trabajo realizado.**

- Se anadio accion de cancelacion en administracion.
- Se recalculo el saldo del empleado.
- Se integro el cambio con el flujo de vacaciones existente.

**Tiempo estimado.** 3 h.

**Problema encontrado.**

Cancelar una vacacion aprobada podia requerir intervencion manual en los dias disponibles.

**Solucion aplicada.**

La accion administrativa actualiza el estado y restaura el saldo automaticamente.

---

#### Issue #13 - Selector tactil de vacaciones

**Objetivo.** Facilitar al empleado la solicitud de vacaciones mediante seleccion visual en calendario.

**Trabajo realizado.**

- Se implemento seleccion de rango.
- Se incorporaron calculos de dias.
- Se adapto la UI para solicitud desde movil.

**Tiempo estimado.** 4 h.

**Resultado.**

El empleado puede solicitar vacaciones de forma guiada y mas intuitiva.

---

### 4.3 Fichajes y control horario

#### Registro de jornada

**Objetivo.** Permitir registrar entradas y salidas vinculadas a Supabase.

**Trabajo realizado.**

- Se implemento boton de entrada/salida.
- Se guardaron registros en `attendances`.
- Se diferencio tipo de movimiento.
- Se integro con el usuario autenticado.

**Tiempo estimado.** 4 h.

**Resultado.**

La aplicacion permite registrar la jornada laboral desde la pantalla principal.

---

#### Issue #19 - Monitor de fichajes en panel admin

**Objetivo.** Crear una vista administrativa para auditar los fichajes diarios de empleados.

**Trabajo realizado.**

- Se anadio una pestana de fichajes en el panel admin.
- Se mostro el historico diario de entradas y salidas.
- Se ordenaron registros cronologicamente.
- Se incorporo refresco manual y automatico cada 30 segundos.
- Se anadieron estados de carga y error.

**Tiempo estimado.** 5 h.

**Problemas encontrados.**

- El orden de registros no siempre era consistente.
- La pantalla necesitaba actualizarse sin obligar a salir y volver a entrar.
- La lectura de datos debia ser clara para auditoria diaria.

**Solucion aplicada.**

Se reforzo la consulta y presentacion del monitor, incorporando orden cronologico y refresco recurrente.

**Resultado.**

El administrador puede consultar el estado diario de fichajes con mayor fiabilidad.

---

#### Issue #20 - Rediseño premium del monitor de fichajes

**Objetivo.** Mejorar la legibilidad y calidad visual del monitor.

**Trabajo realizado.**

- Se redisenaron las tarjetas del timeline.
- Se incorporaron avatares e indicadores visuales.
- Se diferencio visualmente la entrada y salida.
- Se mejoro la jerarquia de informacion.

**Tiempo estimado.** 4 h.

**Problema encontrado.**

La visualizacion anterior era funcional, pero poco clara para auditar rapidamente multiples empleados.

**Solucion aplicada.**

Se implemento una UI tipo timeline con estados visuales y lectura rapida.

---

#### Issue #34 - Fichaje por geolocalizacion flexible por empleado

**Objetivo.** Permitir que cada empleado tenga una politica de fichaje diferente:

- `anywhere`: puede fichar desde cualquier ubicacion.
- `assigned_center`: debe fichar dentro del radio de su centro asignado.
- `manual_only`: solo puede ser fichado por administracion.

**Trabajo realizado.**

- Se creo soporte para centros de trabajo.
- Se anadieron campos de politica de fichaje al empleado.
- Se incorporaron columnas de evidencia de ubicacion en `attendances`.
- Se integro `expo-location`.
- Se solicito permiso de ubicacion al usuario.
- Se calculo distancia respecto al centro asignado.
- Se bloqueo el fichaje si no cumplia la politica.
- Se guardaron latitud, longitud, precision y motivo de exencion.
- Se anadio boton para mostrar ubicacion en el monitor admin.
- Se adapto el modal de empleado para poder configurar politica y centro en pantallas pequenas.

**Tiempo estimado.** 9 h.

**Problemas encontrados.**

- La RPC prevista `register_attendance_with_location` genero errores inconsistentes en Supabase SQL Editor.
- Aparecieron errores de parseo o compilacion como `42P01`.
- El editor mostro advertencias falsas de RLS sobre identificadores locales.
- Al pasar temporalmente a insercion directa desde cliente aparecio un error RLS `42501 new row violates row-level security policy for table "attendances"`.
- En movil, el modal de edicion de empleado no permitia desplazarse hasta los botones al configurar politicas.

**Solucion aplicada.**

Se mantuvo en base de datos la estructura estable: centros, politicas, columnas de evidencia, RLS y funcion de distancia. La validacion operativa se implemento temporalmente en cliente, con bloqueo previo al fichaje. Tambien se corrigio la politica `attendances_insert_own_or_admin` para permitir inserciones del propio empleado autenticado. El modal admin se envolvio en `ScrollView` con altura maxima.

**Resultado.**

La funcionalidad quedo cerrada desde el punto de vista operativo. Como mejora futura se mantiene la recomendacion de mover la validacion sensible de fichajes a RPC o trigger backend.

---

#### Issue #35 - Anulacion auditada de fichajes desde administracion

**Objetivo.** Permitir corregir fichajes erroneos sin borrar registros fisicamente.

**Trabajo realizado.**

- Se creo la migracion `20260419113000_issue_35_admin_attendance_controls.sql`.
- Se anadieron campos de auditoria: estado, motivo, fecha de anulacion y admin responsable.
- Se creo el servicio `invalidateAttendanceByAdmin`.
- Se exigio motivo obligatorio.
- Se restringio la anulacion al ultimo fichaje activo del empleado en ese dia.
- Se mantuvieron registros anulados visibles para trazabilidad.

**Tiempo estimado.** 5 h.

**Problemas encontrados.**

- Tras el primer cambio, el monitor admin dejo de mostrar registros.
- Aparecio el error `42703 column attendances.record_status does not exist` cuando la migracion no estaba aplicada.
- Incluso con migracion, la vista podia quedar vacia por dependencia fragil del filtro diario y del join embebido con `employees`.

**Solucion aplicada.**

Se anadio compatibilidad hacia atras si `record_status` no existe. El monitor dejo de depender del join embebido y resolvio nombres desde el estado de empleados ya cargado. El filtro de fecha se estabilizo.

**Resultado.**

El administrador puede anular fichajes manteniendo trazabilidad y sin destruir datos.

---

#### Issue #26 - Registro manual de fichajes por administracion

**Objetivo.** Completar el flujo `manual_only` permitiendo que el administrador registre entradas o salidas.

**Trabajo realizado.**

- Se creo `ManualAttendanceModal.js`.
- Se anadio selector de empleado.
- Se permitio elegir entrada o salida.
- Se incorporo input de hora con validacion.
- Se anadieron horas frecuentes.
- Se incluyo nota administrativa con contador.
- Se bloqueo el guardado hasta tener datos validos.
- Se implemento `createManualAttendanceByAdmin`.
- Se marco el fichaje como `entry_mode: 'admin_manual'`.
- Se mostro badge "Creado por administracion" en el monitor.
- Se optimizo el monitor para usar `getAllAttendancesByDate`.

**Tiempo estimado.** 5 h.

**Problemas encontrados.**

- El modo `manual_only` necesitaba una via real de registro.
- Habia que evitar secuencias invalidas: salida sin entrada previa, duplicados o entradas consecutivas erroneas.
- El monitor cargaba demasiados registros recientes para filtrar luego en cliente.

**Solucion aplicada.**

Se anadio un flujo administrativo completo con validaciones de secuencia en servicio y carga directa por fecha.

**Resultado.**

El administrador puede registrar fichajes manuales validos y quedan diferenciados en auditoria.

---

### 4.4 Empleados, perfil y administracion

#### Issue #1 - Gestion de empleados

**Objetivo.** Permitir altas, edicion y bajas de empleados desde administracion.

**Trabajo realizado.**

- Se implementaron formularios de alta y edicion.
- Se integraron roles y datos de empleado.
- Se conecto el panel con Supabase.
- Se vinculo posteriormente con Supabase Auth y Edge Functions.

**Tiempo estimado.** 6 h.

**Resultado.**

El panel admin permite gestionar el personal operativo de la aplicacion.

---

#### Issue #33 - Foto de perfil por usuario

**Objetivo.** Permitir que cada usuario suba, cambie y visualice su avatar.

**Trabajo realizado.**

- Se anadio `avatar_url` a `employees`.
- Se configuro un bucket privado `avatars`.
- Se crearon politicas de acceso en Supabase Storage.
- Se integro `expo-image-picker`.
- Se permitio seleccionar y subir imagen desde `SettingsScreen`.
- Se refresco el perfil autenticado tras el cambio.
- Se reutilizo el avatar en ajustes y administracion.
- Se mantuvo fallback por iniciales.

**Tiempo estimado.** 5 h.

**Problemas encontrados.**

- Habia que evitar que un usuario modificase imagenes de otros.
- La URL firmada de Storage debia integrarse con la sesion y la UI.
- Era necesario mantener una alternativa visual si no habia imagen.

**Solucion aplicada.**

Se combinaron politicas de Storage, actualizacion segura del perfil y componente de avatar reutilizable.

**Resultado.**

Cada usuario puede gestionar su foto y verla persistente en las pantallas principales.

---

#### Issue #42 - Integridad en borrado de empleados

**Objetivo.** Evitar que al borrar un empleado quedasen usuarios huerfanos en Supabase Auth.

**Trabajo realizado.**

- Se creo la Edge Function `delete-employee`.
- Se elimino coordinadamente el perfil en `employees`.
- Se elimino el usuario de `auth.users`.
- Se elimino el avatar del bucket.
- Se actualizo `deleteEmployee` para llamar a la funcion.
- Se protegio contra autoeliminacion del administrador.

**Tiempo estimado.** 5 h.

**Problemas encontrados.**

- El borrado anterior solo eliminaba el perfil funcional.
- El usuario Auth asociado seguia existiendo.
- El email quedaba ocupado y no podia reutilizarse.
- En auditoria posterior se detecto que `authHeader` podia usarse sin declararse.

**Solucion aplicada.**

Se centralizo el borrado en una Edge Function con privilegios controlados. Posteriormente se corrigio la cabecera de autorizacion y se valido la sesion dentro de la funcion.

**Resultado.**

La baja de empleados es integral y no deja cuentas huerfanas.

---

#### Issue #40 - Refactor estructural de `AdminScreen.js`

**Objetivo.** Reducir el monolito de administracion y hacerlo mantenible.

**Trabajo realizado.**

- Se dividio `AdminScreen.js` en modulos.
- Se crearon 5 tabs:
  - `RequestsTab`
  - `ShiftsTab`
  - `AttendancesTab`
  - `EmployeesTab`
  - `ReportsTab`
- Se extrajeron 9 modales:
  - `AddEmployeeModal`
  - `EditEmployeeModal`
  - `ShiftAssignmentModal`
  - `EditShiftTimeModal`
  - `CopyWeekModal`
  - `ManualAttendanceModal`
  - `AttendanceActionModal`
  - `LocationInfoModal`
  - `WorkCenterModal`
- Se separaron estilos en `AdminScreen.styles.js`.
- Se separaron constantes en `constants.js`.
- `AdminScreen.js` quedo como contenedor de estado y coordinacion.

**Tiempo estimado.** 8 h.

**Problemas encontrados.**

- El fichero original rondaba las 3000 lineas.
- Mezclaba tabs, modales, estilos, estados y logica de negocio.
- Cualquier cambio tenia alto riesgo de regresion.
- El rendimiento de desarrollo y lectura era bajo.

**Solucion aplicada.**

Se realizo una extraccion modular manteniendo la funcionalidad original, pero con responsabilidades separadas.

**Resultado.**

El panel admin quedo mucho mas mantenible y preparado para ampliaciones.

---

#### Issue #43 - Carga modular de datos en panel admin

**Objetivo.** Mejorar el rendimiento del panel cargando solo los datos necesarios por pestana.

**Trabajo realizado.**

- Se elimino la dependencia de una carga monolitica global.
- Se implemento carga perezosa por tabs.
- Se mantuvo un wrapper `loadAll` para compatibilidad con handlers existentes.
- Se corrigieron problemas de compatibilidad con Edge Function y JWT ES256.

**Tiempo estimado.** 5 h.

**Problemas encontrados.**

- Cargar todo el panel de una vez era lento y acoplado.
- Algunos handlers esperaban que siguiera existiendo `loadAll`.
- El Gateway de Supabase no soportaba correctamente tokens ES256 de React Native en la funcion.

**Solucion aplicada.**

Se cargaron datos bajo demanda y se desplego la Edge Function con `--no-verify-jwt`, validando manualmente la autorizacion dentro de la funcion.

**Resultado.**

El panel admin es mas rapido y conserva compatibilidad con flujos ya implementados.

---

#### Correcciones A-07/A-08 de auditoria complementaria

**Objetivo.** Resolver errores reales detectados el 22/04/2026.

**Trabajo realizado.**

- Se corrigio el uso de `authHeader` en la Edge Function `delete-employee`.
- Se corrigieron referencias a `setLoading` inexistente en `AdminScreen`.
- Se configuro EAS para despliegue/build.

**Tiempo estimado.** 3 h.

**Problemas encontrados.**

- La funcion de borrado podia fallar en runtime por una variable no declarada.
- Algunas operaciones admin llamaban a un setter de estado que ya no existia tras el refactor.

**Solucion aplicada.**

Se ajusto la funcion backend y se alinearon estados de carga con la estructura modular del panel.

---

### 4.5 Turnos, calendario y reportes

#### Issue #8 - Asignacion masiva de turnos mediante calendario interactivo

**Objetivo.** Permitir asignar turnos de forma visual y eficiente.

**Trabajo realizado.**

- Se creo un calendario interactivo de asignacion.
- Se permitio pintar multiples dias.
- Se guardaron cambios localizados.
- Se precargo historial de turnos del trabajador.

**Tiempo estimado.** 6 h.

**Problemas encontrados.**

- El modal guardaba solo el dia seleccionado, no todas las fechas pintadas.
- No se mostraban visualmente los turnos ya asignados.

**Solucion aplicada.**

Se integro `getShiftsByEmployee` para precargar asignaciones y se guardaron todas las fechas modificadas mediante el conjunto de cambios.

**Resultado.**

La planificacion de turnos funciona de forma masiva y visual.

---

#### Issue #12 - Plantillas horarias y gestion de horas

**Objetivo.** Asociar horas de entrada y salida a los turnos.

**Trabajo realizado.**

- Se anadieron campos `start_time` y `end_time`.
- Se permitio editar horarios.
- Se integro la informacion horaria con planificacion.

**Tiempo estimado.** 4 h.

**Resultado.**

Los turnos dejaron de ser solo etiquetas y pasaron a representar franjas horarias.

---

#### Issue #2 - Validar conflictos entre turnos y vacaciones aprobadas

**Objetivo.** Evitar asignar turnos en dias en los que el empleado tiene vacaciones aprobadas.

**Trabajo realizado.**

- Se incorporaron comprobaciones de solapamiento.
- Se reforzo la planificacion para evitar inconsistencias.

**Tiempo estimado.** 3 h.

**Resultado.**

La asignacion de turnos respeta ausencias aprobadas.

---

#### Issue #3 - Copia semanal y patrones de turnos

**Objetivo.** Agilizar la planificacion repetitiva.

**Trabajo realizado.**

- Se implemento copia semanal.
- Se incorporaron modales y acciones para replicar patrones.

**Tiempo estimado.** 4 h.

**Resultado.**

El administrador puede planificar semanas completas con menor trabajo manual.

---

#### Issue #5 - Reportes mensuales por empleado

**Objetivo.** Generar resumen mensual de turnos y vacaciones por trabajador.

**Trabajo realizado.**

- Se calculo el resumen mensual.
- Se incorporo la pestaña de reportes.
- Se agregaron conteos por tipo de turno y vacaciones.

**Tiempo estimado.** 5 h.

**Resultado.**

El administrador dispone de una vista mensual consolidada.

---

#### Issue #21 - Exportacion PDF y restauracion UI premium

**Objetivo.** Generar reportes mensuales exportables en PDF y recuperar la estabilidad visual del panel.

**Trabajo realizado.**

- Se creo `src/lib/pdfService.js`.
- Se genero una plantilla HTML/CSS para el PDF.
- Se construyo una cuadricula mensual dinamica.
- Se incluyo resumen por empleado.
- Se anadio boton de exportacion.
- Se integro `expo-print` y `expo-sharing`.
- Se corrigieron errores criticos de JSX en `AdminScreen.js`.
- Se restauraron contenedores y layout tras limpiezas previas.

**Tiempo estimado.** 8 h.

**Problemas encontrados.**

- Durante la integracion aparecieron cierres JSX incorrectos.
- Habia bloques duplicados o sobrantes tras cambios de reportes.
- El panel admin llego a perder visibilidad o compilar con errores.

**Solucion aplicada.**

Se corrigio progresivamente la estructura JSX, se aislo la generacion PDF en servicio propio y se restauro la composicion visual del panel.

**Resultado.**

La app puede exportar reportes mensuales detallados y el panel admin recupero estabilidad.

---

### 4.6 Navegacion, dashboard y ajustes de usuario

#### Issue #9 - Redisenio del dashboard

**Objetivo.** Mejorar la pantalla principal del empleado.

**Trabajo realizado.**

- Se creo un dashboard mas limpio.
- Se incorporaron botones con degradados.
- Se organizaron acciones principales.

**Tiempo estimado.** 3 h.

**Resultado.**

La pantalla principal quedo mas clara y moderna.

---

#### Issue #10 - Navegacion premium

**Objetivo.** Mejorar la experiencia de navegacion inferior.

**Trabajo realizado.**

- Se anadieron iconos con estados personalizados.
- Se destaco la pestana de vacaciones.
- Se ajustaron indicadores de pestana activa.

**Tiempo estimado.** 3 h.

**Problema encontrado.**

Una pestana admin oculta seguia consumiendo espacio y descentraba los iconos.

**Solucion aplicada.**

Se probo mover Admin al Stack principal, pero despues se reintegro al Tab Navigator con boton oculto para preservar el flujo y resolver la navegacion.

---

#### Issue #17 - Pantalla de ajustes de usuario

**Objetivo.** Separar la gestion de perfil, contrasena y cierre de sesion de la pantalla principal.

**Trabajo realizado.**

- Se creo `SettingsScreen`.
- Se incorporo cambio de contrasena.
- Se anadio cierre de sesion.
- Se integro posteriormente gestion de avatar.

**Tiempo estimado.** 4 h.

**Resultado.**

La app gano una zona de autogestion mas clara para el usuario.

---

#### Issue #15 - Reseteo de contrasenas desde administracion

**Objetivo.** Permitir al administrador forzar una contrasena temporal y obligar al usuario a cambiarla.

**Trabajo realizado.**

- Se implemento flujo de reseteo.
- Se creo pantalla cautiva de cambio obligatorio.
- Se enlazo con la logica de autenticacion.

**Tiempo estimado.** 4 h.

**Resultado.**

El administrador puede recuperar el acceso de empleados sin manipular credenciales manualmente.

---

### 4.7 Migracion de infraestructura y limpieza tecnica

#### Issue #6 - Migracion de SQLite a Supabase Cloud

**Objetivo.** Pasar de persistencia local a backend centralizado.

**Trabajo realizado.**

- Se sustituyo la persistencia local por Supabase.
- Se crearon servicios `database/` para acceder a datos remotos.
- Se sincronizaron empleados, turnos, vacaciones y fichajes.

**Tiempo estimado.** 8 h.

**Problemas encontrados.**

- El modelo local no tenia las mismas necesidades de seguridad que un backend compartido.
- La migracion obligo a revisar roles, politicas y acceso desde cliente.

**Solucion aplicada.**

Se centralizo el almacenamiento en Supabase y posteriormente se reforzo con Auth, RLS, RPCs y Edge Functions.

---

#### Issue #23 - Limpieza de SQLite y consolidacion

**Objetivo.** Eliminar codigo legado tras completar la migracion a Supabase.

**Trabajo realizado.**

- Se elimino `database.js`.
- Se limpio `App.js`.
- Se desinstalo `expo-sqlite`.
- Se actualizo el backlog.

**Tiempo estimado.** 3 h.

**Resultado.**

El proyecto quedo mas ligero y sin doble sistema de persistencia.

---

#### Actualizacion de dependencias compatibles con Expo SDK

**Objetivo.** Mantener dependencias alineadas con el SDK actual.

**Trabajo realizado.**

- Se actualizaron paquetes compatibles.
- Se ajusto `package-lock.json`.
- Se mantuvo Jest compatible con Expo SDK 54.

**Tiempo estimado.** 2 h.

**Problema encontrado.**

Versiones demasiado modernas de Jest y `jest-expo` rompian la compatibilidad con Expo.

**Solucion aplicada.**

Se uso `npx expo install jest-expo jest` para alinear versiones con el SDK.

---

### 4.8 Estabilidad, errores y limpieza de codigo

#### Issue #38 - Robustez y manejo de errores

**Objetivo.** Evitar bloqueos de pantalla y errores silenciosos.

**Trabajo realizado.**

- Se elimino un `useFocusEffect` duplicado en `AdminScreen`.
- Se anadio `try/catch/finally` en cargas criticas.
- Se capturaron errores de red en `CalendarScreen`.
- Se corrigio comparacion de fechas por referencia en `RequestVacationScreen`.

**Tiempo estimado.** 4 h.

**Problemas encontrados.**

- Algunas pantallas podian quedar en carga infinita.
- La comparacion `startDate !== endDate` comparaba referencias de objetos `Date`, no valores.
- Admin podia duplicar cargas innecesariamente.

**Solucion aplicada.**

Se aplicaron patrones de control de error y comparaciones por `getTime()`.

---

#### Issue #41 - Consistencia visual y limpieza

**Objetivo.** Reducir codigo muerto y centralizar configuracion repetida.

**Trabajo realizado.**

- Se corrigieron iconos de turnos.
- Se centralizo `LocaleConfig` en `src/config/calendarLocale.js`.
- Se eliminaron funciones muertas.
- Se sustituyo un import dinamico innecesario por uso estatico.
- Se elimino codigo duplicado de PDF.

**Tiempo estimado.** 4 h.

**Problemas encontrados.**

- Configuracion de calendario repetida en varios ficheros.
- Iconos de tarde/noche semanticamente incorrectos.
- Funciones obsoletas seguian en el codigo.

**Solucion aplicada.**

Se centralizo configuracion comun y se retiro codigo no usado.

---

#### Tarea tecnica - Estandarizar manejo de errores y reintentos

**Objetivo.** Mejorar la recuperacion ante fallos de red.

**Trabajo realizado.**

- Se anadieron `try/catch` y `Alert` en flujos criticos.
- Se cubrieron carga inicial de calendario y anulacion de vacaciones.

**Tiempo estimado.** 2 h.

**Estado.**

Cumplido parcialmente. Queda como mejora futura crear componentes reutilizables de error y reintento.

---

### 4.9 Testing y calidad

#### Issue #11 - Suite de pruebas con Jest

**Objetivo.** Incorporar pruebas automatizadas sobre logica de negocio.

**Trabajo realizado.**

- Se instalo y configuro Jest.
- Se configuro `jest-expo`.
- Se creo `babel.config.js` y `jest.config.js`.
- Se implemento mock global de Supabase.
- Se escribieron tests para `vacationService` y `attendanceService`.
- Se cubrieron calculos de dias, saldo, RPCs, transiciones de estado y consultas.
- Se anadio script de coverage.

**Tiempo estimado.** 8 h.

**Problemas encontrados.**

- `jest@30` y `jest-expo@55` no eran compatibles con Expo SDK 54.
- Aparecio `ReferenceError` al intentar importar ficheros internos de Expo.
- Los mocks de Supabase fallaban por hoisting de Jest.
- La carpeta `coverage/` fue trackeada accidentalmente.

**Solucion aplicada.**

Se alinearon versiones con `npx expo install`, se instanciaron mocks dentro del factory de `jest.mock` y se limpio `coverage/` del repositorio.

**Resultado.**

La suite local se ejecuta correctamente. La cobertura automatizada incluye `vacationService` y `attendanceService`, con validaciones sobre vacaciones, RPCs, politicas de fichaje, geolocalizacion, registros manuales y anulacion auditada.

---

#### Auditoria tecnica profunda del 19/04/2026

**Objetivo.** Revisar la arquitectura, detectar riesgos y priorizar correcciones.

**Trabajo realizado.**

- Se analizaron servicios, pantallas, componentes, navegacion, configuracion y dependencias.
- Se clasificaron hallazgos por severidad.
- Se identificaron riesgos criticos en vacaciones, seguridad, AdminScreen, errores de carga y limpieza.
- Se genero una priorizacion tecnica.

**Tiempo estimado.** 4 h.

**Resultado.**

La auditoria sirvio como base para issues #37, #38, #40, #41, #42 y #43.

---

#### Auditoria complementaria del 22/04/2026

**Objetivo.** Revisar el estado real del repositorio tras aplicar correcciones.

**Trabajo realizado.**

- Se contrasto la auditoria anterior con el codigo actualizado.
- Se ejecuto `npm test -- --runInBand`.
- Se detectaron nuevos problemas en fichajes, Edge Function y estados de carga.
- Se documentaron riesgos pendientes.

**Tiempo estimado.** 4 h.

**Problemas encontrados.**

- La logica critica de fichaje seguia dependiendo del cliente.
- La Edge Function `delete-employee` tenia un problema con `authHeader`.
- `AdminScreen` podia llamar a `setLoading` inexistente.
- Persistian riesgos por fechas UTC y cobertura limitada.

**Solucion aplicada.**

Se resolvieron los problemas A-07/A-08 y se documentaron los riesgos restantes como mejora futura.

---

## 5. Problemas principales encontrados y soluciones aplicadas

### 5.1 Credenciales y autenticacion insegura

**Problema.** El sistema inicial dependia de contrasenas en texto plano o gestionadas desde cliente.

**Riesgo.** Exposicion de credenciales y compromiso de cuentas.

**Solucion.** Migracion a Supabase Auth, eliminacion de contrasenas de `employees`, sesiones persistentes, RLS y Edge Function de provisionado.

---

### 5.2 Operaciones no transaccionales en vacaciones

**Problema.** Aprobaciones, cancelaciones y ediciones podian modificar saldo y solicitud en escrituras separadas.

**Riesgo.** Datos inconsistentes ante fallos parciales.

**Solucion.** RPCs transaccionales con `FOR UPDATE`, validacion de estado y recalculo de saldo en backend.

---

### 5.3 Errores de Supabase SQL Editor

**Problema.** Algunas migraciones generaban errores o falsos positivos al usar bloques PL/pgSQL complejos.

**Riesgo.** Dificultad para desplegar logica backend de forma fiable.

**Solucion.** Ajuste de migraciones, sustitucion de `%rowtype` por tipos compuestos y despliegue por bloques completos revisados.

---

### 5.4 RLS bloqueando operaciones legitimas

**Problema.** Las politicas de seguridad impedian operaciones necesarias como primer cambio de contrasena o insercion de fichajes propios.

**Riesgo.** Usuarios bloqueados o funcionalidades inoperativas.

**Solucion.** RPCs seguras para operaciones concretas y ajuste de politicas RLS vinculando `employee_id` con `auth.uid()`.

---

### 5.5 AdminScreen monolitico

**Problema.** Un unico fichero concentraba casi toda la administracion.

**Riesgo.** Baja mantenibilidad, regresiones frecuentes y dificultad de evolucion.

**Solucion.** Refactor en tabs, modales, estilos y constantes.

---

### 5.6 Fragilidad en fichajes con geolocalizacion

**Problema.** La validacion ideal en backend no pudo cerrarse por errores de despliegue SQL.

**Riesgo.** Un cliente manipulado podria intentar saltarse reglas si la base de datos no las impone.

**Solucion aplicada en esta iteracion.** Validacion funcional en cliente, almacenamiento de evidencia y RLS minima correcta.

**Mejora futura recomendada.** Migrar la validacion completa de fichaje a RPC o trigger transaccional.

---

### 5.7 Errores de UI y layout

**Problema.** Cambios grandes en AdminScreen provocaron errores JSX, problemas de scroll y pestanas invisibles o descentradas.

**Riesgo.** Pantallas bloqueadas o mala experiencia en movil.

**Solucion.** Correcciones de estructura JSX, `ScrollView` en modales largos, ajustes de navegacion y refactor modular.

---

### 5.8 Testing con Expo

**Problema.** Versiones incompatibles de Jest rompian la ejecucion de pruebas.

**Riesgo.** Imposibilidad de validar automaticamente logica critica.

**Solucion.** Alinear versiones con Expo SDK y crear mocks controlados de Supabase.

---

## 6. Riesgos y mejoras futuras identificadas

Aunque el backlog principal queda ampliamente resuelto, las auditorias dejan algunas mejoras razonables para una evolucion posterior:

1. **Mover validacion de fichajes a backend.** La politica `manual_only`, la validacion por centro y la secuencia entrada/salida deberian quedar protegidas por RPC o triggers.
2. **Ampliar tests.** Actualmente la cobertura automatizada incluye `vacationService` y `attendanceService`; seria recomendable cubrir `AuthContext`, Edge Functions y flujos admin.
3. **Normalizar fechas locales.** Evitar patrones basados en `toISOString().split('T')[0]` para calcular "hoy", ya que usan UTC.
4. **Mejorar UX offline.** Anadir aviso de conexion y reintentos reutilizables.
5. **Accesibilidad.** Incorporar `accessibilityLabel`, `accessibilityRole` y `accessibilityHint` en controles principales.
6. **Control de logs.** Retirar o encapsular `console.log` en produccion.
7. **Refrescar URLs firmadas de avatar.** Evitar expiraciones largas sin renovacion automatica.

---

## 7. Conclusiones para la memoria

Durante esta fase se paso de una aplicacion funcional a una version mucho mas solida en seguridad, consistencia y mantenibilidad. Las tareas mas relevantes no fueron solo visuales o de CRUD, sino de arquitectura: autenticacion real con Supabase Auth, politicas RLS, Edge Functions, RPCs transaccionales, migracion completa desde SQLite, control horario con geolocalizacion y refactor del panel administrativo.

El mayor aprendizaje tecnico fue que las reglas criticas de negocio no deben depender exclusivamente del cliente. Por eso se movieron a backend las operaciones sensibles de vacaciones y se dejo documentada como mejora futura la consolidacion backend del fichaje geolocalizado. Tambien fue importante introducir pruebas automatizadas, ya que permitieron validar la logica de vacaciones y fichajes, dejando preparada una base para extender la cobertura.

El esfuerzo total estimado para las tareas documentadas es de **124 horas efectivas**, repartidas entre desarrollo funcional, correccion de errores, integracion con Supabase, pruebas, auditorias y documentacion final.
