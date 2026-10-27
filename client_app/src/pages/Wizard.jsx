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
import client from '../api/client';
import { API } from '../constants/api';
import { buildStageInput } from '../lib/stageInput';

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

  const [proyecto, setProyecto] = useState(null);
  const [stages, setStages] = useState([]);
  const [activeStep, setActiveStep] = useState(0);
  const [markdown, setMarkdown] = useState('');
  const [uml, setUml] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [report, setReport] = useState('');
  const [fixing, setFixing] = useState(false);
  const [mode, setMode] = useState('edit');
  const [snack, setSnack] = useState('');

  useEffect(() => {
    client
      .get(API.method)
      .then(({ data }) => setStages(data.stages || []))
      .catch((e) => console.error(e));
  }, []);

  useEffect(() => {
    client
      .get(`${API.proyectos}/${id}`)
      .then(({ data }) => {
        setProyecto(data);
        setDescripcion(data.descripcion || '');
      })
      .catch(() => navigate('/'));
  }, [id, navigate]);

  useEffect(() => {
    const stage = stages[activeStep];
    const saved = findEtapa(proyecto?.etapas, stage?.id);
    setMarkdown(saved?.contenido || '');
    setUml(saved?.uml || '');
    setMode('edit');
  }, [activeStep, proyecto, stages]);

  const stage = stages[activeStep];

  const entradaDe = (stageId, etapas, idea) =>
    buildStageInput(stageId, stages, etapas, idea ?? descripcion);

  const persist = async (contenido, umlCode) => {
    const etapa = {
      id: stage.id,
      nombre: stage.nombre,
      nivel: stage.nivel,
      contenido,
      uml: umlCode
    };
    const updated = { ...proyecto, etapas: upsertEtapa(proyecto.etapas, etapa) };
    const { data } = await client.put(`${API.proyectos}/${id}`, updated);
    setProyecto(data);
    return data;
  };

  const saveStage = async () => {
    setSaving(true);
    try {
      await persist(markdown, uml);
      setSnack(`${stage.nombre} guardado satisfactoriamente`);
    } catch (e) {
      setSnack('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const saveDescripcion = async () => {
    setSaving(true);
    try {
      const { data } = await client.put(`${API.proyectos}/${id}`, { ...proyecto, descripcion });
      setProyecto(data);
      setSnack('Descripción guardada');
    } catch (e) {
      setSnack('Error al guardar la descripción');
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
    setLoading(true);
    setMarkdown('');
    setUml('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(API.generate, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ requisitos: built.text, etapa: stage.id })
      });
      if (!res.ok || !res.body) {
        let msg = 'Error al generar';
        try {
          const j = await res.json();
          msg = j.error || msg;
        } catch { /* ignore */ }
        throw new Error(msg);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try {
            const evt = JSON.parse(line.slice(6));
            if (evt.type === 'content') {
              full += evt.text;
              setMarkdown(full);
            } else if (evt.type === 'done') {
              const umlCode = evt.uml || '';
              setUml(umlCode);
              await persist(full, umlCode);
              setSnack(`${stage.nombre} generado con IA`);
            } else if (evt.type === 'error') {
              throw new Error(evt.error);
            }
          } catch { /* ignore parse errors */ }
        }
      }
    } catch (e) {
      setSnack(e.message || 'Error al generar con la IA');
    } finally {
      setLoading(false);
    }
  };

  const validate = async () => {
    setValidating(true);
    setReport('');
    const modelos = stages.map((s) => {
      const e = findEtapa(proyecto?.etapas, s.id);
      return { id: s.id, nombre: s.nombre, contenido: e?.contenido || '', uml: e?.uml || '' };
    });
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(API.validate, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ requisitos: getRequisitos(), modelos })
      });
      if (!res.ok || !res.body) {
        let msg = 'Error al validar';
        try {
          const j = await res.json();
          msg = j.error || msg;
        } catch { /* ignore */ }
        throw new Error(msg);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\\n')) {
          if (!line.startsWith('data: ')) continue;
          try {
            const evt = JSON.parse(line.slice(6));
            if (evt.type === 'content') {
              full += evt.text;
              setReport(full);
            }
          } catch { /* ignore */ }
        }
      }
    } catch (e) {
      setReport(e.message || 'Error al validar');
    } finally {
      setValidating(false);
    }
  };

  const fixModels = async () => {
    setFixing(true);
    try {
      let current = proyecto;
      for (const s of stages.filter((st) => st.id !== 'requisitos')) {
        const etapaActual = findEtapa(current?.etapas, s.id);
        const before = etapaActual?.contenido || '';
        const built = entradaDe(s.id, current?.etapas, current?.descripcion || descripcion);
        if (built.error) throw new Error(built.error);
        const token = localStorage.getItem('token');
        const res = await fetch(API.fix, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            requisitos: built.text,
            etapa: s.id,
            informe: report,
            actual: before
          })
        });
        if (!res.ok || !res.body) {
          let msg = 'Error al corregir';
          try {
            const j = await res.json();
            msg = j.error || msg;
          } catch { /* ignore */ }
          throw new Error(msg);
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let full = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split('\\n')) {
            if (!line.startsWith('data: ')) continue;
            try {
              const evt = JSON.parse(line.slice(6));
              if (evt.type === 'content') full += evt.text;
              else if (evt.type === 'done') {
                const umlCode = evt.uml || '';
                const etapa = { id: s.id, nombre: s.nombre, nivel: s.nivel, contenido: full, uml: umlCode };
                const updated = { ...current, etapas: upsertEtapa(current.etapas, etapa) };
                const { data } = await client.put(`${API.proyectos}/${id}`, updated);
                current = data;
                setProyecto(data);
                if (s.id === stage?.id) {
                  setMarkdown(full);
                  setUml(umlCode);
                }
              }
            } catch { /* ignore */ }
          }
        }
      }
      setSnack('Modelos corregidos según el informe de coherencia');
    } catch (e) {
      setSnack(e.message || 'Error al corregir');
    } finally {
      setFixing(false);
    }
  };

  const getRequisitos = () => {
    const req = findEtapa(proyecto?.etapas, 'requisitos');
    return req?.contenido || proyecto?.descripcion || '';
  };

  if (!proyecto || stages.length === 0) {
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
        <Button
          disabled={activeStep === stages.length - 1}
          onClick={() => setActiveStep((s) => s + 1)}
        >
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
              {loading ? 'Generando...' : `Generar con IA`}
            </Button>
            <Button
              variant="outlined"
              startIcon={<SaveIcon />}
              onClick={saveStage}
              disabled={saving}
            >
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
                sx={{ fontFamily: 'monospace' }}
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

      <Card sx={{ mt: 2, mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Validación de coherencia
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Button
              variant="contained"
              onClick={validate}
              disabled={validating}
            >
              {validating ? 'Validando...' : 'Validar coherencia'}
            </Button>
            <Button
              variant="outlined"
              onClick={fixModels}
              disabled={fixing || !report}
            >
              {fixing ? 'Corrigiendo...' : 'Corregir modelos'}
            </Button>
          </Box>
          {report && (
            <TextField
              fullWidth
              multiline
              minRows={8}
              value={report}
              InputProps={{ readOnly: true }}
              sx={{ fontFamily: 'monospace' }}
            />
          )}
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
