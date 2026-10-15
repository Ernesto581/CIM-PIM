// Verificación determinista de coherencia entre los artefactos del PIM.
//
// Reglas mecánicas (sin inteligencia artificial) que detectan omisiones e
// inconsistencias internas entre los modelos generados: comparan actores,
// casos de uso, clases y participantes de secuencia entre sí. Complementa
// la revisión semántica que realiza el modelo de lenguaje en /api/validate.

function norm(name) {
  return String(name || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function stripQuotes(s) {
  const t = String(s || '').trim();
  return t.replace(/^["']|["']$/g, '').trim();
}

// Limpia un identificador: quita comillas y el cuerpo de la clase "{ ... }".
function cleanName(s) {
  return stripQuotes(s).replace(/\s*\{.*$/, '').trim();
}

function splitAlias(token) {
  // "Nombre" as Alias  ->  { name, alias }
  const t = String(token || '').trim();
  const m = t.match(/^(?:"([^"]+)"|([\w.\- ]+?))\s+as\s+(\w+)\s*$/i);
  if (m) return { name: cleanName(m[1] ?? m[2] ?? ''), alias: m[3] };
  return { name: cleanName(t), alias: null };
}

function uniqueNames(list) {
  const map = new Map();
  for (const n of list) {
    const k = norm(n);
    if (k && !map.has(k)) map.set(k, cleanName(n));
  }
  return [...map.values()];
}

// --- Extracción de elementos a partir de código PlantUML ---

function extractActors(uml) {
  const out = [];
  for (const line of String(uml || '').split('\n')) {
    const t = line.trim();
    const m = t.match(/^actor\s+(.+)$/i);
    if (m) out.push(splitAlias(m[1]).name);
  }
  return uniqueNames(out);
}

function extractUseCases(uml) {
  const out = [];
  for (const line of String(uml || '').split('\n')) {
    const t = line.trim();
    const m = t.match(/^usecase\s+(.+)$/i);
    if (m) {
      out.push(splitAlias(m[1]));
      continue;
    }
    // (Nombre) tanto declarado suelto como en una relación actor --> (Nombre)
    const g = t.match(/\(([^)]+)\)/g);
    if (g) for (const gr of g) out.push({ name: cleanName(gr.slice(1, -1)), alias: null });
  }
  const seen = new Set();
  const res = [];
  for (const cu of out) {
    const k = norm(cu.name);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    res.push(cu);
  }
  return res;
}

function extractClasses(uml) {
  const out = [];
  for (const line of String(uml || '').split('\n')) {
    const t = line.trim();
    const m = t.match(/^(?:abstract\s+)?(?:class|interface|enum|entity)\s+(.+)$/i);
    if (m) out.push(splitAlias(m[1]).name);
  }
  return uniqueNames(out);
}

function extractSequence(uml) {
  const decls = new Set();
  const messages = new Set();
  for (const line of String(uml || '').split('\n')) {
    const t = line.trim();
    const d = t.match(/^(?:actor|participant|boundary|control|entity|database|collections|queue)\s+(.+)$/i);
    if (d) {
      decls.add(norm(splitAlias(d[1]).name));
      continue;
    }
    const c = t.match(/^(?:create|destroy)\s+(.+)$/i);
    if (c) {
      messages.add(norm(cleanName(c[1])));
      continue;
    }
    // mensajes:  A -> B : ...  /  A --> B  (operandos con o sin comillas)
    const msg = t.match(/^(?:"([^"]+)"|([\w.\-]+))\s*(?:->>|-->|->|<<-|<--|<-)\s*(?:"([^"]+)"|([\w.\-]+))(?:\s*:.*)?$/);
    if (msg) {
      const left = msg[1] ?? msg[2];
      const right = msg[3] ?? msg[4];
      if (left) messages.add(norm(left));
      if (right) messages.add(norm(right));
    }
  }
  return { participants: new Set([...decls, ...messages]) };
}

function extractSequenceActors(uml) {
  const out = [];
  for (const line of String(uml || '').split('\n')) {
    const t = line.trim();
    const m = t.match(/^actor\s+(.+)$/i);
    if (m) out.push(splitAlias(m[1]).name);
  }
  return uniqueNames(out);
}

function appearsInRelation(uml, cu) {
  const keys = [norm(cu.name)];
  if (cu.alias) keys.push(norm(cu.alias));
  for (const line of String(uml || '').split('\n')) {
    if (!/(-->|\.\.>|<\|--|--\|>|<--|->)/.test(line)) continue;
    const nl = norm(line);
    if (keys.some((k) => k && nl.includes(k))) return true;
  }
  return false;
}

// --- Reglas de verificación ---

const ETAPAS_PLANTUML = {
  casos_uso: 'Modelo de Casos de Uso',
  clases: 'Modelo de Clases',
  secuencia: 'Modelo de Secuencia',
  actividades: 'Modelo de Actividades'
};

export function verificarCoherencia(modelos) {
  const byId = {};
  for (const m of modelos || []) {
    if (m && m.id) byId[m.id] = m;
  }

  const hallazgos = [];
  const add = (tipo, nivel, mensaje) => hallazgos.push({ tipo, nivel, mensaje });

  // R1. Etapas incompletas (omisiones)
  const req = byId['requisitos'];
  if (!req || !(req.contenido || '').trim()) {
    add('omision', 'alta', 'No se ha generado el documento de requisitos (Modelo de Requisitos en Texto).');
  }
  for (const [id, nombre] of Object.entries(ETAPAS_PLANTUML)) {
    const e = byId[id];
    if (!e || !(e.contenido || '').trim()) {
      add('omision', 'alta', `El ${nombre} no tiene contenido en Markdown.`);
    }
    if (!e || !(e.uml || '').includes('@startuml')) {
      add('omision', 'alta', `El ${nombre} no tiene diagrama PlantUML generado.`);
    }
  }

  const casos = byId['casos_uso'];
  const clases = byId['clases'];
  const secuencia = byId['secuencia'];

  const actoresCU = extractActors(casos?.uml);
  const seqInfo = extractSequence(secuencia?.uml);

  // R2. Actores declarados en casos de uso ausentes del diagrama de secuencia
  for (const a of actoresCU) {
    if (!seqInfo.participants.has(norm(a))) {
      add('advertencia', 'media', `El actor "${a}" (declarado en el diagrama de casos de uso) no aparece en el diagrama de secuencia.`);
    }
  }

  // R3. Actores de secuencia no declarados en el diagrama de casos de uso
  const actoresSec = extractSequenceActors(secuencia?.uml);
  const setActoresCU = new Set(actoresCU.map(norm));
  for (const a of actoresSec) {
    if (!setActoresCU.has(norm(a))) {
      add('inconsistencia', 'media', `El actor "${a}" aparece en el diagrama de secuencia pero no está declarado en el diagrama de casos de uso.`);
    }
  }

  // R4. Clases del diagrama de clases que no participan en el de secuencia
  for (const c of extractClasses(clases?.uml)) {
    if (!seqInfo.participants.has(norm(c))) {
      add('advertencia', 'media', `La clase "${c}" (del diagrama de clases) no participa en el diagrama de secuencia.`);
    }
  }

  // R5. Casos de uso sin relación con ningún actor
  for (const cu of extractUseCases(casos?.uml)) {
    if (!appearsInRelation(casos?.uml, cu)) {
      add('advertencia', 'media', `El caso de uso "${cu.name}" no está conectado a ningún actor en el diagrama de casos de uso.`);
    }
  }

  const porTipo = { inconsistencia: 0, omision: 0, advertencia: 0 };
  for (const h of hallazgos) porTipo[h.tipo] += 1;

  return { hallazgos, porTipo };
}

export function formatearInforme(result) {
  const { hallazgos, porTipo } = result;
  const lineas = ['## Verificación determinista de consistencia', ''];

  if (hallazgos.length === 0) {
    lineas.push('No se detectaron omisiones ni inconsistencias mecánicas entre los artefactos mediante las reglas deterministas.');
    return lineas.join('\n');
  }

  lineas.push(`Resultado: ${porTipo.omision} omisión(es), ${porTipo.inconsistencia} inconsistencia(s) y ${porTipo.advertencia} advertencia(s).`);
  lineas.push('');

  const grupos = [
    ['omision', '### Omisiones detectadas (reglas)'],
    ['inconsistencia', '### Inconsistencias detectadas (reglas)'],
    ['advertencia', '### Advertencias (a revisar por el analista)']
  ];

  for (const [tipo, titulo] of grupos) {
    const items = hallazgos.filter((h) => h.tipo === tipo);
    if (items.length === 0) continue;
    lineas.push(titulo);
    for (const h of items) lineas.push(`- ${h.mensaje}`);
    lineas.push('');
  }

  return lineas.join('\n');
}
