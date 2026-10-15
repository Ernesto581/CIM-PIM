// Limitador de frecuencia simple en memoria, por usuario autenticado.
// Cada instancia de la función serverless mantiene su propia ventana; es una
// protección de "mejor esfuerzo" contra abusos, que se suma a los límites de la
// plataforma (Vercel) y a los que aplica Supabase Auth sobre el inicio de sesión.

const ventanas = new Map();

const MAX = parseInt(process.env.RATE_LIMIT_MAX || '20', 10);
const VENTANA_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);

export function verificarLimite(userId) {
  const ahora = Date.now();
  const key = userId || 'anon';
  let w = ventanas.get(key);
  if (!w || ahora - w.inicio >= VENTANA_MS) {
    w = { inicio: ahora, count: 0 };
    ventanas.set(key, w);
  }
  w.count += 1;

  // Limpieza ocasional para que el mapa no crezca sin control.
  if (ventanas.size > 5000) {
    const limite = ahora - VENTANA_MS;
    for (const [k, v] of ventanas) {
      if (v.inicio < limite) ventanas.delete(k);
    }
  }

  return w.count <= MAX;
}
