import { supabase } from '../lib/supabase';

const EMPLOYEE_PROFILE_COLUMNS = 'id, name, email, role, available_days, requires_password_change, auth_user_id, avatar_url, attendance_policy, assigned_work_center_id';
const AVATAR_BUCKET = 'avatars';
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

function getAvatarExtension(mimeType) {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'jpg';
}

async function createSignedAvatarUrl(path) {
  if (!path) return null;

  const { data, error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 7);

  if (error) throw error;
  return data?.signedUrl || null;
}

async function hydrateEmployeeProfile(profile) {
  if (!profile) return profile;

  const avatarPath = profile.avatar_url || null;
  if (!avatarPath) {
    return {
      ...profile,
      avatar_storage_path: null,
      avatar_url: null,
    };
  }

  try {
    const signedUrl = await createSignedAvatarUrl(avatarPath);
    return {
      ...profile,
      avatar_storage_path: avatarPath,
      avatar_url: signedUrl,
    };
  } catch (error) {
    console.warn('No se pudo firmar la URL del avatar', error);
    return {
      ...profile,
      avatar_storage_path: avatarPath,
      avatar_url: null,
    };
  }
}

export async function getAllEmployees() {
  const { data, error } = await supabase
    .from('employees')
    .select(EMPLOYEE_PROFILE_COLUMNS)
    .order('name');
  
  if (error) throw error;
  return Promise.all((data || []).map(hydrateEmployeeProfile));
}

export async function getEmployeeById(id) {
  const { data, error } = await supabase
    .from('employees')
    .select(EMPLOYEE_PROFILE_COLUMNS)
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return hydrateEmployeeProfile(data);
}

export async function getEmployeeByAuthUserId(authUserId) {
  const { data, error } = await supabase
    .from('employees')
    .select(EMPLOYEE_PROFILE_COLUMNS)
    .eq('auth_user_id', authUserId)
    .single();

  if (error) throw error;
  return hydrateEmployeeProfile(data);
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

export async function uploadMyAvatar({ authUserId, asset, currentAvatarPath }) {
  if (!authUserId) {
    throw new Error('No hay una sesion valida para subir la imagen.');
  }

  if (!asset?.uri) {
    throw new Error('No se ha seleccionado ninguna imagen valida.');
  }

  if (asset.fileSize && asset.fileSize > MAX_AVATAR_BYTES) {
    throw new Error('La imagen supera el tamano maximo permitido de 2 MB.');
  }

  const fileExtension = getAvatarExtension(asset.mimeType);
  const contentType = asset.mimeType || 'image/jpeg';
  const filePath = `${authUserId}/avatar-${Date.now()}.${fileExtension}`;

  const response = await fetch(asset.uri);
  const arrayBuffer = await response.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(filePath, arrayBuffer, {
      cacheControl: '3600',
      contentType,
      upsert: false,
    });

  if (uploadError) throw uploadError;

  try {
    const { error: profileError } = await supabase.rpc('update_my_avatar_url', {
      next_avatar_url: filePath,
    });

    if (profileError) throw profileError;

    if (currentAvatarPath && currentAvatarPath !== filePath) {
      await supabase.storage.from(AVATAR_BUCKET).remove([currentAvatarPath]);
    }
  } catch (error) {
    await supabase.storage.from(AVATAR_BUCKET).remove([filePath]);
    throw error;
  }
}

export async function removeMyAvatar(currentAvatarPath) {
  const { error } = await supabase.rpc('update_my_avatar_url', {
    next_avatar_url: null,
  });

  if (error) throw error;

  if (currentAvatarPath) {
    const { error: storageError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .remove([currentAvatarPath]);

    if (storageError) {
      console.warn('No se pudo borrar el archivo antiguo del avatar', storageError);
    }
  }
}

