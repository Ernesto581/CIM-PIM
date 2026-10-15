// Validación de la sesión de Supabase en las funciones serverless.
//
// Se valida el token contra el servicio de autenticación de Supabase
// (auth.getUser). De este modo funciona con cualquier algoritmo de firma
// (HS256 heredado o claves asimétricas ES256/RS256) sin depender del secreto
// JWT. Reutiliza la URL y la clave pública ya configuradas para el cliente
// (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY), o SUPABASE_URL / SUPABASE_ANON_KEY
// si se definen aparte.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

let client = null;
function getClient() {
  if (!client && SUPABASE_URL && SUPABASE_ANON_KEY) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }
  return client;
}

// Devuelve el id del usuario autenticado, o null si el token falta o no es válido.
export async function getUserId(req) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return null;

  const supabase = getClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user.id;
  } catch {
    return null;
  }
}
