import { supabase } from '../lib/supabase';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { getLocalDateString } from '../lib/dateService';

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
        name, 
        available_days
      )
    `)
    .order('requested_at', { ascending: false });
  
  if (error) throw error;
  
  return data.map(v => ({
    ...v,
    employee_name: v.employees?.name,
    employee_available_days: v.employees?.available_days
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
  const today = getLocalDateString();
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


// Editar vacaciones aprobadas de forma transaccional (RPC backend)
export async function editRequestVacation({ vacation_id, start_date, end_date }) {
  const { data, error } = await supabase.rpc('edit_vacation_transactional', {
    p_vacation_id: vacation_id,
    p_new_start_date: start_date,
    p_new_end_date: end_date,
  });

  if (error) throw error;
  return data;
}

export async function approveVacation(vacationId) {
  const { data, error } = await supabase.rpc('approve_vacation_transactional', {
    p_vacation_id: vacationId,
  });

  if (error) throw error;
  return data;
}


// Rechazar cuando la solicitud esta pendiente
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


// Cancelar la vacacion cuando esta aprobada
export async function cancelVacation(vacation) {
  const vacationId = typeof vacation === 'object' ? vacation?.id : vacation;
  const { data, error } = await supabase.rpc('cancel_vacation_transactional', {
    p_vacation_id: vacationId,
  });

  if (error) throw error;
  return data;
}

// Reactivar la vacación cuando esta rechazada (rejected)
export async function reactiveVacation(vacationId) {

  const { error: vacationError } = await supabase
    .from('vacations')
    .update({ 
      status: 'pending', 
      reviewed_at: new Date().toISOString() 
    })
    .eq('id', vacationId);
  
  if (vacationError) throw vacationError;
}

// Borrar la vacacion cuando la solicitud vacaciones esta rechazada (rejected)
export async function deleteVacation(vacationId) {
  const { error } = await supabase
    .from('vacations')
    .delete()
    .eq('id', vacationId);
  
  if (error) throw error;
}
