const express = require('express');
const router = express.Router();
const method = require('../prompts/method.json');
const { generate } = require('../services/llm');
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
      return res.json({ data: cache.get(key), cached: true });
    }

    const user = stage.prompt.replace('{requisitos}', requisitos);
    const system = `${stage.system}\n\n${stage.format}`;

    const raw = await generate({ system, user });

    const data = { markdown: raw, uml: extractUml(raw) };
    cache.set(key, data);
    if (cache.size > 50) {
      cache.delete(cache.keys().next().value);
    }

    res.json({ data });
  } catch (e) {
    logger.error('generate error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
