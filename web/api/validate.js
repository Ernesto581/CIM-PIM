import { streamChatCompletion, setCors } from '../lib/server/llm.js';
import { verificarCoherencia, formatearInforme } from '../lib/server/validar.js';
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

  // Verificación determinista (sin IA): consistencia interna entre artefactos.
  const informeDet = formatearInforme(verificarCoherencia(modelos));

  const user = `Revisa la coherencia entre los siguientes requisitos y los modelos UML del sistema. Ten en cuenta el resultado de la verificación determinista que se adjunta al final (no la repitas; céntrate en los errores semánticos y de modelado que las reglas no pueden detectar).\n\n--- REQUISITOS ---\n${requisitos}\n\n--- MODELOS ---\n${modelosTxt}\n\n--- VERIFICACIÓN DETERMINISTA ---\n${informeDet}`;

  await streamChatCompletion(res, { system, user, before: `${informeDet}\n\n` });
}
