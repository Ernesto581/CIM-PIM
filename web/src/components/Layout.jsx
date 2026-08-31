import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';

export default function Layout({ children }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            <Link to="/" style={{ color: '#fff', textDecoration: 'none' }}>
              jMDA · Módulo CIM-PIM
            </Link>
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>
            {user?.email}
          </Typography>
          <Button
            color="inherit"
            onClick={async () => {
              await signOut();
              navigate('/login');
            }}
          >
            Salir
          </Button>
        </Toolbar>
      </AppBar>
      <Box sx={{ p: 2 }}>{children}</Box>
    </Box>
  );
}
