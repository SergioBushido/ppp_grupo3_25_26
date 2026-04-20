// Shared constants for AdminScreen module

export const TABS = [
  { key: 'requests', label: 'Solicitudes', icon: 'inbox' },
  { key: 'shifts', label: 'Turnos', icon: 'calendar-edit' },
  { key: 'attendances', label: 'Fichajes', icon: 'clock-check-outline' },
  { key: 'employees', label: 'Empleados', icon: 'account-group' },
  { key: 'reports', label: 'Reportes', icon: 'chart-bar' },
];

export const SHIFT_OPTIONS = [
  { type: 'morning', label: 'Mañana', icon: 'weather-sunny' },
  { type: 'afternoon', label: 'Tarde', icon: 'weather-sunset' },
  { type: 'night', label: 'Noche', icon: 'weather-night' },
];

export const ATTENDANCE_POLICIES = [
  { value: 'anywhere', label: 'Libre', description: 'Puede fichar desde cualquier ubicacion.' },
  { value: 'assigned_center', label: 'Centro asignado', description: 'Debe estar dentro del radio del centro configurado.' },
  { value: 'manual_only', label: 'Solo manual', description: 'El fichaje no se registra desde la app.' },
];
