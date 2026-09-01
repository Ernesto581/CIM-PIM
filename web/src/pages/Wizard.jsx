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
  Stack
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import PlantUMLViewer from '../components/PlantUMLViewer';
import MarkdownView from '../components/MarkdownView';
import { supabase } from '../lib/supabase';
import { METHOD } from '../lib/method';

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

export default function Wizard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const stages = METHOD.stages;

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

  const requisitosInput = () => {
    if (!stage) return '';
    if (stage.id === 'requisitos') return proyecto?.descripcion || '';
    const req = findEtapa(proyecto?.etapas, 'requisitos');
    return req?.contenido || proyecto?.descripcion || '';
  };

  const persist = async (contenido, umlCode, nuevaDescripcion) => {
    const etapa = { id: stage.id, nombre: stage.nombre, nivel: stage.nivel, contenido, uml: umlCode };
    const update = { etapas: upsertEtapa(proyecto.etapas, etapa) };
    if (nuevaDescripcion !== undefined) update.descripcion = nuevaDescripcion;
    const { data, error } = await supabase.from('projects').update(update).eq('id', id).select().single();
    if (error) throw error;
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
    setLoading(true);
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requisitos: requisitosInput(), etapa: stage.id }),
        signal: controller.signal
      });
      let payload;
      try {
        payload = await res.json();
      } catch {
        throw new Error('La función /api/generate no respondió JSON. ¿Estás en local? Usa `vercel dev`.');
      }
      if (!res.ok) throw new Error(payload.error || 'Error al generar');
      const content = payload.markdown || '';
      const umlCode = payload.uml || '';
      setMarkdown(content);
      setUml(umlCode);
      await persist(content, umlCode);
      setSnack(`${stage.nombre} generado con IA`);
    } catch (e) {
      if (e.name === 'AbortError') setSnack('La generación tardó demasiado. Inténtalo de nuevo.');
      else setSnack(e.message || 'Error al generar con la IA');
    } finally {
      clearTimeout(timeout);
      if (timerRef.current) clearInterval(timerRef.current);
      setLoading(false);
    }
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

      <Box className="rise" sx={{ mb: 3 }}>
        <Typography className="eyebrow">Proyecto</Typography>
        <Typography className="serif-display" sx={{ fontSize: 34, color: '#eae6dc' }}>
          {proyecto.nombre}
        </Typography>
      </Box>

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
            <Button variant="outlined" startIcon={<SaveIcon />} onClick={saveStage} disabled={saving}>
              Guardar
            </Button>
            {loading && (
              <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
                Generando… normalmente tarda entre 10 y 20 s.
              </Typography>
            )}
          </Stack>

          {/* Markdown editor / preview */}
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

          {/* Diagrama */}
          {stage.tipo === 'plantuml' && (
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

          <Button size="small" sx={{ mt: 3 }} onClick={() => download(`${stage.id}.md`, markdown, 'text/markdown')}>
            Exportar Markdown
          </Button>
        </CardContent>
      </Card>

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
