import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Stepper,
  Step,
  StepLabel,
  TextField,
  CircularProgress,
  Chip,
  Snackbar,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SaveIcon from '@mui/icons-material/Save';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import PlantUMLViewer from '../components/PlantUMLViewer';
import MarkdownView from '../components/MarkdownView';
import { supabase } from '../lib/supabase';
import { METHOD } from '../lib/method';

const NIVEL_COLOR = { CIM: 'primary', PIM: 'secondary', 'CIM-PIM': 'success' };

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
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState('edit');
  const [snack, setSnack] = useState('');

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
  }, [activeStep, proyecto]);

  const stage = stages[activeStep];

  const requisitosInput = () => {
    if (!stage) return '';
    if (stage.id === 'requisitos') return proyecto?.descripcion || '';
    const req = findEtapa(proyecto?.etapas, 'requisitos');
    return req?.contenido || proyecto?.descripcion || '';
  };

  const persist = async (contenido, umlCode, nuevaDescripcion) => {
    const etapa = {
      id: stage.id,
      nombre: stage.nombre,
      nivel: stage.nivel,
      contenido,
      uml: umlCode
    };
    const update = {
      etapas: upsertEtapa(proyecto.etapas, etapa)
    };
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
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requisitos: requisitosInput(), etapa: stage.id })
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || 'Error al generar');
      }
      const content = payload.markdown || '';
      const umlCode = payload.uml || '';
      setMarkdown(content);
      setUml(umlCode);
      await persist(content, umlCode);
      setSnack(`${stage.nombre} generado con IA`);
    } catch (e) {
      setSnack(e.message || 'Error al generar con la IA');
    } finally {
      setLoading(false);
    }
  };

  if (!proyecto) {
    return (
      <Layout>
        <Box sx={{ textAlign: 'center', mt: 10 }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Typography variant="h5" gutterBottom>
        {proyecto.nombre}
      </Typography>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>
            Concepción de la idea (lenguaje natural)
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={2}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Describe el sistema de información que deseas modelar..."
          />
          <Button
            variant="outlined"
            startIcon={<SaveIcon />}
            sx={{ mt: 1 }}
            onClick={saveDescripcion}
            disabled={saving}
          >
            Guardar idea
          </Button>
        </CardContent>
      </Card>

      <Stepper activeStep={activeStep} sx={{ mb: 2, overflowX: 'auto' }}>
        {stages.map((s, i) => (
          <Step key={s.id}>
            <StepLabel onClick={() => setActiveStep(i)} sx={{ cursor: 'pointer' }}>
              {s.nombre}
            </StepLabel>
          </Step>
        ))}
      </Stepper>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Button disabled={activeStep === 0} onClick={() => setActiveStep((s) => s - 1)}>
          Anterior
        </Button>
        <Button disabled={activeStep === stages.length - 1} onClick={() => setActiveStep((s) => s + 1)}>
          Siguiente
        </Button>
      </Box>

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Typography variant="h6">{stage.nombre}</Typography>
            <Chip label={stage.nivel} color={NIVEL_COLOR[stage.nivel] || 'default'} size="small" />
            <Chip label={`Entrada: ${stage.entrada}`} variant="outlined" size="small" />
          </Box>

          <MarkdownView content={stage.descripcion} />

          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              color="success"
              startIcon={<AutoAwesomeIcon />}
              onClick={generate}
              disabled={loading}
            >
              {loading ? 'Generando...' : 'Generar con IA'}
            </Button>
            <Button variant="outlined" startIcon={<SaveIcon />} onClick={saveStage} disabled={saving}>
              Guardar
            </Button>
          </Box>

          <Box sx={{ mt: 2 }}>
            <ToggleButtonGroup
              value={mode}
              exclusive
              onChange={(e, v) => v && setMode(v)}
              size="small"
              sx={{ mb: 1 }}
            >
              <ToggleButton value="edit">Editar</ToggleButton>
              <ToggleButton value="preview">Vista previa</ToggleButton>
            </ToggleButtonGroup>
            {mode === 'edit' ? (
              <TextField
                fullWidth
                multiline
                minRows={10}
                value={markdown}
                onChange={(e) => setMarkdown(e.target.value)}
                placeholder="Contenido en Markdown..."
              />
            ) : (
              <MarkdownView content={markdown} />
            )}
          </Box>

          {stage.tipo === 'plantuml' && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Diagrama UML (PlantUML)
              </Typography>
              <PlantUMLViewer uml={uml} />
              <Accordion sx={{ mt: 1 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  Código PlantUML (editable)
                </AccordionSummary>
                <AccordionDetails>
                  <TextField
                    fullWidth
                    multiline
                    minRows={8}
                    value={uml}
                    onChange={(e) => setUml(e.target.value)}
                    sx={{ fontFamily: 'monospace' }}
                  />
                  <Button
                    variant="outlined"
                    startIcon={<SaveIcon />}
                    sx={{ mt: 1 }}
                    onClick={saveStage}
                    disabled={saving}
                  >
                    Guardar diagrama
                  </Button>
                  <Button
                    sx={{ mt: 1, ml: 1 }}
                    onClick={() => download(`${stage.id}.puml`, uml, 'text/plain')}
                  >
                    Exportar .puml
                  </Button>
                </AccordionDetails>
              </Accordion>
            </Box>
          )}

          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
            <Button onClick={() => download(`${stage.id}.md`, markdown, 'text/markdown')}>
              Exportar Markdown
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Snackbar
        open={!!snack}
        autoHideDuration={5000}
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
