# TransferLog

## App móvil

### Stack
- React Native
- Expo
- Supabase
- PostgreSQL
- React Navigation
- date-fns

### Punto de entrada
- `index.js`
- `App.js`
  - `GestureHandlerRootView`
  - `AuthProvider`
  - `SafeAreaProvider`
  - `NavigationContainer`
  - `AppNavigator`

### Flujo de autenticación
- `src/context/AuthContext.js`
  - restauración de sesión
  - login con email y contraseña
  - logout
  - refresco de perfil
  - sincronización sesión auth <-> perfil empleado

### Navegación
- `src/navigation/AppNavigator.js`
  - Stack raíz
    - `Login`
    - `ForcePasswordChange`
    - `Main`
    - `RequestVacation` modal
    - `AdminRequestVacation` modal
  - Tabs principales
    - `Home`
    - `Calendar`
    - `Vacations`
    - `Settings`
    - `Admin` oculta en tab bar

### Pantallas de usuario
- `src/screens/LoginScreen.js`
  - acceso a la app
- `src/screens/ForcePasswordChangeScreen.js`
  - cambio obligatorio de contraseña
- `src/screens/HomeScreen.js`
  - vista principal del empleado
- `src/screens/CalendarScreen.js`
  - calendario y planificación
- `src/screens/VacationsScreen.js`
  - historial y estado de vacaciones
- `src/screens/RequestVacationScreen.js`
  - solicitud de vacaciones
- `src/screens/SettingsScreen.js`
  - perfil y ajustes

### Panel de administración
- `src/screens/AdminScreen.js`
  - carga modular por pestaña
  - operaciones de administración
  - exportación PDF
  - modales de soporte

#### Pestañas admin
- `src/screens/Admin/tabs/RequestsTab.js`
  - aprobar solicitudes
  - rechazar solicitudes
  - cancelar, reactivar o eliminar
- `src/screens/Admin/tabs/ShiftsTab.js`
  - asignación de turnos
  - copia semanal
  - edición de horarios
- `src/screens/Admin/tabs/AttendancesTab.js`
  - monitor diario de fichajes
  - localización y precisión
  - anulación auditada
  - fichaje manual
- `src/screens/Admin/tabs/EmployeesTab.js`
  - alta, edición y baja de empleados
  - políticas de fichaje
  - centros de trabajo
- `src/screens/Admin/tabs/ReportsTab.js`
  - resumen mensual
  - exportación PDF

#### Modales admin
- `src/screens/Admin/modals/AddEmployeeModal.js`
- `src/screens/Admin/modals/EditEmployeeModal.js`
- `src/screens/Admin/modals/ShiftAssignmentModal.js`
- `src/screens/Admin/modals/EditShiftTimeModal.js`
- `src/screens/Admin/modals/CopyWeekModal.js`
- `src/screens/Admin/modals/ManualAttendanceModal.js`
- `src/screens/Admin/modals/AttendanceActionModal.js`
- `src/screens/Admin/modals/LocationInfoModal.js`
- `src/screens/Admin/modals/WorkCenterModal.js`

### Componentes UI
- `src/components/UserAvatar.js`
- `src/components/ShiftBadge.js`
- `src/components/VacationCard.js`

### Servicios de negocio
- `src/database/employeeService.js`
  - empleados
  - autenticación
  - reseteo de contraseña
- `src/database/shiftService.js`
  - turnos diarios y mensuales
  - asignación masiva
  - edición y borrado
- `src/database/vacationService.js`
  - solicitud
  - aprobación y rechazo
  - cancelación y reactivación
- `src/database/attendanceService.js`
  - fichajes
  - fichaje manual admin
  - anulación auditada
- `src/database/workCenterService.js`
  - centros de trabajo

### Librerías internas
- `src/lib/supabase.js`
  - cliente Supabase
- `src/lib/dateService.js`
  - utilidades de fecha
- `src/lib/locationService.js`
  - GPS y validación operativa
- `src/lib/pdfService.js`
  - generación de reportes PDF

### Configuración y tema
- `src/config/enviroment.js`
- `src/config/calendarLocale.js`
- `src/theme/colors.js`
- `src/theme/typography.js`

### Backend Supabase
- `supabase/migrations/`
  - RLS
  - vacaciones transaccionales
  - geolocalización de fichajes
  - controles admin de fichaje
  - cambio forzado de contraseña
- `supabase/functions/provision-employee/index.ts`
  - aprovisionamiento de empleado
- `supabase/functions/delete-employee/index.ts`
  - baja de empleado

### Testing
- `__tests__/vacationService.test.js`
- `__mocks__/@supabase/supabase-js.js`

### Recursos y documentación
- `assets/`
  - iconos
  - splash
  - logo
- `README.md`
- `issues_backlog.md`
- `auditorias/`

## Dominios funcionales

### Empleados
- roles `admin` y `employee`
- perfil asociado a usuario auth
- avatar
- cambio de contraseña

### Turnos
- mañana
- tarde
- noche
- copia semanal
- validación contra vacaciones

### Vacaciones
- solicitud por empleado
- aprobación o rechazo admin
- cancelación y reactivación
- reflejo en calendario

### Fichajes
- política `anywhere`
- política `assigned_center`
- política `manual_only`
- evidencia de ubicación
- anulación auditada

### Reportes
- resumen mensual por empleado
- conteo por tipo de turno
- vacaciones disfrutadas
- exportación PDF

## Relación de capas
- UI -> pantallas, tabs, modales, componentes
- contexto -> sesión y usuario autenticado
- servicios `database/` -> acceso a Supabase y reglas de negocio
- `lib/` -> utilidades transversales
- Supabase -> auth, tablas, RLS, funciones edge, migraciones
