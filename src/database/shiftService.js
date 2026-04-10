import { supabase } from '../lib/supabase';

export async function getShiftsByEmployee(employeeId) {
  const { data, error } = await supabase
    .from('shifts')
    .select('*')
    .eq('employee_id', employeeId)
    .order('date');
  
  if (error) throw error;
  return data;
}

export async function getShiftsForMonth(year, month) {
  const monthStr = String(month).padStart(2, '0');
  const startDate = `${year}-${monthStr}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${monthStr}-${lastDay}`;

  const { data, error } = await supabase
    .from('shifts')
    .select(`
      *,
      employees (
        name,
        role
      )
    `)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date');
  
  if (error) throw error;
  
  // Mapear para mantener compatibilidad con la UI (e.name -> employee_name)
  return data.map(shift => ({
    ...shift,
    employee_name: shift.employees?.name,
    employee_role: shift.employees?.role
  }));
}

export async function getShiftsByDate(date) {
  const { data, error } = await supabase
    .from('shifts')
    .select(`
      *,
      employees (
        name
      )
    `)
    .eq('date', date);
  
  if (error) throw error;
  
  return data.map(shift => ({
    ...shift,
    employee_name: shift.employees?.name
  }));
}

export async function getTodayShiftForEmployee(employeeId) {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('shifts')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('date', today)
    .maybeSingle();
  
  if (error) throw error;
  return data;
}

export async function createShift({ employee_id, date, shift_type, notes = null }) {
  const { data, error } = await supabase
    .from('shifts')
    .insert([{ employee_id, date, shift_type, notes }])
    .select()
    .single();
  
  if (error) throw error;
  return data.id;
}

export async function updateShift(id, fields) {
  const { error } = await supabase
    .from('shifts')
    .update(fields)
    .eq('id', id);
  
  if (error) throw error;
}

export async function deleteShift(id) {
  const { error } = await supabase
    .from('shifts')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

export async function deleteShiftsForEmployeeOnDate(employeeId, date) {
  const { error } = await supabase
    .from('shifts')
    .delete()
    .eq('employee_id', employeeId)
    .eq('date', date);
  
  if (error) throw error;
}

export async function getShiftsInRange(startDate, endDate) {
  const { data, error } = await supabase
    .from('shifts')
    .select(`
      *,
      employees (
        name
      )
    `)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date');
  
  if (error) throw error;
  
  return data.map(shift => ({
    ...shift,
    employee_name: shift.employees?.name
  }));
}

export async function bulkCreateShifts(shifts) {
  const { data, error } = await supabase
    .from('shifts')
    .insert(shifts.map(({ employee_id, date, shift_type, notes }) => ({
      employee_id,
      date,
      shift_type,
      notes
    })));
  
  if (error) throw error;
  return data;
}


