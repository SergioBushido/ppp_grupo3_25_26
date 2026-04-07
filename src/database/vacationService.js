import { supabase } from '../lib/supabase';
import { differenceInCalendarDays, parseISO } from 'date-fns';

export async function getVacationsByEmployee(employeeId) {
  const { data, error } = await supabase
    .from('vacations')
    .select('*')
    .eq('employee_id', employeeId)
    .order('requested_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function getAllVacations() {
  const { data, error } = await supabase
    .from('vacations')
    .select(`
      *,
      employees (
        name
      )
    `)
    .order('requested_at', { ascending: false });
  
  if (error) throw error;
  
  return data.map(v => ({
    ...v,
    employee_name: v.employees?.name
  }));
}

export async function getAllPendingVacations() {
  const { data, error } = await supabase
    .from('vacations')
    .select(`
      *,
      employees (
        name
      )
    `)
    .eq('status', 'pending')
    .order('requested_at', { ascending: true });
  
  if (error) throw error;
  
  return data.map(v => ({
    ...v,
    employee_name: v.employees?.name
  }));
}

export async function getUpcomingVacationsForEmployee(employeeId) {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('vacations')
    .select('*')
    .eq('employee_id', employeeId)
    .gte('start_date', today)
    .eq('status', 'approved')
    .order('start_date', { ascending: true })
    .limit(3);
  
  if (error) throw error;
  return data;
}

export async function requestVacation({ employee_id, start_date, end_date, reason = null }) {
  const days = differenceInCalendarDays(parseISO(end_date), parseISO(start_date)) + 1;

  // Check available days
  const { data: emp, error: empError } = await supabase
    .from('employees')
    .select('available_days')
    .eq('id', employee_id)
    .single();

  if (empError || !emp) throw new Error('Empleado no encontrado');
  
  if (emp.available_days < days) {
    throw new Error(`No tienes suficientes días disponibles. Necesitas ${days}, tienes ${emp.available_days}.`);
  }

  const { data, error } = await supabase
    .from('vacations')
    .insert([{ employee_id, start_date, end_date, reason }])
    .select()
    .single();
  
  if (error) throw error;
  return data.id;
}

export async function approveVacation(vacationId) {
  // Obtener detalles de la vacación
  const { data: vacation, error: vError } = await supabase
    .from('vacations')
    .select('*')
    .eq('id', vacationId)
    .single();

  if (vError || !vacation) throw new Error('Solicitud no encontrada');

  const days = differenceInCalendarDays(parseISO(vacation.end_date), parseISO(vacation.start_date)) + 1;

  // Actualizar estado de la vacación
  const { error: updateVError } = await supabase
    .from('vacations')
    .update({ 
      status: 'approved', 
      reviewed_at: new Date().toISOString() 
    })
    .eq('id', vacationId);

  if (updateVError) throw updateVError;

  // Restar días al empleado
  const { error: updateEmpError } = await supabase.rpc('decrement_available_days', {
    emp_id: vacation.employee_id,
    days_to_subtract: days
  });

  // Si el RPC falla (porque quizás no está creado), intentamos actualización manual
  if (updateEmpError) {
    const { data: empData } = await supabase.from('employees').select('available_days').eq('id', vacation.employee_id).single();
    await supabase.from('employees').update({ available_days: empData.available_days - days }).eq('id', vacation.employee_id);
  }
}

export async function rejectVacation(vacationId) {
  const { error } = await supabase
    .from('vacations')
    .update({ 
      status: 'rejected', 
      reviewed_at: new Date().toISOString() 
    })
    .eq('id', vacationId);
  
  if (error) throw error;
}

export async function deleteVacation(vacationId) {
  const { error } = await supabase
    .from('vacations')
    .delete()
    .eq('id', vacationId);
  
  if (error) throw error;
}
