# Auditoría Técnica Profunda — TransferLog

> **Fecha:** 19 de abril de 2026  
> **Alcance:** Todo el código fuente (`src/`, `App.js`, `package.json`, `.env`, `supabase/`), configuración y arquitectura.  
> **Metodología:** Revisión estática fichero por fichero de lógica de negocio, servicios, pantallas, componentes, navegación, tema, configuración y dependencias.

---

## Resumen ejecutivo

| Severidad | Hallazgos |
|-----------|-----------|
| 🔴 Crítico | 2 |
| 🟠 Alto | 6 |
| 🟡 Medio | 12 |
| 🟢 Bajo / Mejora continua | 12 |
| **Total** | **32** |

---

## 🔴 Hallazgos Críticos

### C-01 · `editRequestVacation` NO es transaccional — puede dejar saldo inconsistente

**Riesgo:** Integridad de datos. Afecta a `vacationService.js` líneas 98-137.

**Problema actual:**  
`editRequestVacation` realiza **dos escrituras separadas** (primero actualiza `employees.available_days`, luego actualiza `vacations`). Si la segunda falla, el saldo del empleado ya fue modificado y queda inconsistente. Además:
- Usa `.update([{...}])` con array para una fila individual (Supabase lo acepta pero es innecesario y confuso).
- Calcula `newAvailableDays` en **cliente** y lo escribe directamente, sin protección contra condiciones de carrera (otra pestaña podría haber cambiado el saldo).

**Referencia:** El propio backlog reconoce esto: *"queda recomendable revisar a futuro la regla de negocio completa del saldo en escenarios complejos"*.

**Propuesta:**
1. Crear RPC `edit_vacation_transactional` en Supabase similar a `approve_vacation_transactional` / `cancel_vacation_transactional`.
2. Bloquear la fila del empleado con `FOR UPDATE`, recalcular saldo, actualizar vacación y saldo atómicamente.
3. Llamar a la RPC desde el servicio cliente.

---

### C-02 · El fichero `.env` contiene la Supabase Anon Key en texto plano

**Riesgo:** Si en algún momento se comitió `.env` al historial de Git (o se sube por accidente), la clave queda expuesta públicamente.

**Estado actual:**  
- `.env` está en `.gitignore` y **no** está trackeado actualmente ✅.
- Sin embargo, la Anon Key es visible en el sistema de ficheros y no hay medidas adicionales (ej. rotado periódico, alertas de compromiso).

**Propuesta:**
1. Verificar con `git log --all --diff-filter=A -- .env` que nunca se comitió al historial.
2. Configurar un pre-commit hook o usar `git-secrets` para prevenir fugas accidentales.
3. Documentar en `README.md` cómo obtener las credenciales de entorno.

---

## 🟠 Hallazgos Altos

### A-01 · `AdminScreen.js` tiene **2.912 líneas** — archivo monolítico inmantenible

**Problema:**  
Un solo fichero contiene **5 pestañas completas** (Solicitudes, Turnos, Fichajes, Empleados, Reportes), más de **30 estados**, **10+ modales** y toda la lógica de administración. Esto genera:
- Alto riesgo de regresiones al tocar cualquier parte.
- Re-renders innecesarios: cambiar un campo de un modal re-renderiza las 2.900 líneas.
- Tiempos lentos de recarga en desarrollo.

**Propuesta:**
Extraer en componentes/pantallas independientes:

| Componente propuesto | Líneas estimadas |
|---|---|
| `AdminRequestsTab.js` | ~80 |
| `AdminShiftsTab.js` | ~200 |
| `AdminAttendancesTab.js` | ~350 |
| `AdminEmployeesTab.js` | ~250 |
| `AdminReportsTab.js` | ~150 |
| Modales individuales (`EditEmployeeModal`, `ShiftAssignmentModal`, etc.) | ~100 c/u |
| `useAdminData` hook compartido | ~80 |

---

### A-02 · Doble `useFocusEffect` en `AdminScreen` — carga redundante

**Problema:**  
Hay dos bloques `useFocusEffect` (líneas 357-362 y 1070-1074) que ambos llaman a `loadAll()`. El segundo duplica la carga innecesariamente.

**Propuesta:** Eliminar el segundo `useFocusEffect` (línea 1070-1074).

---

### A-03 · `VacationsScreen` no tiene `try/catch` en `loadVacations`

**Problema (VacationsScreen.js, líneas 25-30):**  
```javascript
const loadVacations = useCallback(async () => {
  setLoading(true);
  const data = await getVacationsByEmployee(user.id); // Sin try/catch
  setVacations(data);
  setLoading(false);
}, [user.id]);
```
Si Supabase devuelve error (red, RLS, etc.), la app queda en estado loading infinito con una excepción no capturada.

**Propuesta:** Aplicar `try/catch/finally` con estado de error y CTA de reintento (patrón ya documentado en el backlog como tarea técnica pendiente).

---

### A-04 · `CalendarScreen` no captura errores en `loadData`

**Problema (CalendarScreen.js, líneas 56-82):**  
Similar a A-03, `loadData` tiene `finally` pero ningún `catch`. Si cualquiera de las 3 promesas falla, el error se propaga sin control.

---

### A-05 · `ShiftBadge` usa `wrench` como icono para Tarde y Noche

**Problema (ShiftBadge.js, líneas 15-28):**  
Los iconos de `afternoon` y `night` están ambos configurados como `wrench` (llave inglesa), lo cual no tiene sentido semántico. En cambio, en el modal de asignación de `CalendarScreen` (líneas 431-433), `afternoon` usa `wrench` y `night` también `wrench`, cuando deberían ser `weather-sunset` y `weather-night`.

**Propuesta:** Unificar usando los iconos correctos de `SHIFT_OPTIONS` de `AdminScreen.js`:
- `afternoon` → `weather-sunset`
- `night` → `weather-night`

---

### A-06 · `LocaleConfig` se define 3 veces con contenido idéntico

**Problema:**  
`LocaleConfig.locales['es']` se configura de forma idéntica en:
- `RequestVacationScreen.js` (líneas 21-28)
- `AdminRequestVacationScreen.js` (líneas 20-27)
- `AdminScreen.js` (líneas 25-32)

Además, `LocaleConfig.defaultLocale = 'es'` se sobreescribe en cada importación.

**Propuesta:** Centralizar en un fichero `src/config/calendarLocale.js` e importar una sola vez en `App.js`.

---

## 🟡 Hallazgos Medios

### M-01 · `loadDayAttendances` carga **todos** los fichajes recientes para filtrar por fecha en cliente

**Problema (AdminScreen.js, líneas 376-410):**  
Se hace `getRecentAttendances(200)` y luego se filtra en JS por fecha. Esto carga datos innecesarios, consume memoria y hace la pantalla más lenta conforme crecen los fichajes.

**Propuesta:** Usar `getAllAttendancesByDate(attendanceDate)` que ya existe en `attendanceService.js` (línea 193), aplicando el filtro directamente en Supabase.

---

### M-02 · `deleteEmployee` no limpia el usuario Auth asociado

**Problema:**  
`deleteEmployee` solo borra la fila de `employees`, pero el usuario de `auth.users` asociado (`auth_user_id`) sigue existiendo en Supabase Auth. Puede causar:
- Usuarios huérfanos en Auth.
- El email queda "ocupado" impidiendo recrear al empleado.

**Propuesta:** Crear una Edge Function o RPC admin que elimine también el usuario Auth.

---

### M-03 · No hay protección contra lecturas/escrituras sin sesión activa

**Problema:**  
El cliente Supabase no verifica que la sesión sea válida antes de cada operación. Si la sesión expira a mitad de uso, las queries fallan con errores crípticos.

**Propuesta:** Crear un wrapper/interceptor que valide la sesión antes de cada operación Supabase, o usar un `useEffect` global que detecte sesión expirada y redirige al login.

---

### M-04 · `HomeScreen` importa `Alert` sin desestructurar correctamente

**Problema (HomeScreen.js, líneas 8-9):**
```javascript
import {
  ...
  // Línea vacía entre ScrollView y Alert
  Alert,
} from 'react-native';
```
Hay una línea vacía en medio de la desestructuración — no es un bug funcional pero indica código apresurado.

---

### M-05 · `enviroment.js` tiene un error ortográfico (`enviroment` → `environment`)

**Problema:** El fichero y su export se llaman `enviroment` en lugar de `environment`. Aunque funcional, es una incoherencia que dificulta búsquedas y autocomplete.

---

### M-06 · La función `handleFillAll()` en AdminScreen está vacía (código muerto)

**Problema (AdminScreen.js, líneas 630-632):**
```javascript
const handleFillAll = (type) => {
  // Deprecated with interactive calendar, but kept minimal to avoid breaks if referenced.
};
```
Función muerta que no se usa. Debería eliminarse junto con cualquier referencia.

---

### M-07 · `handleDeleteShift` en AdminScreen usa importación dinámica innecesaria

**Problema (AdminScreen.js, línea 730):**
```javascript
const { deleteShift } = await import('../database/shiftService');
```
`deleteShift` **ya está** importado en la línea 35 del mismo fichero. Esta importación dinámica es redundante.

---

### M-08 · Avatar firmado con URL de 7 días sin refresco automático

**Problema (employeeService.js, líneas 16-18):**
```javascript
const { data, error } = await supabase.storage
  .from(AVATAR_BUCKET)
  .createSignedUrl(path, 60 * 60 * 24 * 7); // 7 días
```
Si el usuario mantiene la app abierta más de 7 días sin reiniciar, las URLs expiran y los avatares dejan de mostrarse. No hay mecanismo de refresco.

**Propuesta:** Reducir a 1 día y refrescar en cada `refreshUser`, o implementar un interceptor que detecte 403 y renueve.

---

### M-09 · `getAllEmployees` en AdminScreen filtra `role === 'employee'` — oculta admins

**Problema:** Tanto en `loadAll` (línea 347) como en reports, los admins se excluyen. Si hay un admin que también tiene turnos/vacaciones, no aparecerá en ninguna vista de gestión.

**Propuesta:** Evaluar si los admins deben ser visibles en el panel (quizás con badge diferenciado) o documentar explícitamente la regla de negocio.

---

### M-10 · `construirMatrizPDF` nunca se usa

**Problema:** La función `construirMatrizPDF` (líneas 183-207) calcula una matriz para PDF pero nunca se invoca. `handleExportarPDF` construye su propia copia entre líneas 210-249. Código duplicado + muerto.

---

### M-11 · No hay timeout ni limitador de reintentos en las llamadas a Supabase

**Problema:** Las operaciones de red a Supabase no tienen timeout explícito. En redes lentas, la app puede quedar en estado de "cargando" indefinidamente.

---

### M-12 · `FlatList` anidado dentro de `View` en la pestaña Fichajes

**Problema (AdminScreen.js, líneas 1215-1317):**  
La pestaña de fichajes usa un `<View>` como contenedor padre y un `<FlatList>` dentro. Sin `flex: 1` en el padre inmediato del FlatList, la lista puede no tener altura correcta en todos los dispositivos.

---

## 🟢 Hallazgos Bajos / Mejoras Continuas

### L-01 · Pull-to-refresh no disponible en `HomeScreen` ni `SettingsScreen`

**Propuesta:** Añadir `RefreshControl` para que el usuario pueda forzar recarga de datos.

---

### L-02 · No hay feedback háptico en acciones críticas (aprobar, rechazar, fichar)

**Propuesta:** Usar `expo-haptics` para vibraciones sutiles al confirmar acciones destructivas.

---

### L-03 · Placeholders de tiempo en `RequestVacationScreen` usan comparación `startDate !== endDate` con objetos Date

**Problema (RequestVacationScreen.js, línea 166):**
```javascript
{startDate && endDate && startDate !== endDate && (
```
`startDate !== endDate` compara **referencias**, no valores. Dos Date con el mismo timestamp siempre son `!==`. El `AdminRequestVacationScreen` lo corrige correctamente usando `.getTime()`.

---

### L-04 · Modal de contraseña en `SettingsScreen` no tiene indicador de fuerza

**Propuesta:** Añadir barra visual de seguridad de contraseña (longitud, mayúsculas, números, especiales).

---

### L-05 · No hay límite de intentos de login

**Propuesta:** Implementar rate limiting visual (ej. bloquear botón 30s tras 5 intentos fallidos en cliente; Supabase Auth tiene rate limiting server-side pero la UX debe reflejarlo).

---

### L-06 · Console.log en producción

**Problema:** Hay numerosos `console.log`, `console.error` y `console.warn` dispersos por toda la app. En producción, estos reducen rendimiento y pueden filtrar datos sensibles.

**Propuesta:** Configurar un logger que se deshabilite en producción (`__DEV__` guard global) o usar `babel-plugin-transform-remove-console`.

---

### L-07 · `react-native-dotenv` está en dependencias pero no se usa activamente

**Problema:** `react-native-dotenv` (línea 29 de `package.json`) está instalado, pero la lectura de env se hace con `process.env.EXPO_PUBLIC_*` que Expo maneja nativamente. Dependencia innecesaria.

---

### L-08 · Tipos TypeScript parcialmente configurados pero no usados

**Problema:** Existe `tsconfig.json` y `@types/react` en devDependencies, pero todos los ficheros fuente son `.js`. Esto genera confusión sobre si el proyecto es JS o TS.

**Propuesta:** O migrar progresivamente a `.tsx`/`.ts` o eliminar la configuración TS muerta.

---

### L-09 · `index.js` como entry point con `registerRootComponent` podría simplificarse

**Propuesta:** Expo 54+ puede usar directamente `App.js` como entry point sin `index.js`.

---

### L-10 · No hay indicador visual de "sin conexión"

**Propuesta:** Usar `NetInfo` de `@react-native-community/netinfo` para mostrar un banner cuando no hay red, evitando errores confusos.

---

### L-11 · Ausencia de esquema de accesibilidad (a11y)

**Problema:** No se usan `accessibilityLabel`, `accessibilityRole` ni `accessibilityHint` en ningún componente interactivo.

**Propuesta:** Añadir labels a botones, inputs y elementos táctiles principales para lectores de pantalla. Esto es especialmente importante en la pantalla de login y el flujo de fichaje.

---

### L-12 · Modo oscuro no soportado

**Propuesta futura:** El tema de colores está centralizado en `colors.js`, lo cual es una buena base. Se podría ampliar con un segundo set de colores oscuros y un contexto de tema. No bloqueante pero mejoraría significativamente la experiencia visual.

---

## Priorización recomendada

| Orden | Hallazgo | Esfuerzo | Impacto |
|-------|----------|----------|---------|
| 1 | **C-01** editRequestVacation transaccional | Medio | Integridad datos |
| 2 | **A-03 + A-04** try/catch en pantallas | Bajo | Estabilidad |
| 3 | **A-05** Iconos ShiftBadge | Trivial | Coherencia visual |
| 4 | **A-06** LocaleConfig centralizado | Bajo | Mantenibilidad |
| 5 | **A-02** useFocusEffect duplicado | Trivial | Rendimiento |
| 6 | **M-01** Optimizar carga fichajes admin | Bajo | Rendimiento |
| 7 | **M-06 + M-10** Código muerto | Trivial | Limpieza |
| 8 | **M-07** Import dinámico innecesario | Trivial | Limpieza |
| 9 | **A-01** Refactor AdminScreen | Alto | Mantenibilidad |
| 10 | **L-03** Comparación Date por referencia | Trivial | Corrección lógica |
| 11 | **M-02** Limpieza usuario Auth al borrar empleado | Medio | Integridad |
| 12 | **L-06** Eliminar console.log en producción | Bajo | Seguridad + rendimiento |
| 13 | **M-05 + L-07 + L-08** Limpieza config/deps | Bajo | Orden del proyecto |
| 14 | **L-11** Accesibilidad básica | Medio | Inclusividad |
| 15 | **L-01 + L-10** Pull-to-refresh + banner offline | Medio | UX |

---

## Plan de verificación

### Tests automáticos
- Configurar Jest + mocks de Supabase y cubrir:
  - `editRequestVacation` (escenario de fallo parcial)
  - `registerAttendanceWithLocation` (cada política)
  - `invalidateAttendanceByAdmin` (secuencia correcta)

### Verificación manual
- Intentar editar vacaciones, provocar fallo de red a mitad y verificar consistencia de saldo.
- Simular sesión expirada y verificar comportamiento de la app.
- Revisar la app con el lector de pantalla TalkBack/VoiceOver activo.

---

> **Nota:** Esta auditoría solo cubre el código cliente (React Native). Las migraciones SQL y las Edge Functions de Supabase requieren una revisión independiente si se quiere auditar también el backend.
