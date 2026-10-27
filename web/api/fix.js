import { method } from '../lib/server/method.js';
import { streamChatCompletion, setCors } from '../lib/server/llm.js';
import { getUserId } from '../lib/server/auth.js';
import { verificarLimite } from '../lib/server/ratelimit.js';

export const maxDuration = 60;

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const userId = await getUserId(req);
  if (!userId) {
    res.status(401).json({ error: 'No autenticado' });
    return;
  }
  if (!verificarLimite(userId)) {
    res.status(429).json({ error: 'Límite de solicitudes superado. Inténtalo de nuevo en un momento.' });
    return;
  }

  const { requisitos, etapa, informe, actual } = req.body || {};
  if (!requisitos || !requisitos.trim()) {
    res.status(400).json({ error: 'Falta el parámetro "requisitos"' });
    return;
  }
  const stage = method.stages.find((s) => s.id === etapa);
  if (!stage) {
    res.status(400).json({ error: `Etapa desconocida: ${etapa}` });
    return;
  }

  const system = `${stage.system}\n\n${stage.format}`;
  const user = `Corrige el modelo "${stage.nombre}" teniendo en cuenta el informe de validación de coherencia y los artefactos de las etapas anteriores. Mantén exactamente la estructura solicitada. No inventes actores, requisitos, casos de uso ni clases que no estén en esa entrada. Corrige las inconsistencias, omisiones y errores señalados.

Artefactos de las etapas anteriores:
${requisitos}

Modelo actual:
${actual || '(sin modelo previo)'}

Informe de validación de coherencia:
${informe || '(sin informe)'}`;

  await streamChatCompletion(res, { system, user });
}
