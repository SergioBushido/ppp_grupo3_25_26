import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type DeleteEmployeePayload = {
  employeeId?: number;
  authUserId?: string;
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Método no permitido.' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return jsonResponse({ error: 'Faltan variables de entorno de Supabase en la función.' }, 500);
    }

    // ── Verify requester identity ──
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Falta la cabecera de autorización.' }, 401);
    }

    const requesterClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const {
      data: { user: requester },
      error: requesterError,
    } = await requesterClient.auth.getUser();

    if (requesterError || !requester) {
      return jsonResponse({ error: 'Sesión no válida.' }, 401);
    }

    // ── Verify requester is admin ──
    const { data: requesterEmployee, error: requesterEmployeeError } = await adminClient
      .from('employees')
      .select('id, role')
      .eq('auth_user_id', requester.id)
      .single();

    if (requesterEmployeeError || !requesterEmployee) {
      return jsonResponse({ error: 'No se encontró el perfil del usuario autenticado.' }, 403);
    }

    if (requesterEmployee.role !== 'admin') {
      return jsonResponse({ error: 'Solo los administradores pueden eliminar empleados.' }, 403);
    }

    // ── Parse payload ──
    const payload = (await request.json()) as DeleteEmployeePayload;
    const employeeId = payload.employeeId;
    const authUserId = payload.authUserId;

    if (!employeeId) {
      return jsonResponse({ error: 'Se requiere el ID del empleado.' }, 400);
    }

    // ── Prevent self-deletion ──
    if (requesterEmployee.id === employeeId) {
      return jsonResponse({ error: 'No puedes eliminar tu propia cuenta de administrador.' }, 400);
    }

    // ── Fetch target employee ──
    const { data: targetEmployee, error: targetError } = await adminClient
      .from('employees')
      .select('id, auth_user_id, avatar_url')
      .eq('id', employeeId)
      .single();

    if (targetError || !targetEmployee) {
      return jsonResponse({ error: 'No se encontró el empleado a eliminar.' }, 404);
    }

    const targetAuthUserId = authUserId || targetEmployee.auth_user_id;

    // ── Clean up avatar from Storage ──
    if (targetEmployee.avatar_url) {
      try {
        await adminClient.storage.from('avatars').remove([targetEmployee.avatar_url]);
      } catch (avatarError) {
        console.warn('No se pudo eliminar el avatar del storage:', avatarError);
        // Non-blocking: continue with deletion even if avatar cleanup fails
      }
    }

    // ── Delete employee record from public.employees ──
    const { error: deleteEmployeeError } = await adminClient
      .from('employees')
      .delete()
      .eq('id', employeeId);

    if (deleteEmployeeError) {
      return jsonResponse({ error: deleteEmployeeError.message || 'No se pudo eliminar el perfil del empleado.' }, 400);
    }

    // ── Delete Auth user ──
    if (targetAuthUserId) {
      const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(targetAuthUserId);

      if (deleteAuthError) {
        console.error('Empleado eliminado pero falló la limpieza de Auth:', deleteAuthError);
        return jsonResponse({
          warning: 'El empleado fue eliminado pero no se pudo borrar su usuario de autenticación. Contacta al administrador del sistema.',
          employeeId,
        });
      }
    }

    return jsonResponse({
      success: true,
      employeeId,
      authUserDeleted: !!targetAuthUserId,
    });
  } catch (error) {
    console.error('Error deleting employee:', error);
    return jsonResponse({ error: 'Error interno al eliminar el empleado.' }, 500);
  }
});
