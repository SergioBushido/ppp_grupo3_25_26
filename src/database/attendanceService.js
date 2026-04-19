import { supabase } from '../lib/supabase';
import { getEmployeeById } from './employeeService';
import { getWorkCenterById } from './workCenterService';
import { calculateDistanceMeters } from '../lib/locationService';

export async function getTodayAttendance(employeeId) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from('attendances')
    .select('*')
    .eq('employee_id', employeeId)
    .gte('timestamp', todayStart.toISOString())
    .lte('timestamp', todayEnd.toISOString())
    .order('timestamp', { ascending: true });

  if (error) throw error;
  return data;
}

export async function registerAttendance(employeeId, type) {
  const todayRecords = await getTodayAttendance(employeeId);
  
  if (type === 'in' && todayRecords.some(r => r.type === 'in')) {
    throw new Error('Ya has registrado una entrada hoy.');
  }

  if (type === 'out' && todayRecords.some(r => r.type === 'out')) {
    throw new Error('Ya has registrado una salida hoy.');
  }

  const { data, error } = await supabase
    .from('attendances')
    .insert([{ employee_id: employeeId, type }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function registerAttendanceWithLocation({ employee, type, location }) {
  if (!employee?.id) {
    throw new Error('No se ha encontrado el empleado autenticado.');
  }

  const currentEmployee = await getEmployeeById(employee.id);

  const todayRecords = await getTodayAttendance(currentEmployee.id);

  if (type === 'in' && todayRecords.some((record) => record.type === 'in')) {
    throw new Error('Ya has registrado una entrada hoy.');
  }

  if (type === 'out' && todayRecords.some((record) => record.type === 'out')) {
    throw new Error('Ya has registrado una salida hoy.');
  }

  let validatedWorkCenterId = null;
  let locationDistanceMeters = null;
  let locationStatus = 'not_required';
  let locationNote = null;

  if (currentEmployee.attendance_policy === 'manual_only') {
    throw new Error('Tu fichaje debe registrarse manualmente por administracion.');
  }

  if (currentEmployee.attendance_policy === 'assigned_center') {
    if (!currentEmployee.assigned_work_center_id) {
      throw new Error('No tienes un centro de trabajo asignado para fichar.');
    }

    if (location?.latitude == null || location?.longitude == null) {
      throw new Error('Necesitas activar la ubicacion para registrar el fichaje en tu centro.');
    }

    const center = await getWorkCenterById(currentEmployee.assigned_work_center_id);

    if (!center?.id) {
      throw new Error('El centro asignado no existe o ya no esta disponible.');
    }

    if (location.accuracy_meters && Number(location.accuracy_meters) > Math.max(Number(center.radius_meters || 0), 100)) {
      throw new Error('La precision del GPS es insuficiente. Acercate a una zona despejada e intentalo de nuevo.');
    }

    locationDistanceMeters = calculateDistanceMeters(
      location.latitude,
      location.longitude,
      center.latitude,
      center.longitude
    );

    if (locationDistanceMeters > Number(center.radius_meters)) {
      throw new Error('Estas fuera del radio permitido de tu centro de trabajo.');
    }

    validatedWorkCenterId = center.id;
    locationStatus = 'validated_center';
    locationNote = center.name;
  } else if (currentEmployee.attendance_policy === 'anywhere') {
    if (location?.latitude != null && location?.longitude != null) {
      locationStatus = 'optional_captured';
      locationNote = 'Ubicacion capturada';
    } else {
      locationStatus = 'optional_missing';
      locationNote = 'Ubicacion opcional no disponible';
    }
  }

  const { data, error } = await supabase
    .from('attendances')
    .insert([{
      employee_id: currentEmployee.id,
      type,
      latitude: location?.latitude ?? null,
      longitude: location?.longitude ?? null,
      accuracy_meters: location?.accuracy_meters ?? null,
      validated_work_center_id: validatedWorkCenterId,
      location_distance_meters: locationDistanceMeters,
      location_status: locationStatus,
      location_note: locationNote,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getAllAttendancesByDate(date) {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from('attendances')
    .select(`
      *,
      employees ( name )
    `)
    .gte('timestamp', dayStart.toISOString())
    .lte('timestamp', dayEnd.toISOString())
    .order('timestamp', { ascending: true });

  if (error) throw error;

  return data.map(record => ({
    ...record,
    employee_name: record.employees?.name
  }));
}
