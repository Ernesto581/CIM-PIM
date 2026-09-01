import { Box, Button, Typography, Container } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';

export default function Layout({ children }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <Box className="app-shell">
      <Box
        component="header"
        sx={{
          borderBottom: '1px solid rgba(234,230,220,0.08)',
          background: 'rgba(13,17,23,0.7)',
          backdropFilter: 'blur(10px)',
          position: 'sticky',
          top: 0,
          zIndex: 20
        }}
      >
        <Container maxWidth="xl">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.6 }}>
            <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
              <Box
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  display: 'grid',
                  placeItems: 'center',
                  background: 'linear-gradient(135deg,#e0a45c,#c07a2f)',
                  color: '#16100a',
                  fontFamily: '"Fraunces", serif',
                  fontWeight: 700,
                  fontSize: 18
                }}
              >
                j
              </Box>
              <Box>
                <Typography className="serif-display" sx={{ color: '#eae6dc', fontSize: 18, lineHeight: 1.1 }}>
                  jMDA
                </Typography>
                <Typography className="eyebrow" sx={{ fontSize: 9 }}>
                  Módulo CIM-PIM
                </Typography>
              </Box>
            </Link>

            <Box sx={{ flexGrow: 1 }} />

            {user && (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ fontFamily: '"JetBrains Mono", monospace' }}>
                  {user.email}
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={async () => {
                    await signOut();
                    navigate('/login');
                  }}
                >
                  Salir
                </Button>
              </>
            )}
          </Box>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ flexGrow: 1, py: 3 }}>
        {children}
      </Container>
    </Box>
  );
}
