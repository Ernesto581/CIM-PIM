import { method } from './method.js';

export const maxDuration = 60;

function extractUml(markdown) {
  const codeBlock =
    markdown.match(/```plantuml\s*([\s\S]*?)```/i) ||
    markdown.match(/```(?:text|uml)?\s*(@startuml[\s\S]*?@enduml)\s*```/i);
  if (codeBlock) return codeBlock[1].trim();
  const inline = markdown.match(/(@startuml[\s\S]*?@enduml)/i);
  if (inline) return inline[1].trim();
  return '';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

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

  const baseUrl = (process.env.LLM_BASE_URL || 'https://opencode.ai/zen/go/v1').replace(/\/$/, '');
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL || 'deepseek-v4-pro';
  const reasoningEffort = process.env.LLM_REASONING_EFFORT || 'none';

  if (!apiKey) {
    res.status(500).json({ error: 'LLM_API_KEY no configurado en Vercel' });
    return;
  }

  const user = stage.prompt.replace('{requisitos}', requisitos);
  const system = `${stage.system}\n\n${stage.format}`;

  try {
    const upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        reasoning_effort: reasoningEffort,
        temperature: 0.1,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ]
      })
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      res.status(502).json({ error: `Error del proveedor LLM (${upstream.status}): ${errText.slice(0, 300)}` });
      return;
    }

    const json = await upstream.json();
    const content = json?.choices?.[0]?.message?.content || '';
    res.status(200).json({ markdown: content, uml: extractUml(content) });
  } catch (e) {
    res.status(502).json({ error: e?.message || 'Error al llamar al LLM' });
  }
}
