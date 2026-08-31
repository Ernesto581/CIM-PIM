import { useState } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  Tabs,
  Tab
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [tab, setTab] = useState(0);
  const [nombre, setNombre] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const signIn = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(error.message);
    else navigate('/');
  };

  const signUp = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nombre, apellidos, rol: 'cliente' } }
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else if (data.session) {
      navigate('/');
    } else {
      setInfo(
        'Registro exitoso. Revisa tu correo para confirmar (o inicia sesión si la confirmación está desactivada).'
      );
    }
  };

  return (
    <Container maxWidth="xs" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h5" align="center" gutterBottom>
          jMDA · Módulo CIM-PIM
        </Typography>
        <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 2 }}>
          Herramienta CASE para Arquitectura Dirigida por Modelos
        </Typography>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth" sx={{ mb: 2 }}>
          <Tab label="Iniciar sesión" />
          <Tab label="Registrarse" />
        </Tabs>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {info && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {info}
          </Alert>
        )}

        {tab === 0 ? (
          <form onSubmit={signIn}>
            <TextField label="Email" type="email" fullWidth margin="normal" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <TextField label="Contraseña" type="password" fullWidth margin="normal" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }} disabled={loading}>
              {loading ? 'Procesando...' : 'Iniciar sesión'}
            </Button>
          </form>
        ) : (
          <form onSubmit={signUp}>
            <TextField label="Nombre" fullWidth margin="normal" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
            <TextField label="Apellidos" fullWidth margin="normal" value={apellidos} onChange={(e) => setApellidos(e.target.value)} />
            <TextField label="Email" type="email" fullWidth margin="normal" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <TextField label="Contraseña" type="password" fullWidth margin="normal" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }} disabled={loading}>
              {loading ? 'Procesando...' : 'Registrarse'}
            </Button>
          </form>
        )}
      </Paper>
    </Container>
  );
}
