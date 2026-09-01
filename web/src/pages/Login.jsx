import { useState } from 'react';
import { Box, Paper, TextField, Button, Typography, Alert, Tabs, Tab, Container } from '@mui/material';
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
    if (error) setError(error.message);
    else if (data.session) navigate('/');
    else setInfo('Registro exitoso. Revisa tu correo para confirmar (o inicia sesión si la confirmación está desactivada).');
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', px: 2 }}>
      <Container maxWidth="xs" sx={{ p: 0 }}>
        <Box className="rise" sx={{ textAlign: 'center', mb: 3 }}>
          <Box
            sx={{
              width: 54,
              height: 54,
              borderRadius: 14,
              display: 'grid',
              placeItems: 'center',
              mx: 'auto',
              mb: 2,
              background: 'linear-gradient(135deg,#e0a45c,#c07a2f)',
              color: '#16100a',
              fontFamily: '"Fraunces", serif',
              fontWeight: 700,
              fontSize: 28
            }}
          >
            j
          </Box>
          <Typography className="serif-display" sx={{ fontSize: 34, color: '#eae6dc' }}>
            jMDA
          </Typography>
          <Typography className="eyebrow" sx={{ mt: 0.5 }}>
            Herramienta CASE · Arquitectura Dirigida por Modelos
          </Typography>
        </Box>

        <Paper elevation={0} className="rise rise-1" sx={{ p: 3.5, background: '#141b24' }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="fullWidth"
            sx={{ mb: 2.5, '& .MuiTabs-indicator': { backgroundColor: '#e0a45c' } }}
          >
            <Tab label="Iniciar sesión" />
            <Tab label="Registrarse" />
          </Tabs>

          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {error}
            </Alert>
          )}
          {info && (
            <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
              {info}
            </Alert>
          )}

          {tab === 0 ? (
            <form onSubmit={signIn}>
              <TextField label="Email" type="email" fullWidth margin="normal" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <TextField label="Contraseña" type="password" fullWidth margin="normal" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <Button type="submit" variant="contained" fullWidth size="large" sx={{ mt: 2.5 }} disabled={loading}>
                {loading ? 'Procesando…' : 'Entrar'}
              </Button>
            </form>
          ) : (
            <form onSubmit={signUp}>
              <TextField label="Nombre" fullWidth margin="normal" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
              <TextField label="Apellidos" fullWidth margin="normal" value={apellidos} onChange={(e) => setApellidos(e.target.value)} />
              <TextField label="Email" type="email" fullWidth margin="normal" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <TextField label="Contraseña" type="password" fullWidth margin="normal" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <Button type="submit" variant="contained" fullWidth size="large" sx={{ mt: 2.5 }} disabled={loading}>
                {loading ? 'Procesando…' : 'Crear cuenta'}
              </Button>
            </form>
          )}
        </Paper>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 3 }}>
          De una idea en lenguaje natural a un modelo PIM
        </Typography>
      </Container>
    </Box>
  );
}
