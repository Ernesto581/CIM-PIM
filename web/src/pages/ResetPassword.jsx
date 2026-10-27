import { useState, useEffect } from 'react';
import { Box, Paper, TextField, Button, Typography, Alert, Container } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase deja la sesión de recovery disponible al cargar la página con el hash
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) setReady(true);
      else setError('El enlace de recuperación no es válido o ha caducado.');
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) setError(error.message);
    else {
      setInfo('Contraseña actualizada correctamente. Redirigiendo…');
      setTimeout(() => navigate('/'), 1500);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', px: 2 }}>
      <Container maxWidth="xs" sx={{ p: 0 }}>
        <Box className="rise" sx={{ textAlign: 'center', mb: 3 }}>
          <Typography className="serif-display" sx={{ fontSize: 34, color: '#eae6dc' }}>
            jMDA
          </Typography>
          <Typography className="eyebrow" sx={{ mt: 0.5 }}>
            Recuperación de contraseña
          </Typography>
        </Box>

        <Paper elevation={0} className="rise rise-1" sx={{ p: 3.5, background: '#141b24' }}>
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

          {ready ? (
            <form onSubmit={handleSubmit}>
              <TextField
                label="Nueva contraseña"
                type="password"
                fullWidth
                margin="normal"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <TextField
                label="Confirmar contraseña"
                type="password"
                fullWidth
                margin="normal"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
              <Button type="submit" variant="contained" fullWidth size="large" sx={{ mt: 2.5 }} disabled={loading}>
                {loading ? 'Actualizando…' : 'Actualizar contraseña'}
              </Button>
            </form>
          ) : (
            !error && <Typography variant="body2" color="text.secondary">Verificando enlace…</Typography>
          )}
        </Paper>
      </Container>
    </Box>
  );
}
