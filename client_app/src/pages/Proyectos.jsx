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
import client from '../api/client';
import { API } from '../constants/api';

export default function Proyectos() {
  const [proyectos, setProyectos] = useState([]);
  const [open, setOpen] = useState(false);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState('');
  const navigate = useNavigate();

  const load = async () => {
    try {
      const { data } = await client.get(API.proyectos);
      setProyectos(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    setLoading(true);
    try {
      await client.post(API.proyectos, { nombre, descripcion });
      setOpen(false);
      setNombre('');
      setDescripcion('');
      setSnack('Proyecto creado satisfactoriamente');
      load();
    } catch (e) {
      setSnack(e.response?.data?.error || 'Error al crear proyecto');
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id) => {
    try {
      await client.delete(`${API.proyectos}/${id}`);
      setSnack('Proyecto eliminado satisfactoriamente');
      load();
    } catch (e) {
      setSnack('Error al eliminar proyecto');
    }
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
              <TableRow key={p._id}>
                <TableCell>{p.nombre}</TableCell>
                <TableCell sx={{ maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {p.descripcion}
                </TableCell>
                <TableCell>{p.estado}</TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => navigate(`/proyecto/${p._id}`)} title="Abrir">
                    <OpenInNewIcon />
                  </IconButton>
                  <IconButton onClick={() => remove(p._id)} title="Eliminar">
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
