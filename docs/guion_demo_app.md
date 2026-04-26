# Guion para demo de TransferLog

Proyecto: **TransferLog**  
Duracion recomendada: **10-15 minutos**  
Objetivo de la demo: mostrar el flujo completo de la aplicacion desde dos puntos de vista: empleado y administrador.

---

## 1. Preparacion antes de empezar

Antes de iniciar la demo conviene tener preparado:

- La app abierta en Expo Go o emulador.
- Un usuario administrador disponible.
- Al menos un empleado de prueba disponible.
- Datos de ejemplo cargados:
  - empleados,
  - turnos,
  - vacaciones,
  - fichajes,
  - centro de trabajo si se va a mostrar geolocalizacion.
- Supabase con las migraciones aplicadas.
- Permisos de ubicacion concedidos en el dispositivo si se va a probar fichaje geolocalizado.

Texto sugerido:

> Voy a enseñar TransferLog, una aplicacion movil desarrollada con React Native, Expo y Supabase para gestionar turnos, vacaciones, fichajes y reportes en una empresa de transporte. La demo esta dividida en dos partes: primero veremos la experiencia del empleado y despues el panel de administracion.

---

## 2. Inicio de sesion

### Pasos

1. Abrir la app.
2. Mostrar la pantalla de login.
3. Introducir las credenciales de un usuario empleado.
4. Iniciar sesion.

### Texto sugerido

> La aplicacion utiliza Supabase Auth para la autenticacion. Cada usuario inicia sesion con email y contrasena, y la sesion queda persistida, por lo que no es necesario autenticarse de nuevo cada vez que se abre la app.

> El perfil funcional del empleado esta separado de la cuenta de autenticacion. Esto permite gestionar roles, datos laborales y configuracion interna sin almacenar contrasenas en nuestra propia tabla de empleados.

---

## 3. Pantalla principal del empleado

### Pasos

1. Mostrar el dashboard principal.
2. Explicar las acciones principales disponibles.
3. Senalar el acceso a fichaje, calendario, vacaciones y ajustes.

### Texto sugerido

> Esta es la pantalla principal del empleado. Desde aqui puede consultar su informacion diaria y acceder rapidamente a las funciones principales: registrar entrada o salida, revisar su calendario, solicitar vacaciones y gestionar sus ajustes.

> El diseno esta pensado para movil, con acciones grandes y claras, porque el uso principal seria durante la jornada laboral.

---

## 4. Registro de jornada del empleado

### Pasos

1. Pulsar el boton de entrada o salida.
2. Si la app solicita ubicacion, aceptar o explicar el permiso.
3. Mostrar el resultado del fichaje.
4. Si procede, comentar la politica de fichaje del usuario.

### Texto sugerido

> El empleado puede registrar su entrada o salida desde la app. El sistema guarda el movimiento en Supabase asociado al usuario autenticado.

> TransferLog permite configurar distintas politicas de fichaje por empleado. Un trabajador puede fichar desde cualquier ubicacion, puede estar obligado a fichar dentro del radio de un centro de trabajo o puede estar marcado como manual only, en cuyo caso solo administracion puede registrar sus fichajes.

> Cuando se usa geolocalizacion, la app guarda evidencia minima del fichaje, como coordenadas, precision y centro validado. Esto permite trazabilidad posterior desde el panel de administracion.

Nota si no se puede probar la ubicacion en directo:

> En esta demo no voy a forzar una ubicacion real distinta, pero el flujo contempla permisos, calculo de distancia y bloqueo si el empleado esta fuera del radio permitido.

---

## 5. Calendario del empleado

### Pasos

1. Ir a la pestana de calendario.
2. Mostrar dias con turnos asignados.
3. Explicar colores o etiquetas de turnos.
4. Si hay vacaciones aprobadas, mostrarlas en calendario.

### Texto sugerido

> En el calendario el empleado puede consultar su planificacion mensual. Los turnos aparecen marcados por dia y permiten ver rapidamente si trabaja en turno de manana, tarde, noche u otro tipo configurado.

> Tambien se reflejan ausencias o vacaciones aprobadas, de manera que el usuario tiene una vision clara de su mes laboral.

---

## 6. Solicitud de vacaciones

### Pasos

1. Entrar en la pestana de vacaciones.
2. Mostrar historial de solicitudes.
3. Pulsar para crear una nueva solicitud.
4. Seleccionar un rango de fechas.
5. Mostrar calculo de dias.
6. Enviar o cancelar la solicitud segun convenga.

### Texto sugerido

> Desde esta seccion el empleado puede consultar sus solicitudes de vacaciones y crear una nueva. El selector permite marcar un rango de fechas de forma tactil y la aplicacion calcula los dias solicitados.

> Antes de registrar la solicitud se valida el saldo disponible. Las operaciones criticas de aprobacion, cancelacion y edicion se han reforzado en backend mediante funciones transaccionales para evitar inconsistencias en los dias disponibles.

> Una solicitud queda pendiente hasta que administracion la aprueba o rechaza.

---

## 7. Ajustes de usuario y foto de perfil

### Pasos

1. Entrar en ajustes.
2. Mostrar datos de perfil.
3. Mostrar opcion de cambio de contrasena.
4. Mostrar avatar o cambio de foto si procede.
5. No cerrar sesion todavia si se va a cambiar de usuario manualmente despues.

### Texto sugerido

> En ajustes el usuario puede consultar su perfil, cambiar su contrasena y gestionar su foto de perfil. La imagen se almacena en Supabase Storage y se muestra despues en otras partes de la aplicacion, como el panel de administracion.

> Si el administrador fuerza un cambio de contrasena, el usuario pasa por una pantalla cautiva antes de acceder a la app. Este flujo esta protegido con una RPC para evitar bloqueos por politicas RLS.

---

## 8. Cambio a usuario administrador

### Pasos

1. Cerrar sesion.
2. Volver a login.
3. Iniciar sesion con usuario administrador.
4. Acceder al panel de administracion.

### Texto sugerido

> Ahora voy a entrar como administrador. Este rol tiene acceso al panel de gestion, desde donde se administran empleados, turnos, vacaciones, fichajes y reportes.

---

## 9. Panel de administracion: vision general

### Pasos

1. Abrir el panel admin.
2. Mostrar las pestanas principales.
3. Explicar brevemente cada una:
   - solicitudes,
   - turnos,
   - fichajes,
   - empleados,
   - reportes.

### Texto sugerido

> El panel de administracion esta organizado por pestanas. Durante el desarrollo se refactorizo para separar cada area en componentes independientes, porque originalmente era una pantalla monolitica muy grande.

> Ahora el panel carga datos de forma modular, lo que mejora el rendimiento y hace que el codigo sea mas mantenible.

---

## 10. Gestion de solicitudes de vacaciones

### Pasos

1. Entrar en la pestana de solicitudes.
2. Mostrar solicitudes pendientes.
3. Abrir una solicitud.
4. Explicar aprobacion, rechazo, cancelacion o reactivacion.
5. Si se puede, aprobar o rechazar una solicitud de prueba.

### Texto sugerido

> Aqui administracion revisa las solicitudes de vacaciones. Puede aprobarlas, rechazarlas, cancelarlas o reactivarlas segun el estado.

> Una parte importante del proyecto fue reforzar la integridad de estas operaciones. La aprobacion, cancelacion y edicion de vacaciones no se hacen como escrituras separadas desde cliente, sino mediante RPCs transaccionales en Supabase. Asi se evita que una solicitud cambie de estado pero el saldo de dias quede mal actualizado.

---

## 11. Gestion de turnos

### Pasos

1. Entrar en la pestana de turnos.
2. Seleccionar un empleado.
3. Mostrar calendario de asignacion.
4. Pintar varios dias o explicar el flujo.
5. Mostrar horarios de entrada y salida.
6. Mostrar copia semanal si esta disponible.

### Texto sugerido

> En esta seccion el administrador asigna turnos a los empleados. El calendario permite trabajar de forma visual, seleccionando varios dias y guardando la planificacion de manera mas rapida.

> Los turnos no son solo etiquetas: pueden tener hora de entrada y salida. Tambien existe copia semanal para acelerar planificaciones repetitivas.

> Ademas, se valida que no se asignen turnos sobre vacaciones aprobadas, evitando conflictos entre planificacion y ausencias.

---

## 12. Monitor de fichajes

### Pasos

1. Entrar en la pestana de fichajes.
2. Mostrar el monitor diario.
3. Explicar entradas y salidas.
4. Mostrar un fichaje con evidencia de ubicacion.
5. Abrir el detalle o boton de ubicacion si existe.

### Texto sugerido

> El monitor de fichajes permite a administracion revisar la actividad diaria. Se muestran entradas y salidas en orden cronologico, con informacion del empleado y estado del registro.

> Si el fichaje incluye geolocalizacion, el administrador puede consultar la evidencia de ubicacion: coordenadas, precision y, cuando aplica, centro de trabajo validado.

> Esta parte es importante para trazabilidad: no solo se guarda que alguien ficho, sino tambien informacion util para auditar el contexto del fichaje.

---

## 13. Anulacion auditada de fichajes

### Pasos

1. Seleccionar un fichaje activo de prueba.
2. Mostrar accion de anulacion.
3. Introducir motivo.
4. Confirmar o cancelar si no se quiere alterar datos reales.
5. Explicar que no se borra fisicamente.

### Texto sugerido

> Si hay un fichaje erroneo, administracion puede anularlo, pero no se borra fisicamente. El sistema conserva el registro y guarda motivo, fecha de anulacion y administrador responsable.

> Esto es mejor que eliminar datos, porque mantiene la trazabilidad y permite justificar correcciones posteriores.

---

## 14. Registro manual de fichajes por administracion

### Pasos

1. Abrir el modal de fichaje manual.
2. Seleccionar empleado.
3. Elegir entrada o salida.
4. Introducir hora.
5. Escribir nota opcional.
6. Guardar solo si es un empleado de prueba.

### Texto sugerido

> Para empleados configurados como manual only, o en casos excepcionales, administracion puede registrar fichajes manualmente.

> El formulario valida que la secuencia sea coherente: por ejemplo, no deberia registrar una salida si antes no existe una entrada activa. Los fichajes creados asi quedan marcados como creados por administracion.

---

## 15. Gestion de empleados

### Pasos

1. Ir a la pestana de empleados.
2. Mostrar listado.
3. Abrir alta o edicion de empleado.
4. Explicar rol, datos personales y politica de fichaje.
5. Mostrar asignacion de centro si aplica.

### Texto sugerido

> Desde empleados se gestionan altas, ediciones y bajas. Cada empleado puede tener rol, datos de contacto, politica de fichaje y centro de trabajo asignado.

> Las altas se integran con Supabase Auth mediante una funcion de provisionado. Las bajas tambien estan reforzadas: al eliminar un empleado se elimina el perfil, la cuenta Auth asociada y el avatar, evitando usuarios huerfanos.

---

## 16. Reportes y exportacion PDF

### Pasos

1. Entrar en reportes.
2. Seleccionar mes si aplica.
3. Mostrar resumen mensual.
4. Ejecutar exportacion PDF o explicar el boton si no se quiere generar.

### Texto sugerido

> La seccion de reportes resume la actividad mensual por empleado: turnos asignados, vacaciones y datos relevantes del periodo.

> Tambien se puede generar un PDF detallado. Para ello se usa un servicio interno que construye una plantilla HTML y la exporta mediante las librerias de Expo.

> Esta funcionalidad sirve para entregar informes o conservar documentacion mensual fuera de la app.

---

## 17. Testing y calidad tecnica

### Pasos

1. No hace falta abrir codigo si la demo es funcional.
2. Si se quiere mostrar brevemente, abrir `package.json` y ensenar scripts de test.
3. Mencionar `__tests__/vacationService.test.js` y `__tests__/attendanceService.test.js`.

### Texto sugerido

> Ademas de la parte funcional, se incorporo una suite inicial de pruebas con Jest. La cobertura actual incluye `vacationService` y `attendanceService`, dos areas de riesgo por el saldo de dias, los cambios de estado y la trazabilidad de fichajes.

> Los tests validan calculo de dias, saldo disponible, llamadas a RPCs, transiciones de estado, politicas de fichaje, evidencia de ubicacion, fichaje manual administrativo y anulacion auditada. Queda como mejora futura ampliar esta cobertura a autenticacion, Edge Functions y componentes de administracion.

---

## 18. Cierre de la demo

### Texto sugerido

> En resumen, TransferLog cubre los flujos principales de una empresa que necesita gestionar empleados, turnos, vacaciones, fichajes y reportes desde una app movil.

> La parte mas importante del proyecto no ha sido solo construir pantallas, sino reforzar la integridad de los datos: autenticacion real con Supabase Auth, politicas RLS, funciones transaccionales para vacaciones, Edge Functions para operaciones administrativas y una primera base de pruebas automatizadas.

> Como evolucion futura, el siguiente paso natural seria mover completamente la validacion critica de fichajes geolocalizados al backend y ampliar la cobertura de tests sobre control horario y administracion.

---

## 19. Orden rapido para una demo de 5 minutos

Si hay poco tiempo, usar esta version reducida:

1. Login como empleado.
2. Dashboard principal.
3. Fichaje de entrada/salida.
4. Calendario de turnos.
5. Solicitud de vacaciones.
6. Login como admin.
7. Panel admin.
8. Aprobar/revisar vacaciones.
9. Monitor de fichajes con ubicacion.
10. Reporte mensual y PDF.

Texto de cierre breve:

> Esta demo muestra el ciclo completo: el empleado ficha, consulta turnos y solicita vacaciones; administracion planifica, revisa fichajes, gestiona solicitudes y exporta reportes. Todo queda centralizado en Supabase con autenticacion, roles y trazabilidad.

---

## 20. Checklist final antes de presentar

- App abre sin errores.
- Usuario empleado probado.
- Usuario admin probado.
- Hay al menos una solicitud de vacaciones visible.
- Hay al menos un fichaje visible en monitor.
- Hay empleados cargados en administracion.
- Hay turnos o calendario con datos.
- La ubicacion esta permitida si se va a mostrar.
- No mostrar credenciales privadas ni `.env`.
- Evitar borrar o modificar datos reales durante la demo.
