// Entrada acumulativa de la metodología CIM→PIM.
// Cada etapa recibe los artefactos de las etapas anteriores, no solo la idea original.
// Coincide con la Tabla 3 y con la cadena: requisitos → casos de uso;
// requisitos + casos de uso → clases; casos de uso + clases → secuencia y actividades.
// Los requisitos se incluyen también en secuencia y actividades para no perder
// identificadores RF ni el alcance ya acotado por el analista.

export const STAGE_INPUTS = {
  requisitos: [],
  casos_uso: ['requisitos'],
  clases: ['requisitos', 'casos_uso'],
  secuencia: ['requisitos', 'casos_uso', 'clases'],
  actividades: ['requisitos', 'casos_uso', 'clases']
};

export function artifactText(etapa) {
  const content = (etapa?.contenido || '').trim();
  const uml = (etapa?.uml || '').trim();
  if (!content && !uml) return '';
  if (uml && !content.includes('@startuml')) {
    return `${content}\n\nDiagrama PlantUML:\n\`\`\`plantuml\n${uml}\n\`\`\``.trim();
  }
  return content || uml;
}

export function buildStageInput(stageId, stages, etapas, descripcion) {
  const list = stages || [];
  const index = list.findIndex((s) => s.id === stageId);
  if (index < 0) return { error: 'Etapa desconocida.' };

  if (stageId === 'requisitos' || index === 0) {
    const idea = (descripcion || '').trim();
    if (!idea) return { error: 'Escribe la idea del sistema antes de generar los requisitos.' };
    return { text: idea };
  }

  const ids = STAGE_INPUTS[stageId] || list.slice(0, index).map((s) => s.id);
  const byId = new Map(list.map((s) => [s.id, s]));
  const missing = [];
  const parts = [];

  for (const id of ids) {
    const prev = byId.get(id);
    const nombre = prev?.nombre || id;
    const text = artifactText((etapas || []).find((e) => e.id === id));
    if (!text) missing.push(nombre);
    else parts.push(`## ${nombre}\n${text}`);
  }

  if (missing.length) {
    return {
      error: `Genera y guarda antes: ${missing.join(', ')}. Cada etapa usa los artefactos anteriores.`
    };
  }

  return { text: parts.join('\n\n') };
}
