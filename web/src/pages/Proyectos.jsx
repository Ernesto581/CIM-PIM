import { useEffect, useState } from 'react';
import {
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Snackbar,
  Alert,
  Box
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
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
    const { error } = await supabase.from('projects').insert({
      nombre,
      descripcion,
      user_id: user.id
    });
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
      <Paper elevation={2} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h5">Proyectos</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
            Crear Proyecto
          </Button>
        </Box>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Descripción</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {proyectos.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.nombre}</TableCell>
                <TableCell sx={{ maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {p.descripcion}
                </TableCell>
                <TableCell>{p.estado}</TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => navigate(`/proyecto/${p.id}`)} title="Abrir">
                    <OpenInNewIcon />
                  </IconButton>
                  <IconButton onClick={() => remove(p.id)} title="Eliminar">
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {proyectos.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  No hay proyectos. Crea el primero.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Crear Proyecto</DialogTitle>
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
            minRows={4}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            helperText="Describe el sistema de información que deseas modelar."
          />
        </DialogContent>
        <DialogActions>
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
