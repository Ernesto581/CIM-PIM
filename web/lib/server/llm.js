// Utilidades compartidas por las funciones serverless de Vercel.

export function extractUml(markdown) {
  const codeBlock =
    markdown.match(/```plantuml\s*([\s\S]*?)```/i) ||
    markdown.match(/```(?:text|uml)?\s*(@startuml[\s\S]*?@enduml)\s*```/i);
  if (codeBlock) return codeBlock[1].trim();
  const inline = markdown.match(/(@startuml[\s\S]*?@enduml)/i);
  if (inline) return inline[1].trim();
  return '';
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

export function setCors(res) {
  for (const [k, v] of Object.entries(CORS)) res.setHeader(k, v);
}

function env(name, fallback) {
  return process.env[name] || fallback;
}

// Llama al LLM con streaming y va escribiendo el texto en `res`.
export async function streamChatCompletion(res, { system, user }) {
  const baseUrl = env('LLM_BASE_URL', 'https://opencode.ai/zen/go/v1').replace(/\/$/, '');
  const apiKey = env('LLM_API_KEY', '');
  const model = env('LLM_MODEL', 'deepseek-v4-pro');
  const reasoningEffort = env('LLM_REASONING_EFFORT', 'none');

  if (!apiKey) {
    res.status(500).json({ error: 'LLM_API_KEY no configurado' });
    return;
  }

  let upstream;
  try {
    upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        reasoning_effort: reasoningEffort,
        temperature: 0.1,
        stream: true,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ]
      })
    });
  } catch (e) {
    res.status(502).json({ error: 'No se pudo contactar el proveedor LLM' });
    return;
  }

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => '');
    res.status(502).json({ error: `Error del proveedor LLM (${upstream.status}): ${text.slice(0, 300)}` });
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'X-Accel-Buffering': 'no'
  });

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        const t = line.trim();
        if (!t.startsWith('data:')) continue;
        const data = t.slice(5).trim();
        if (!data || data === '[DONE]') continue;
        try {
          const json = JSON.parse(data);
          const delta = json?.choices?.[0]?.delta?.content;
          if (delta) res.write(delta);
        } catch {
          /* chunk no JSON: ignorar */
        }
      }
    }
  } catch (e) {
    /* stream interrumpido: terminar igualmente */
  }
  res.end();
}
