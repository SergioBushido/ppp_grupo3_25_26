import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type ProvisionEmployeePayload = {
  name?: string;
  email?: string;
  role?: 'admin' | 'employee';
  available_days?: number;
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

function generateTemporaryPassword(length = 12) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const bytes = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join('');
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

    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Falta la cabecera de autorización.' }, 401);
    }

    const requesterClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const {
      data: { user: requester },
      error: requesterError,
    } = await requesterClient.auth.getUser();

    if (requesterError || !requester) {
      return jsonResponse({ error: 'Sesión no válida.' }, 401);
    }

    const { data: requesterEmployee, error: requesterEmployeeError } = await adminClient
      .from('employees')
      .select('id, role')
      .eq('auth_user_id', requester.id)
      .single();

    if (requesterEmployeeError || !requesterEmployee) {
      return jsonResponse({ error: 'No se encontró el perfil del usuario autenticado.' }, 403);
    }

    if (requesterEmployee.role !== 'admin') {
      return jsonResponse({ error: 'Solo los administradores pueden crear empleados.' }, 403);
    }

    const payload = (await request.json()) as ProvisionEmployeePayload;
    const name = payload.name?.trim();
    const email = payload.email?.trim().toLowerCase();
    const role = payload.role ?? 'employee';
    const availableDays = Number.isFinite(payload.available_days) ? Number(payload.available_days) : 22;

    if (!name || !email) {
      return jsonResponse({ error: 'Nombre y correo son obligatorios.' }, 400);
    }

    const { data: existingEmployee } = await adminClient
      .from('employees')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingEmployee) {
      return jsonResponse({ error: 'Ya existe un empleado con ese correo.' }, 409);
    }

    const temporaryPassword = generateTemporaryPassword();
    const { data: createdUser, error: createUserError } = await adminClient.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        name,
        role,
      },
    });

    if (createUserError || !createdUser.user) {
      return jsonResponse({ error: createUserError?.message || 'No se pudo crear el usuario Auth.' }, 400);
    }

    const { data: createdEmployee, error: createEmployeeError } = await adminClient
      .from('employees')
      .insert([{
        name,
        email,
        role,
        available_days: availableDays,
        requires_password_change: true,
        auth_user_id: createdUser.user.id,
      }])
      .select('id')
      .single();

    if (createEmployeeError || !createdEmployee) {
      await adminClient.auth.admin.deleteUser(createdUser.user.id);
      return jsonResponse({ error: createEmployeeError?.message || 'No se pudo crear el perfil de empleado.' }, 400);
    }

    return jsonResponse({
      employeeId: createdEmployee.id,
      authUserId: createdUser.user.id,
      temporaryPassword,
    });
  } catch (error) {
    console.error('Error provisioning employee', error);
    return jsonResponse({ error: 'Error interno al crear el empleado.' }, 500);
  }
});
