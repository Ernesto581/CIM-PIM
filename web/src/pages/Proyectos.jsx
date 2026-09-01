import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Snackbar,
  Alert,
  Card,
  CardContent,
  Chip,
  Stack
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthProvider';

export default function Proyectos() {
  const [proyectos, setProyectos] = useState([]);
  const [open, setOpen] = useState(false);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  const load = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setProyectos(data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    setLoading(true);
    const { error } = await supabase.from('projects').insert({ nombre, descripcion, user_id: user.id });
    setLoading(false);
    if (error) {
      setSnack(error.message);
      return;
    }
    setOpen(false);
    setNombre('');
    setDescripcion('');
    setSnack('Proyecto creado satisfactoriamente');
    load();
  };

  const remove = async (id) => {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    setSnack(error ? 'Error al eliminar proyecto' : 'Proyecto eliminado satisfactoriamente');
    load();
  };

  return (
    <Layout>
      <Box className="rise" sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography className="eyebrow">Módulo CIM-PIM</Typography>
          <Typography className="serif-display" sx={{ fontSize: 32, color: '#eae6dc' }}>
            Proyectos
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Sistemas de información en proceso de modelado
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
          Crear Proyecto
        </Button>
      </Box>

      {proyectos.length === 0 ? (
        <Box
          className="rise rise-1"
          sx={{
            border: '1px dashed rgba(234,230,220,0.18)',
            borderRadius: 3,
            p: 6,
            textAlign: 'center'
          }}
        >
          <Typography className="serif-display" sx={{ fontSize: 22, color: '#c8c2b4' }}>
            Aún no hay proyectos
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
            Crea uno describiendo en lenguaje natural el sistema que quieres modelar.
          </Typography>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
            Crear el primero
          </Button>
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 2.5 }}>
          {proyectos.map((p, i) => (
            <Card
              key={p.id}
              className={`rise rise-${Math.min(i + 1, 4)}`}
              elevation={0}
              sx={{
                background: '#141b24',
                cursor: 'pointer',
                transition: 'transform .18s ease, border-color .18s ease',
                '&:hover': { transform: 'translateY(-3px)', borderColor: 'rgba(224,164,92,0.4)' }
              }}
              onClick={() => navigate(`/proyecto/${p.id}`)}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography className="serif-display" sx={{ fontSize: 20, color: '#eae6dc' }}>
                    {p.nombre}
                  </Typography>
                  <Chip label={p.estado} size="small" variant="outlined" sx={{ color: '#e0a45c', borderColor: 'rgba(224,164,92,0.4)' }} />
                </Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mb: 2,
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    minHeight: 60
                  }}
                >
                  {p.descripcion || 'Sin descripción.'}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip
                    icon={<ArrowForwardIcon />}
                    label="Abrir"
                    size="small"
                    color="primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/proyecto/${p.id}`);
                    }}
                  />
                  <Box sx={{ flexGrow: 1 }} />
                  <IconButton
                    size="small"
                    title="Eliminar"
                    onClick={(e) => {
                      e.stopPropagation();
                      remove(p.id);
                    }}
                  >
                    <DeleteIcon fontSize="small" sx={{ color: '#93a0b0' }} />
                  </IconButton>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { background: '#141b24' } }}>
        <DialogTitle className="serif-display">Crear Proyecto</DialogTitle>
        <DialogContent>
          <TextField
            label="Nombre del proyecto"
            fullWidth
            margin="normal"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />
          <TextField
            label="Descripción (idea en lenguaje natural)"
            fullWidth
            margin="normal"
            multiline
            minRows={5}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            helperText="Describe el sistema de información que deseas modelar."
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={create} disabled={loading || !nombre}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

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
