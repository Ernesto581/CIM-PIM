import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  TextField,
  CircularProgress,
  Chip,
  Snackbar,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  Tabs,
  Tab
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import PlantUMLViewer from '../components/PlantUMLViewer';
import MarkdownView from '../components/MarkdownView';
import { supabase } from '../lib/supabase';
import { METHOD } from '../lib/method';
import { buildStageInput } from '../lib/stageInput';

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const NIVEL = {
  CIM: { label: 'CIM', color: '#e0a45c' },
  PIM: { label: 'PIM', color: '#7fb78a' },
  'CIM-PIM': { label: 'CIM→PIM', color: '#6c93e8' }
};

function download(filename, content, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function findEtapa(etapas, id) {
  return (etapas || []).find((e) => e.id === id);
}

function upsertEtapa(etapas, etapa) {
  const list = etapas ? [...etapas] : [];
  const idx = list.findIndex((e) => e.id === etapa.id);
  if (idx >= 0) list[idx] = { ...list[idx], ...etapa };
  else list.push(etapa);
  return list;
}

function extractUml(markdown) {
  const codeBlock =
    markdown.match(/```plantuml\s*([\s\S]*?)```/i) ||
    markdown.match(/```(?:text|uml)?\s*(@startuml[\s\S]*?@enduml)\s*```/i);
  if (codeBlock) return codeBlock[1].trim();
  const inline = markdown.match(/(@startuml[\s\S]*?@enduml)/i);
  if (inline) return inline[1].trim();
  return '';
}

async function readStream(res, setText) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    full += decoder.decode(value, { stream: true });
    if (setText) setText(full);
  }
  return full;
}

function diffLines(a, b) {
  const al = a.split('\n');
  const bl = b.split('\n');
  const n = al.length;
  const m = bl.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = al[i] === bl[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const res = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (al[i] === bl[j]) {
      res.push({ type: 'same', text: al[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      res.push({ type: 'del', text: al[i] });
      i++;
    } else {
      res.push({ type: 'add', text: bl[j] });
      j++;
    }
  }
  while (i < n) {
    res.push({ type: 'del', text: al[i] });
    i++;
  }
  while (j < m) {
    res.push({ type: 'add', text: bl[j] });
    j++;
  }
  return res;
}

export default function Wizard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const stages = METHOD.stages;
  const modelStages = stages.filter((s) => s.id !== 'requisitos');

  const [tab, setTab] = useState('modelado');
  const [proyecto, setProyecto] = useState(null);
  const [activeStep, setActiveStep] = useState(0);
  const [markdown, setMarkdown] = useState('');
  const [uml, setUml] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState('edit');
  const [snack, setSnack] = useState('');
  const [validating, setValidating] = useState(false);
  const [report, setReport] = useState('');
  const [fixing, setFixing] = useState(false);
  const [fixingStage, setFixingStage] = useState('');
  const [fixResults, setFixResults] = useState([]);
  const [pendingFixes, setPendingFixes] = useState([]);
  const [controller, setController] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error) navigate('/');
        else {
          setProyecto(data);
          setDescripcion(data.descripcion || '');
        }
      });
  }, [id, navigate]);

  useEffect(() => {
    const stage = stages[activeStep];
    const saved = findEtapa(proyecto?.etapas, stage?.id);
    setMarkdown(saved?.contenido || '');
    setUml(saved?.uml || '');
    setMode('edit');
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeStep, proyecto]);

  const stage = stages[activeStep];

  const getRequisitos = () => {
    const req = findEtapa(proyecto?.etapas, 'requisitos');
    return req?.contenido || proyecto?.descripcion || '';
  };

  const entradaDe = (stageId, etapas, idea) =>
    buildStageInput(stageId, stages, etapas, idea ?? descripcion);

  const saveEtapa = async (baseProyecto, s, contenido, umlCode, nuevaDescripcion) => {
    const etapa = { id: s.id, nombre: s.nombre, nivel: s.nivel, contenido, uml: umlCode };
    const update = { etapas: upsertEtapa(baseProyecto.etapas, etapa) };
    if (nuevaDescripcion !== undefined) update.descripcion = nuevaDescripcion;
    const { data, error } = await supabase.from('projects').update(update).eq('id', id).select().single();
    if (error) throw error;
    return data;
  };

  const persist = async (contenido, umlCode, nuevaDescripcion) => {
    const data = await saveEtapa(proyecto, stage, contenido, umlCode, nuevaDescripcion);
    setProyecto(data);
    return data;
  };

  const saveStage = async () => {
    setSaving(true);
    try {
      await persist(markdown, uml);
      setSnack(`${stage.nombre} guardado satisfactoriamente`);
    } catch (e) {
      setSnack(e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const saveDescripcion = async () => {
    setSaving(true);
    try {
      await persist(markdown, uml, descripcion);
      setSnack('Descripción guardada');
    } catch (e) {
      setSnack(e.message || 'Error al guardar la descripción');
    } finally {
      setSaving(false);
    }
  };

  const generate = async () => {
    const built = entradaDe(stage?.id, proyecto?.etapas, descripcion);
    if (built.error) {
      setSnack(built.error);
      return;
    }

    if (markdown.trim() || uml.trim()) {
      if (!window.confirm('Esta etapa ya tiene contenido. ¿Deseas sobrescribirla?')) {
        return;
      }
    }

    const newController = new AbortController();
    setController(newController);
    setLoading(true);
    setElapsed(0);
    setMarkdown('');
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    const timeout = setTimeout(() => newController.abort(), 180000);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ requisitos: built.text, etapa: stage.id }),
        signal: newController.signal
      });

      if (!res.ok || !res.body) {
        let msg = 'Error al generar';
        try {
          const j = await res.json();
          msg = j.error || msg;
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }

      const content = await readStream(res, setMarkdown);
      const umlCode = extractUml(content);
      setUml(umlCode);
      await persist(content, umlCode);
      setSnack(`${stage.nombre} generado con IA`);
    } catch (e) {
      if (e.name === 'AbortError') setSnack('Generación cancelada.');
      else setSnack(e.message || 'Error al generar con la IA');
    } finally {
      clearTimeout(timeout);
      if (timerRef.current) clearInterval(timerRef.current);
      setLoading(false);
      setController(null);
    }
  };

  const cancelGenerate = () => {
    if (controller) controller.abort();
  };

  const exportProject = () => {
    const lines = [`# ${proyecto.nombre}`, '', proyecto.descripcion || '', ''];
    for (const s of stages) {
      const e = findEtapa(proyecto?.etapas, s.id);
      if (e?.contenido) {
        lines.push(`## ${s.nombre}`, '', e.contenido, '');
        if (e.uml) lines.push('```plantuml', e.uml, '```', '');
      }
    }
    download(`${proyecto.nombre}.md`, lines.join('\n'), 'text/markdown');
  };

  const validate = async () => {
    setValidating(true);
    setReport('');
    const modelos = stages.map((s) => {
      const e = findEtapa(proyecto?.etapas, s.id);
      return { id: s.id, nombre: s.nombre, contenido: e?.contenido || '', uml: e?.uml || '' };
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 180000);
    try {
      const res = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ requisitos: getRequisitos(), modelos }),
        signal: controller.signal
      });
      if (!res.ok || !res.body) {
        let msg = 'Error al validar';
        try {
          const j = await res.json();
          msg = j.error || msg;
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }
      await readStream(res, setReport);
    } catch (e) {
      setReport(e.name === 'AbortError' ? 'La validación tardó demasiado.' : e.message || 'Error al validar');
    } finally {
      clearTimeout(timeout);
      setValidating(false);
    }
  };

  const fixModels = async () => {
    setFixing(true);
    setFixResults([]);
    setPendingFixes([]);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 300000);

    try {
      let current = proyecto;
      const fixes = [];
      for (const s of modelStages) {
        setFixingStage(s.nombre);
        const etapaActual = findEtapa(current?.etapas, s.id);
        const before = etapaActual?.contenido || '';
        const built = entradaDe(s.id, current?.etapas, current?.descripcion || descripcion);
        if (built.error) throw new Error(built.error);
        const res = await fetch('/api/fix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
          body: JSON.stringify({
            requisitos: built.text,
            etapa: s.id,
            informe: report,
            actual: before
          }),
          signal: controller.signal
        });
        if (!res.ok || !res.body) {
          let msg = 'Error al corregir';
          try {
            const j = await res.json();
            msg = j.error || msg;
          } catch {
            /* ignore */
          }
          throw new Error(msg);
        }
        const content = await readStream(res);
        const umlCode = extractUml(content);

        const d = diffLines(before, content);
        const changes = d.filter((x) => x.type !== 'same');
        fixes.push({
          stage: s,
          before,
          after: content,
          uml: umlCode,
          added: changes.filter((x) => x.type === 'add').length,
          removed: changes.filter((x) => x.type === 'del').length,
          lines: changes
        });
      }
      setPendingFixes(fixes);
      setSnack('Correcciones generadas. Revisa y aplica o descarta cada una.');
    } catch (e) {
      setSnack(e.name === 'AbortError' ? 'La corrección tardó demasiado.' : e.message || 'Error al corregir');
    } finally {
      clearTimeout(timeout);
      setFixing(false);
      setFixingStage('');
    }
  };

  const applyFix = async (index) => {
    const fix = pendingFixes[index];
    try {
      const data = await saveEtapa(proyecto, fix.stage, fix.after, fix.uml);
      setProyecto(data);
      if (fix.stage.id === stage?.id) {
        setMarkdown(fix.after);
        setUml(fix.uml);
      }
      setPendingFixes((prev) => prev.filter((_, i) => i !== index));
      setSnack(`${fix.stage.nombre} corregido.`);
    } catch (e) {
      setSnack(e.message || 'Error al guardar');
    }
  };

  const discardFix = (index) => {
    setPendingFixes((prev) => prev.filter((_, i) => i !== index));
  };

  const applyAllFixes = async () => {
    let current = proyecto;
    for (const fix of pendingFixes) {
      current = await saveEtapa(current, fix.stage, fix.after, fix.uml);
      if (fix.stage.id === stage?.id) {
        setMarkdown(fix.after);
        setUml(fix.uml);
      }
    }
    setProyecto(current);
    setPendingFixes([]);
    setSnack('Todos los modelos corregidos.');
  };

  if (!proyecto) {
    return (
      <Layout>
        <Box sx={{ textAlign: 'center', mt: 12 }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  const nivel = NIVEL[stage.nivel] || NIVEL.PIM;

  return (
    <Layout>
      <Button component={Link} to="/" startIcon={<ArrowBackIcon />} sx={{ mb: 2, color: '#93a0b0' }}>
        Proyectos
      </Button>

      <Box className="rise" sx={{ mb: 2 }}>
        <Typography className="eyebrow">Proyecto</Typography>
        <Typography className="serif-display" sx={{ fontSize: 34, color: '#eae6dc' }}>
          {proyecto.nombre}
        </Typography>
      </Box>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 3, '& .MuiTabs-indicator': { backgroundColor: '#e0a45c' } }}
      >
        <Tab value="modelado" label="Modelado" />
        <Tab value="coherencia" label="Coherencia" />
        <Tab value="correcciones" label="Correcciones" />
      </Tabs>

      {tab === 'modelado' && (
        <>
          {/* Idea */}
          <Card className="rise rise-1" elevation={0} sx={{ background: '#141b24', mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography className="eyebrow">Concepción de la idea</Typography>
                <Typography variant="caption" color="text.secondary">lenguaje natural · CIM</Typography>
              </Box>
              <Box className="paper" sx={{ p: 1.5 }}>
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  rows={4}
                  placeholder="Describe el sistema de información que deseas modelar…"
                  style={{
                    width: '100%',
                    border: 'none',
                    outline: 'none',
                    resize: 'vertical',
                    background: 'transparent',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 13,
                    lineHeight: 1.6,
                    color: '#23262b'
                  }}
                />
              </Box>
              <Button variant="outlined" size="small" startIcon={<SaveIcon />} sx={{ mt: 1.5 }} onClick={saveDescripcion} disabled={saving}>
                Guardar idea
              </Button>
            </CardContent>
          </Card>

          {/* Stepper */}
          <Box className="rise rise-2" sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1, mb: 2 }}>
            {stages.map((s, i) => {
              const active = i === activeStep;
              return (
                <Button
                  key={s.id}
                  onClick={() => setActiveStep(i)}
                  variant={active ? 'contained' : 'outlined'}
                  sx={{
                    flexShrink: 0,
                    borderRadius: 10,
                    px: 2,
                    py: 1,
                    textTransform: 'none',
                    ...(active ? {} : { borderColor: 'rgba(234,230,220,0.14)', color: '#93a0b0' })
                  }}
                >
                  <Box sx={{ textAlign: 'left' }}>
                    <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace', color: 'inherit', display: 'block' }}>
                      {String(i + 1).padStart(2, '0')} · {s.nombre}
                    </Typography>
                    <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: active ? 'rgba(22,16,10,0.7)' : 'text.secondary' }}>
                      {s.nivel}
                    </Typography>
                  </Box>
                </Button>
              );
            })}
          </Box>

          {/* Stage */}
          <Card className="rise rise-3" elevation={0} sx={{ background: '#141b24' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1, flexWrap: 'wrap' }}>
                <Typography className="serif-display" sx={{ fontSize: 24, color: '#eae6dc' }}>
                  {stage.nombre}
                </Typography>
                <Chip label={nivel.label} size="small" sx={{ color: nivel.color, borderColor: nivel.color, bgcolor: 'transparent', border: '1px solid' }} />
                <Chip label={`entrada: ${stage.entrada}`} size="small" variant="outlined" sx={{ color: '#93a0b0' }} />
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, maxWidth: 720 }}>
                {stage.descripcion}
              </Typography>

              <Stack direction="row" spacing={1.5} sx={{ mb: 3 }}>
                <Button
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <AutoAwesomeIcon />}
                  onClick={generate}
                  disabled={loading}
                  sx={{ px: 2.5 }}
                >
                  {loading ? `Generando… ${elapsed}s` : 'Generar con IA'}
                </Button>
                {loading && (
                  <Button variant="outlined" color="error" onClick={cancelGenerate} sx={{ px: 2.5 }}>
                    Cancelar
                  </Button>
                )}
                <Button variant="outlined" startIcon={<SaveIcon />} onClick={saveStage} disabled={saving || loading}>
                  Guardar
                </Button>
                {!loading && (
                  <Button variant="outlined" onClick={exportProject} sx={{ px: 2.5 }}>
                    Exportar proyecto
                  </Button>
                )}
              </Stack>

              {loading ? (
                <Box sx={{ mb: 3 }}>
                  <Typography className="eyebrow" sx={{ mb: 1 }}>
                    Generando… {elapsed}s
                  </Typography>
                  <MarkdownView content={markdown || '_El modelo está redactando…_'} />
                </Box>
              ) : (
                <Box sx={{ mb: 3 }}>
                  <ToggleButtonGroup value={mode} exclusive onChange={(e, v) => v && setMode(v)} size="small" sx={{ mb: 1.5 }}>
                    <ToggleButton value="edit">Editar</ToggleButton>
                    <ToggleButton value="preview">Vista previa</ToggleButton>
                  </ToggleButtonGroup>

                  {mode === 'edit' ? (
                    <Box className="paper" sx={{ p: 1.5 }}>
                      <textarea
                        value={markdown}
                        onChange={(e) => setMarkdown(e.target.value)}
                        rows={14}
                        placeholder="Contenido en Markdown…"
                        style={{
                          width: '100%',
                          border: 'none',
                          outline: 'none',
                          resize: 'vertical',
                          background: 'transparent',
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: 13,
                          lineHeight: 1.6,
                          color: '#23262b'
                        }}
                      />
                    </Box>
                  ) : (
                    <MarkdownView content={markdown} />
                  )}
                </Box>
              )}

              {stage.tipo === 'plantuml' && !loading && (
                <Box>
                  <Typography className="eyebrow" sx={{ mb: 1 }}>
                    Diagrama UML · PlantUML
                  </Typography>
                  <PlantUMLViewer uml={uml} />
                  <Accordion elevation={0} sx={{ mt: 1.5, background: '#10161e', borderRadius: 2, '&:before': { display: 'none' } }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', color: '#93a0b0' }}>
                        Código PlantUML (editable)
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box className="paper" sx={{ p: 1.5 }}>
                        <textarea
                          value={uml}
                          onChange={(e) => setUml(e.target.value)}
                          rows={10}
                          style={{
                            width: '100%',
                            border: 'none',
                            outline: 'none',
                            resize: 'vertical',
                            background: 'transparent',
                            fontFamily: 'JetBrains Mono, monospace',
                            fontSize: 13,
                            lineHeight: 1.6,
                            color: '#23262b'
                          }}
                        />
                      </Box>
                      <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                        <Button variant="outlined" size="small" startIcon={<SaveIcon />} onClick={saveStage} disabled={saving}>
                          Guardar diagrama
                        </Button>
                        <Button size="small" onClick={() => download(`${stage.id}.puml`, uml, 'text/plain')}>
                          Exportar .puml
                        </Button>
                      </Stack>
                    </AccordionDetails>
                  </Accordion>
                </Box>
              )}

              {!loading && (
                <Button size="small" sx={{ mt: 3 }} onClick={() => download(`${stage.id}.md`, markdown, 'text/markdown')}>
                  Exportar Markdown
                </Button>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {tab === 'coherencia' && (
        <Card className="rise" elevation={0} sx={{ background: '#141b24' }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
              <FactCheckIcon sx={{ color: '#6c93e8' }} />
              <Typography className="serif-display" sx={{ fontSize: 22, color: '#eae6dc' }}>
                Validación de coherencia
              </Typography>
              <Button
                variant="contained"
                startIcon={validating ? <CircularProgress size={16} color="inherit" /> : <FactCheckIcon />}
                onClick={validate}
                disabled={validating}
                sx={{ ml: 'auto' }}
              >
                {validating ? 'Validando…' : 'Validar coherencia'}
              </Button>
            </Box>
            <MarkdownView content={report || '_Pulsa "Validar coherencia" para comparar los requisitos con los modelos._'} height={560} />
          </CardContent>
        </Card>
      )}

      {tab === 'correcciones' && (
        <Card className="rise" elevation={0} sx={{ background: '#141b24' }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
              <AutoFixHighIcon sx={{ color: '#e0a45c' }} />
              <Typography className="serif-display" sx={{ fontSize: 22, color: '#eae6dc' }}>
                Correcciones
              </Typography>
              <Button
                variant="contained"
                color="secondary"
                startIcon={fixing ? <CircularProgress size={16} color="inherit" /> : <AutoFixHighIcon />}
                onClick={fixModels}
                disabled={fixing || !report}
                sx={{ ml: 'auto' }}
              >
                {fixing ? `Corrigiendo ${fixingStage}…` : 'Corregir modelos'}
              </Button>
            </Box>

            {!report && (
              <Typography variant="body2" color="text.secondary">
                Primero ejecuta la validación de coherencia (pestaña "Coherencia") para poder corregir los modelos.
              </Typography>
            )}

            {fixing && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <CircularProgress size={16} />
                <Typography variant="caption" color="text.secondary">
                  Corrigiendo {fixingStage}…
                </Typography>
              </Box>
            )}

            {pendingFixes.map((r, idx) => (
              <Card key={r.stage.id} elevation={0} sx={{ background: '#10161e', mb: 2, borderRadius: 2 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
                    <Typography className="serif-display" sx={{ fontSize: 18, color: '#eae6dc' }}>
                      {r.stage.nombre}
                    </Typography>
                    <Chip label={`+${r.added}`} size="small" sx={{ color: '#7fb78a', borderColor: '#7fb78a', border: '1px solid' }} />
                    <Chip label={`-${r.removed}`} size="small" sx={{ color: '#e07a6a', borderColor: '#e07a6a', border: '1px solid' }} />
                  </Box>

                  {r.lines.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      Sin cambios detectados.
                    </Typography>
                  ) : (
                    <Box
                      className="paper"
                      sx={{ p: 1.5, maxHeight: 320, overflow: 'auto', fontFamily: '"JetBrains Mono", monospace', fontSize: 12.5, lineHeight: 1.6 }}
                    >
                      {r.lines.slice(0, 300).map((l, i) => (
                        <Box
                          key={i}
                          sx={{
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            px: 1,
                            borderRadius: 0.5,
                            background: l.type === 'add' ? 'rgba(127,183,138,0.16)' : 'rgba(224,122,106,0.14)',
                            color: l.type === 'add' ? '#2c6e3f' : '#a03a2a'
                          }}
                        >
                          <span style={{ opacity: 0.6, marginRight: 8 }}>{l.type === 'add' ? '+' : '-'}</span>
                          {l.text || ' '}
                        </Box>
                      ))}
                      {r.lines.length > 300 && (
                        <Typography variant="caption" sx={{ color: '#8a8375', display: 'block', mt: 1 }}>
                          … {r.lines.length - 300} cambios más
                        </Typography>
                      )}
                    </Box>
                  )}

                  <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                    <Button size="small" variant="contained" onClick={() => applyFix(idx)}>
                      Aplicar
                    </Button>
                    <Button size="small" variant="outlined" color="error" onClick={() => discardFix(idx)}>
                      Descartar
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            ))}

            {pendingFixes.length > 0 && (
              <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
                <Button variant="contained" onClick={applyAllFixes}>
                  Aplicar todas
                </Button>
                <Button variant="outlined" color="error" onClick={() => setPendingFixes([])}>
                  Descartar todas
                </Button>
              </Stack>
            )}
          </CardContent>
        </Card>
      )}

      <Snackbar
        open={!!snack}
        autoHideDuration={6000}
        onClose={() => setSnack('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="success" onClose={() => setSnack('')}>
          {snack}
        </Alert>
      </Snackbar>
    </Layout>
  );
}
