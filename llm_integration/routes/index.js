const express = require('express');
const router = express.Router();
const method = require('../prompts/method.json');
const { generate, stream, getModel } = require('../services/llm');
const { verificarCoherencia, formatearInforme } = require('../lib/validar');
const logger = require('../utils/logger');

const cache = new Map();

router.get('/method', (req, res) => {
  const stages = method.stages.map(({ id, nombre, nivel, orden, tipo, entrada, salida, descripcion }) => ({
    id,
    nombre,
    nivel,
    orden,
    tipo,
    entrada,
    salida,
    descripcion
  }));
  res.json({
    nombre: method.nombre,
    version: method.version,
    descripcion: method.descripcion,
    stages
  });
});

function extractUml(markdown) {
  const codeBlock =
    markdown.match(/```plantuml\s*([\s\S]*?)```/i) ||
    markdown.match(/```(?:text|uml)?\s*(@startuml[\s\S]*?@enduml)\s*```/i);
  if (codeBlock) return codeBlock[1].trim();
  const inline = markdown.match(/(@startuml[\s\S]*?@enduml)/i);
  if (inline) return inline[1].trim();
  return '';
}

// Generación con streaming (SSE).
router.post('/generate', async (req, res) => {
  try {
    const { requisitos, etapa } = req.body || {};
    if (!requisitos || !requisitos.trim()) {
      return res.status(400).json({ error: 'Falta el parámetro "requisitos"' });
    }
    const stage = method.stages.find((s) => s.id === etapa);
    if (!stage) {
      return res.status(400).json({ error: `Etapa desconocida: ${etapa}` });
    }

    const key = `${etapa}:${requisitos}`;
    if (cache.has(key)) {
      const cached = cache.get(key);
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.write(`data: ${JSON.stringify({ type: 'content', text: cached.markdown })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'done', uml: cached.uml })}\n\n`);
      res.end();
      return;
    }

    const system = `${stage.system}\n\n${stage.format}`;
    const user = stage.prompt.replace('{requisitos}', requisitos);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let full = '';
    for await (const delta of stream({ system, user })) {
      full += delta;
      res.write(`data: ${JSON.stringify({ type: 'content', text: delta })}\n\n`);
    }

    const uml = extractUml(full);
    const data = { markdown: full, uml };
    cache.set(key, data);
    if (cache.size > 50) cache.delete(cache.keys().next().value);

    res.write(`data: ${JSON.stringify({ type: 'done', uml })}\n\n`);
    res.end();
  } catch (e) {
    logger.error('generate error:', e.message);
    if (!res.headersSent) {
      res.status(500).json({ error: e.message });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', error: e.message })}\n\n`);
      res.end();
    }
  }
});

// Validación de coherencia.
router.post('/validate', async (req, res) => {
  try {
    const { requisitos, modelos } = req.body || {};
    if (!requisitos || !requisitos.trim()) {
      return res.status(400).json({ error: 'Falta el parámetro "requisitos"' });
    }

    const modelosTxt = (Array.isArray(modelos) ? modelos : [])
      .map((m) => `### ${m.nombre || 'Modelo'}\n${m.contenido || '(sin contenido)'}\n\nDiagrama PlantUML:\n${m.uml || '(sin diagrama)'}`)
      .join('\n\n');

    const informeDet = formatearInforme(verificarCoherencia(modelos));

    const system = 'Eres un revisor experto en UML y análisis de sistemas de información. Verifica la coherencia entre un documento de requisitos y los modelos UML generados a partir de él. Señala inconsistencias, omisiones y errores de modelado de forma objetiva y constructiva. Responde únicamente en Markdown con las secciones: ## Resumen, ## Inconsistencias, ## Omisiones, ## Errores de modelado, ## Recomendaciones.';

    const user = `Revisa la coherencia entre los siguientes requisitos y los modelos UML del sistema. Ten en cuenta el resultado de la verificación determinista que se adjunta al final (no la repitas; céntrate en los errores semánticos y de modelado que las reglas no pueden detectar).\n\n--- REQUISITOS ---\n${requisitos}\n\n--- MODELOS ---\n${modelosTxt}\n\n--- VERIFICACIÓN DETERMINISTA ---\n${informeDet}`;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    res.write(`data: ${JSON.stringify({ type: 'content', text: informeDet + '\n\n' })}\n\n`);

    const openai = require('../services/llm').getClient ? require('../services/llm').getClient() : null;
    // Usamos generate para la parte semántica (no streaming por simplicidad, pero devolvemos como un solo chunk)
    const { generate } = require('../services/llm');
    const semantico = await generate({ system, user });
    res.write(`data: ${JSON.stringify({ type: 'content', text: semantico })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  } catch (e) {
    logger.error('validate error:', e.message);
    if (!res.headersSent) {
      res.status(500).json({ error: e.message });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', error: e.message })}\n\n`);
      res.end();
    }
  }
});

// Corrección de modelos.
router.post('/fix', async (req, res) => {
  try {
    const { requisitos, etapa, informe, actual } = req.body || {};
    if (!requisitos || !requisitos.trim()) {
      return res.status(400).json({ error: 'Falta el parámetro "requisitos"' });
    }
    const stage = method.stages.find((s) => s.id === etapa);
    if (!stage) {
      return res.status(400).json({ error: `Etapa desconocida: ${etapa}` });
    }

    const system = `${stage.system}\n\n${stage.format}`;
    const user = `Corrige el modelo "${stage.nombre}" teniendo en cuenta el informe de validación de coherencia y los artefactos de las etapas anteriores. Mantén exactamente la estructura solicitada. No inventes actores, requisitos, casos de uso ni clases que no estén en esa entrada. Corrige las inconsistencias, omisiones y errores señalados.

Artefactos de las etapas anteriores:
${requisitos}

Modelo actual:
${actual || '(sin modelo previo)'}

Informe de validación de coherencia:
${informe || '(sin informe)'}`;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let full = '';
    for await (const delta of stream({ system, user })) {
      full += delta;
      res.write(`data: ${JSON.stringify({ type: 'content', text: delta })}\n\n`);
    }

    const uml = extractUml(full);
    res.write(`data: ${JSON.stringify({ type: 'done', uml })}\n\n`);
    res.end();
  } catch (e) {
    logger.error('fix error:', e.message);
    if (!res.headersSent) {
      res.status(500).json({ error: e.message });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', error: e.message })}\n\n`);
      res.end();
    }
  }
});

module.exports = router;