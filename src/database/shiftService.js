import { supabase } from '../lib/supabase';
import { getLocalDateString } from '../lib/dateService';

export const SHIFT_TEMPLATES = {
  morning: { start_time: '08:00', end_time: '16:00' },
  afternoon: { start_time: '16:00', end_time: '00:00' },
  night: { start_time: '00:00', end_time: '08:00' },
};

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
  const today = getLocalDateString();
  const { data, error } = await supabase
    .from('shifts')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('date', today)
    .maybeSingle();
  
  if (error) throw error;
  return data;
}

export async function createShift({ employee_id, date, shift_type, start_time, end_time, notes = null }) {
  let finalStart = start_time;
  let finalEnd = end_time;

  if (!finalStart || !finalEnd) {
    const template = SHIFT_TEMPLATES[shift_type];
    if (template) {
      finalStart = template.start_time;
      finalEnd = template.end_time;
    }
  }

  const { data, error } = await supabase
    .from('shifts')
    .insert([{ employee_id, date, shift_type, start_time: finalStart, end_time: finalEnd, notes }])
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
  const payload = shifts.map(({ employee_id, date, shift_type, start_time, end_time, notes }) => {
    let finalStart = start_time;
    let finalEnd = end_time;

    if (!finalStart || !finalEnd) {
      const template = SHIFT_TEMPLATES[shift_type];
      if (template) {
        finalStart = template.start_time;
        finalEnd = template.end_time;
      }
    }

    const payloadItem = {
      employee_id,
      date,
      shift_type,
    };
    if (finalStart !== undefined) payloadItem.start_time = finalStart;
    if (finalEnd !== undefined) payloadItem.end_time = finalEnd;
    if (notes !== undefined) payloadItem.notes = notes;

    return payloadItem;
  });

  const { data, error } = await supabase
    .from('shifts')
    .insert(payload);
  
  if (error) throw error;
  return data;
}


