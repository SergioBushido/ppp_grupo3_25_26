import { supabase } from '../lib/supabase';

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
    .order('timestamp', { ascending: false });

  if (error) throw error;

  return data.map(record => ({
    ...record,
    employee_name: record.employees?.name
  }));
}
