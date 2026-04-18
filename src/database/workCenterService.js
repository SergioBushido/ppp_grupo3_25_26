import { supabase } from '../lib/supabase';

export async function getAllWorkCenters() {
  const { data, error } = await supabase
    .from('work_centers')
    .select('*')
    .order('name');

  if (error) throw error;
  return data || [];
}

export async function getWorkCenterById(id) {
  const { data, error } = await supabase
    .from('work_centers')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createWorkCenter(center) {
  const { data, error } = await supabase
    .from('work_centers')
    .insert([
      {
        name: center.name?.trim(),
        address: center.address?.trim() || null,
        latitude: center.latitude,
        longitude: center.longitude,
        radius_meters: center.radius_meters,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateWorkCenter(id, center) {
  const { data, error } = await supabase
    .from('work_centers')
    .update({
      name: center.name?.trim(),
      address: center.address?.trim() || null,
      latitude: center.latitude,
      longitude: center.longitude,
      radius_meters: center.radius_meters,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteWorkCenter(id) {
  const { error } = await supabase
    .from('work_centers')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
