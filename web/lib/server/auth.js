// Verificación de la sesión de Supabase (JWT HS256) en las funciones serverless.
// Valida la firma del token con el secreto del proyecto y devuelve el id del
// usuario autenticado (sub), o null si el token es inválido, está expirado o
// no corresponde a un usuario autenticado.
//
// Requiere la variable de entorno SUPABASE_JWT_SECRET (Project Settings -> API
// -> JWT Settings -> JWT Secret en el dashboard de Supabase).

import { createHmac, timingSafeEqual } from 'node:crypto';

function base64UrlDecode(str) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4;
  const padded = pad ? b64 + '='.repeat(4 - pad) : b64;
  return Buffer.from(padded, 'base64');
}

export function getUserId(req) {
  const secret = process.env.SUPABASE_JWT_SECRET || '';
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token || !secret) return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;

  try {
    const headerObj = JSON.parse(base64UrlDecode(h).toString('utf8'));
    if (headerObj.alg !== 'HS256') return null;

    const signingInput = `${h}.${p}`;
    const expected = createHmac('sha256', secret).update(signingInput).digest();
    const provided = base64UrlDecode(s);
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      return null;
    }

    const payload = JSON.parse(base64UrlDecode(p).toString('utf8'));
    if (payload.exp && Math.floor(Date.now() / 1000) >= payload.exp) return null;
    if (payload.role !== 'authenticated') return null;
    return payload.sub || null;
  } catch {
    return null;
  }
}
