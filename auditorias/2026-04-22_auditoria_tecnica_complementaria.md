# Auditoría Técnica Complementaria — TransferLog

> **Fecha:** 22 de abril de 2026  
> **Alcance:** Revisión estática completa del repositorio actual, incluyendo cliente React Native, servicios, migraciones SQL y Edge Functions de Supabase.  
> **Metodología:** Lectura directa del código, contraste con migraciones activas y ejecución de la suite local `npm test -- --runInBand`.

---

## Resumen ejecutivo

Esta segunda auditoría complementa la anterior y corrige parte de sus hipótesis con el estado real del repositorio a **22 de abril de 2026**.

Hallazgos prioritarios verificados:

1. La lógica crítica de fichaje sigue dependiendo del cliente y el backend no la hace cumplir de forma estricta.
2. La Edge Function de borrado de empleados tiene un fallo real que puede romper el flujo.
3. `AdminScreen` contiene referencias a `setLoading` sin estado asociado, con riesgo de error en runtime.
4. Existen varios problemas de consistencia temporal por uso de fechas UTC para calcular "hoy".
5. La cobertura automática actual es insuficiente para las zonas críticas.

Verificación realizada:

- Suite ejecutada: `npm test -- --runInBand`
- Resultado: `1` suite, `13/13` tests correctos
- Cobertura funcional real: solo `vacationService`

---

## 🔴 Hallazgos Críticos

### C-03 · El backend no impide que un cliente manipulado se salte las reglas de fichaje

**Impacto:** Seguridad funcional e integridad de datos.

**Evidencia en cliente:**  
La lógica de negocio sensible de fichajes se valida en [attendanceService.js](/abs/c:/Users/sergi/Proyectos/ppp_grupo3/src/database/attendanceService.js:104):

- bloqueo de `manual_only`,
- validación de centro asignado,
- comprobación de coordenadas,
- precisión GPS,
- control de entradas y salidas duplicadas.

**Evidencia en backend:**  
La política de inserción en [20260418142000_issue_34_geolocation_attendance.sql](/abs/c:/Users/sergi/Proyectos/ppp_grupo3/supabase/migrations/20260418142000_issue_34_geolocation_attendance.sql:58) solo exige que:

- el usuario sea admin, o
- el `employee_id` coincida con su propia identidad.

No hay trigger, RPC ni constraint que garantice en base de datos:

- que un empleado `manual_only` no inserte fichajes,
- que `assigned_center` requiera ubicación válida,
- que la secuencia `in/out` sea coherente,
- que no se creen múltiples entradas/salidas activas en el mismo día.

**Riesgo real:** Un cliente modificado o una llamada directa a la API podría crear fichajes válidos para sí mismo sin respetar la política de negocio.

**Recomendación:** Mover estas validaciones a una RPC o trigger SQL transaccional y dejar el cliente solo como capa de UX.

---

## 🟠 Hallazgos Altos

### A-07 · La Edge Function `delete-employee` usa `authHeader` sin declararlo

**Impacto:** Rotura funcional del borrado de empleados.

**Evidencia:** En [delete-employee/index.ts](/abs/c:/Users/sergi/Proyectos/ppp_grupo3/supabase/functions/delete-employee/index.ts:56) se construye el cliente con:

```ts
global: { headers: { Authorization: authHeader } }
```

pero `authHeader` no ha sido definido antes en el fichero.

**Consecuencia:** La función puede fallar antes de validar la sesión del solicitante. El flujo de baja de empleados no es fiable en el estado actual.

**Recomendación:** Declarar `const authHeader = request.headers.get('Authorization');`, validar su presencia y añadir test mínimo de la función.

---

### A-08 · `AdminScreen` llama a `setLoading()` sin que exista ese estado

**Impacto:** Error en runtime en operaciones del panel admin.

**Evidencia:** Hay llamadas a `setLoading(true/false)` en [AdminScreen.js](/abs/c:/Users/sergi/Proyectos/ppp_grupo3/src/screens/AdminScreen.js:431), [496](/abs/c:/Users/sergi/Proyectos/ppp_grupo3/src/screens/AdminScreen.js:496), [504](/abs/c:/Users/sergi/Proyectos/ppp_grupo3/src/screens/AdminScreen.js:504), [533](/abs/c:/Users/sergi/Proyectos/ppp_grupo3/src/screens/AdminScreen.js:533) y [669](/abs/c:/Users/sergi/Proyectos/ppp_grupo3/src/screens/AdminScreen.js:669).

Sin embargo, en la declaración de estado del componente solo existen cargas modulares como [baseDataLoading, requestsLoading, shiftsLoading, attendancesLoading y reportsLoading](/abs/c:/Users/sergi/Proyectos/ppp_grupo3/src/screens/AdminScreen.js:61).

**Consecuencia:** Cualquier handler que pase por esas ramas puede lanzar `ReferenceError: setLoading is not defined`.

**Recomendación:** Introducir un estado `loading` real o, mejor, sustituir cada uso por estados específicos por flujo.

---

### A-09 · La auditoría anterior ha quedado parcialmente desfasada frente al código real

**Impacto:** Riesgo de priorizar correcciones ya resueltas y pasar por alto errores actuales.

**Ejemplos verificados:**

- `editRequestVacation` sí es RPC transaccional en [vacationService.js](/abs/c:/Users/sergi/Proyectos/ppp_grupo3/src/database/vacationService.js:80) y en [20260419125400_issue_37_transactional_edit_vacation.sql](/abs/c:/Users/sergi/Proyectos/ppp_grupo3/supabase/migrations/20260419125400_issue_37_transactional_edit_vacation.sql:1).
- `VacationsScreen` sí tiene `try/catch/finally` en [VacationsScreen.js](/abs/c:/Users/sergi/Proyectos/ppp_grupo3/src/screens/VacationsScreen.js:21).
- `CalendarScreen` sí captura errores en [CalendarScreen.js](/abs/c:/Users/sergi/Proyectos/ppp_grupo3/src/screens/CalendarScreen.js:50).
- `ShiftBadge` ya usa iconos correctos en [ShiftBadge.js](/abs/c:/Users/sergi/Proyectos/ppp_grupo3/src/components/ShiftBadge.js:7), aunque el modal del calendario sigue usando iconos antiguos.

**Recomendación:** Mantener la auditoría del 19 de abril de 2026 como histórico y usar este archivo como referencia operativa actual.

---

## 🟡 Hallazgos Medios

### M-13 · `AdminScreen` puede enriquecer fichajes antes de tener cargados los empleados

**Impacto:** Inconsistencia visual y potenciales refrescos incompletos.

**Evidencia:**  
La pestaña de fichajes lanza en paralelo `loadBaseData()` y `loadDayAttendances()` en [AdminScreen.js](/abs/c:/Users/sergi/Proyectos/ppp_grupo3/src/screens/AdminScreen.js:259).  
Después, `loadDayAttendances()` construye `employee_name` usando `employees.find(...)` en [AdminScreen.js](/abs/c:/Users/sergi/Proyectos/ppp_grupo3/src/screens/AdminScreen.js:304), pero `employees` se rellena en [AdminScreen.js](/abs/c:/Users/sergi/Proyectos/ppp_grupo3/src/screens/AdminScreen.js:190).

**Consecuencia:** La primera carga puede mostrar `Empleado #id` aunque el nombre exista.

**Recomendación:** Secuenciar ambas cargas o recalcular los nombres cuando cambie `employees`.

---

### M-14 · El cálculo de "hoy" usa UTC y puede consultar el día incorrecto

**Impacto:** Errores intermitentes cerca de medianoche o en husos distintos.

**Evidencia:**

- [shiftService.js](/abs/c:/Users/sergi/Proyectos/ppp_grupo3/src/database/shiftService.js:69) usa `new Date().toISOString().split('T')[0]`.
- [vacationService.js](/abs/c:/Users/sergi/Proyectos/ppp_grupo3/src/database/vacationService.js:56) usa el mismo patrón.

**Consecuencia:** La app puede pedir turnos o vacaciones del día UTC, no del día local del usuario.

**Recomendación:** Generar fecha local con utilidades coherentes en toda la app.

---

### M-15 · El modal de asignación de turnos en `CalendarScreen` conserva iconos antiguos

**Impacto:** Inconsistencia visual y de mantenimiento.

**Evidencia:** Aunque [ShiftBadge.js](/abs/c:/Users/sergi/Proyectos/ppp_grupo3/src/components/ShiftBadge.js:7) ya usa `weather-sunset` y `weather-night`, el modal de [CalendarScreen.js](/abs/c:/Users/sergi/Proyectos/ppp_grupo3/src/screens/CalendarScreen.js:363) sigue definiendo `wrench` para tarde y noche.

**Recomendación:** Centralizar configuración de tipos de turno e iconos en una sola fuente compartida.

---

### M-16 · El filtrado de empleados en admin excluye a los administradores del dataset base

**Impacto:** Posible invisibilidad de admins en reportes o gestión operativa.

**Evidencia:** `loadBaseData()` filtra `emps.filter((e) => e.role === 'employee')` en [AdminScreen.js](/abs/c:/Users/sergi/Proyectos/ppp_grupo3/src/screens/AdminScreen.js:198).

**Riesgo:** Si un admin también participa en turnos o vacaciones, desaparece de varias vistas.

**Recomendación:** Confirmar la regla funcional y, si procede, separar "visibilidad operativa" de "rol".

---

### M-17 · El flujo de avatar depende de `fetch(asset.uri)` y puede fallar según plataforma/origen

**Impacto:** Fragilidad en subida de avatar.

**Evidencia:** [employeeService.js](/abs/c:/Users/sergi/Proyectos/ppp_grupo3/src/database/employeeService.js:230) convierte el asset usando `fetch(asset.uri)` y `arrayBuffer()`.

**Riesgo:** En algunos contextos de React Native/Expo, ciertos URIs locales o permisos pueden dar problemas silenciosos.

**Mitigación actual:** La política de storage está razonablemente bien cerrada en [20260418124500_issue_profile_avatar.sql](/abs/c:/Users/sergi/Proyectos/ppp_grupo3/supabase/migrations/20260418124500_issue_profile_avatar.sql:19), así que aquí el problema es más de robustez que de seguridad.

---

## 🟢 Riesgos bajos y deuda técnica

### L-13 · `LoginScreen` no implementa limitación visual de intentos ni estados de recuperación más finos

El flujo es funcional, pero sigue siendo básico en UX y defensa frente a abuso.

### L-14 · No hay tests para las áreas con más riesgo actual

Faltan pruebas de:

- `attendanceService`,
- `AuthContext`,
- `AdminScreen`,
- Edge Functions,
- reglas de avatar y cambio de contraseña.

### L-15 · El repositorio mantiene una auditoría histórica que ya no coincide del todo con el estado real

No es un bug de aplicación, pero sí una deuda documental importante.

---

## Priorización recomendada actualizada

1. Blindar los fichajes en backend con RPC/trigger y no solo en cliente.
2. Arreglar `delete-employee` y validar manualmente la baja completa de empleado.
3. Corregir `setLoading` inexistente en `AdminScreen`.
4. Normalizar toda la obtención de fechas locales.
5. Añadir tests para fichajes, panel admin y Edge Functions.

---

## Validación realizada en esta auditoría

Comandos ejecutados:

```powershell
git status --short
rg --files
npm test -- --runInBand
```

Resultado relevante:

- El worktree tenía `coverage/` sin trackear.
- La suite local pasó correctamente.
- La cobertura efectiva sigue centrada solo en vacaciones.

---

## Conclusión

El proyecto ha mejorado respecto a algunos riesgos reflejados en la auditoría anterior, especialmente en vacaciones transaccionales, manejo de errores en pantallas y configuración de `ShiftBadge`. Aun así, el sistema sigue teniendo una superficie de riesgo clara en tres frentes:

1. Reglas críticas de fichaje todavía confiadas al cliente.
2. Fallos reales en código de administración backend/frontend.
3. Cobertura de pruebas insuficiente para lógica de alto impacto.

La recomendación es tratar este archivo como estado operativo actual y usar la auditoría del 19 de abril de 2026 como histórico de evolución.
