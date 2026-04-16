import { supabase } from '../lib/supabase';

const EMPLOYEE_PROFILE_COLUMNS = 'id, name, email, role, available_days, requires_password_change, auth_user_id';

export async function getAllEmployees() {
  const { data, error } = await supabase
    .from('employees')
    .select(EMPLOYEE_PROFILE_COLUMNS)
    .order('name');
  
  if (error) throw error;
  return data;
}

export async function getEmployeeById(id) {
  const { data, error } = await supabase
    .from('employees')
    .select(EMPLOYEE_PROFILE_COLUMNS)
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}

export async function getEmployeeByAuthUserId(authUserId) {
  const { data, error } = await supabase
    .from('employees')
    .select(EMPLOYEE_PROFILE_COLUMNS)
    .eq('auth_user_id', authUserId)
    .single();

  if (error) throw error;
  return data;
}

export async function signInWithPassword(email, password) {
  const normalizedEmail = email.toLowerCase().trim();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function updateAuthPassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function sendPasswordRecovery(email) {
  const normalizedEmail = email.toLowerCase().trim();
  const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail);
  if (error) throw error;
}

export async function createEmployee({ name, email, role = 'employee', available_days = 22 }) {
  const normalizedEmail = email.toLowerCase().trim();
  const { data, error } = await supabase.functions.invoke('provision-employee', {
    body: {
      name,
      email: normalizedEmail,
      role,
      available_days,
    },
  });

  if (error) throw error;
  return data;
}

export async function updateEmployee(id, fields) {
  const { password, ...safeFields } = fields;
  const { error } = await supabase
    .from('employees')
    .update(safeFields)
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

export async function clearPasswordChangeRequirement(employeeId) {
  const { error } = await supabase
    .from('employees')
    .update({
      requires_password_change: false,
    })
    .eq('id', employeeId);
    
  if (error) throw error;
}

export async function markPasswordChangeRequired(employeeId) {
  const { error } = await supabase
    .from('employees')
    .update({
      requires_password_change: true,
    })
    .eq('id', employeeId);
    
  if (error) throw error;
}

export async function changePassword(employeeId, newPassword) {
  await updateAuthPassword(newPassword);
  await clearPasswordChangeRequirement(employeeId);
}

export async function resetEmployeePassword(employeeId, email) {
  await markPasswordChangeRequired(employeeId);
  await sendPasswordRecovery(email);
}

