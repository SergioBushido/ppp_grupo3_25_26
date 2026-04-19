import { supabase } from '../lib/supabase';
import { getEmployeeById } from './employeeService';
import { getWorkCenterById } from './workCenterService';
import { calculateDistanceMeters } from '../lib/locationService';

function isMissingAttendanceAuditColumn(error) {
  return error?.code === '42703' && error?.message?.includes('record_status');
}

function normalizeAttendanceRecord(record) {
  return {
    record_status: 'active',
    voided_at: null,
    voided_by_employee_id: null,
    void_reason: null,
    ...record,
  };
}

function buildLocalDayBounds(date) {
  if (typeof date === 'string') {
    return {
      dayStart: new Date(`${date}T00:00:00`),
      dayEnd: new Date(`${date}T23:59:59.999`),
    };
  }

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  return { dayStart, dayEnd };
}

async function getAttendanceById(attendanceId) {
  const { data, error } = await supabase
    .from('attendances')
    .select('*')
    .eq('id', attendanceId)
    .single();

  if (error) throw error;
  return data;
}

export async function getTodayAttendance(employeeId) {
  const { dayStart: todayStart, dayEnd: todayEnd } = buildLocalDayBounds(new Date());

  const activeQuery = supabase
    .from('attendances')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('record_status', 'active')
    .gte('timestamp', todayStart.toISOString())
    .lte('timestamp', todayEnd.toISOString())
    .order('timestamp', { ascending: true });

  const { data, error } = await activeQuery;

  if (isMissingAttendanceAuditColumn(error)) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('attendances')
      .select('*')
      .eq('employee_id', employeeId)
      .gte('timestamp', todayStart.toISOString())
      .lte('timestamp', todayEnd.toISOString())
      .order('timestamp', { ascending: true });

    if (fallbackError) throw fallbackError;
    return (fallbackData || []).map(normalizeAttendanceRecord);
  }

  if (error) throw error;
  return (data || []).map(normalizeAttendanceRecord);
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
  const { dayStart, dayEnd } = buildLocalDayBounds(date);

  const { data, error } = await supabase
    .from('attendances')
    .select('*')
    .gte('timestamp', dayStart.toISOString())
    .lte('timestamp', dayEnd.toISOString())
    .order('timestamp', { ascending: true });

  if (error) throw error;

  return (data || []).map(record => ({
    ...normalizeAttendanceRecord(record),
  }));
}

export async function getRecentAttendances(limit = 50) {
  const { data, error } = await supabase
    .from('attendances')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data || []).map((record) => ({
    ...normalizeAttendanceRecord(record),
  }));
}

export async function invalidateAttendanceByAdmin(attendanceId, { adminEmployeeId, reason }) {
  const normalizedReason = reason?.trim();
  if (!normalizedReason) {
    throw new Error('Debes indicar un motivo para anular el fichaje.');
  }

  if (!adminEmployeeId) {
    throw new Error('No se ha identificado al administrador que realiza la accion.');
  }

  const attendance = await getAttendanceById(attendanceId);

  if (attendance.record_status == null) {
    throw new Error('Debes aplicar la migracion de control auditado de fichajes antes de usar esta accion.');
  }

  if (attendance.record_status === 'voided') {
    throw new Error('Este fichaje ya estaba anulado.');
  }

  const attendanceDate = new Date(attendance.timestamp);
  const dayStart = new Date(attendanceDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(attendanceDate);
  dayEnd.setHours(23, 59, 59, 999);

  const { data: latestActiveRecord, error: latestError } = await supabase
    .from('attendances')
    .select('id')
    .eq('employee_id', attendance.employee_id)
    .eq('record_status', 'active')
    .gte('timestamp', dayStart.toISOString())
    .lte('timestamp', dayEnd.toISOString())
    .order('timestamp', { ascending: false })
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (isMissingAttendanceAuditColumn(latestError)) {
    throw new Error('Debes aplicar la migracion de control auditado de fichajes antes de usar esta accion.');
  }

  if (latestError) throw latestError;

  if (!latestActiveRecord || latestActiveRecord.id !== attendance.id) {
    throw new Error('Solo se puede anular el ultimo fichaje activo del empleado en ese dia.');
  }

  const { data, error } = await supabase
    .from('attendances')
    .update({
      record_status: 'voided',
      voided_at: new Date().toISOString(),
      voided_by_employee_id: adminEmployeeId,
      void_reason: normalizedReason,
    })
    .eq('id', attendanceId)
    .eq('record_status', 'active')
    .select()
    .single();

  if (isMissingAttendanceAuditColumn(error)) {
    throw new Error('Debes aplicar la migracion de control auditado de fichajes antes de usar esta accion.');
  }

  if (error) throw error;
  return normalizeAttendanceRecord(data);
}
