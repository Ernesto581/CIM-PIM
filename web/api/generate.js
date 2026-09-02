import { method } from '../lib/server/method.js';
import { streamChatCompletion, setCors } from '../lib/server/llm.js';

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

  const { requisitos, etapa } = req.body || {};
  if (!requisitos || !requisitos.trim()) {
    res.status(400).json({ error: 'Falta el parámetro "requisitos"' });
    return;
  }
  const stage = method.stages.find((s) => s.id === etapa);
  if (!stage) {
    res.status(400).json({ error: `Etapa desconocida: ${etapa}` });
    return;
  }

  const user = stage.prompt.replace('{requisitos}', requisitos);
  const system = `${stage.system}\n\n${stage.format}`;

  await streamChatCompletion(res, { system, user });
}
