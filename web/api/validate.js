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

  const { requisitos, modelos } = req.body || {};
  if (!requisitos || !requisitos.trim()) {
    res.status(400).json({ error: 'Falta el parámetro "requisitos"' });
    return;
  }

  const modelosTxt = (Array.isArray(modelos) ? modelos : [])
    .map(
      (m) =>
        `### ${m.nombre || 'Modelo'}\n${m.contenido || '(sin contenido)'}\n\nDiagrama PlantUML:\n${m.uml || '(sin diagrama)'}`
    )
    .join('\n\n');

  const system =
    'Eres un revisor experto en UML y análisis de sistemas de información. Verifica la coherencia entre un documento de requisitos y los modelos UML generados a partir de él. Señala inconsistencias, omisiones y errores de modelado de forma objetiva y constructiva. Responde únicamente en Markdown con las secciones: ## Resumen, ## Inconsistencias, ## Omisiones, ## Errores de modelado, ## Recomendaciones.';

  const user = `Revisa la coherencia entre los siguientes requisitos y los modelos UML del sistema.\n\n--- REQUISITOS ---\n${requisitos}\n\n--- MODELOS ---\n${modelosTxt}`;

  await streamChatCompletion(res, { system, user });
}
