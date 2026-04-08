import { supabase } from '../lib/supabase';

export async function getAllEmployees() {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .order('name');
  
  if (error) throw error;
  return data;
}

export async function getEmployeeById(id) {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}

export async function loginEmployee(email, password) {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .eq('password', password)
    .single();
  
  if (error) return null; // Retornar null si no hay coincidencia (comportamiento previo)
  return data;
}

export async function createEmployee({ name, email, password, role = 'employee', available_days = 22 }) {
  const { data, error } = await supabase
    .from('employees')
    .insert([{ name, email: email.toLowerCase().trim(), password, role, available_days }])
    .select()
    .single();
  
  if (error) throw error;
  return data.id;
}

export async function updateEmployee(id, fields) {
  const { error } = await supabase
    .from('employees')
    .update(fields)
    .eq('id', id);
  
  if (error) throw error;
}

export async function updateAvailableDays(employeeId, days) {
  const { error } = await supabase
    .from('employees')
    .update({ available_days: days })
    .eq('id', employeeId);
  
  if (error) throw error;
}

export async function deleteEmployee(id) {
  const { error } = await supabase
    .from('employees')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

export async function changePassword(employeeId, currentPassword, newPassword) {
  // First verify the current password
  const { data: user, error: fetchError } = await supabase
    .from('employees')
    .select('password')
    .eq('id', employeeId)
    .single();
    
  if (fetchError || !user) throw new Error('Usuario no encontrado');
  
  if (user.password !== currentPassword) {
    throw new Error('La contraseña actual es incorrecta');
  }

  // If ok, update to new
  const { error } = await supabase
    .from('employees')
    .update({ password: newPassword })
    .eq('id', employeeId);
    
  if (error) throw new Error('Error al actualizar la base de datos');
}

