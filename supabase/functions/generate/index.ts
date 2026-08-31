import { method } from './method.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

function extractUml(markdown: string): string {
  const codeBlock =
    markdown.match(/```plantuml\s*([\s\S]*?)```/i) ||
    markdown.match(/```(?:text|uml)?\s*(@startuml[\s\S]*?@enduml)\s*```/i);
  if (codeBlock) return codeBlock[1].trim();
  const inline = markdown.match(/(@startuml[\s\S]*?@enduml)/i);
  if (inline) return inline[1].trim();
  return '';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    const body = await req.json();
    const requisitos: string = (body?.requisitos || '').toString();
    const etapa: string = (body?.etapa || '').toString();

    if (!requisitos.trim()) {
      return new Response(JSON.stringify({ error: 'Falta el parámetro "requisitos"' }), {
        status: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' }
      });
    }

    const stage = method.stages.find((s) => s.id === etapa);
    if (!stage) {
      return new Response(JSON.stringify({ error: `Etapa desconocida: ${etapa}` }), {
        status: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' }
      });
    }

    const baseUrl = Deno.env.get('LLM_BASE_URL') || 'https://api.openai.com/v1';
    const apiKey = Deno.env.get('LLM_API_KEY');
    const model = Deno.env.get('LLM_MODEL') || 'gpt-4o';

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'LLM_API_KEY no está configurado en la función' }), {
        status: 500,
        headers: { ...CORS, 'Content-Type': 'application/json' }
      });
    }

    const user = stage.prompt.replace('{requisitos}', requisitos);
    const system = `${stage.system}\n\n${stage.format}`;

    const upstream = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ]
      })
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      return new Response(
        JSON.stringify({ error: `Error del proveedor LLM (${upstream.status}): ${errText.slice(0, 300)}` }),
        { status: 502, headers: { ...CORS, 'Content-Type': 'application/json' } }
      );
    }

    const json = await upstream.json();
    const content: string = json?.choices?.[0]?.message?.content || '';

    return new Response(JSON.stringify({ markdown: content, uml: extractUml(content) }), {
      headers: { ...CORS, 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message || 'Error interno' }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' }
    });
  }
});
