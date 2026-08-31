import { Routes, Route, Navigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { useAuth } from './context/AuthProvider';
import Login from './pages/Login';
import Proyectos from './pages/Proyectos';
import Wizard from './pages/Wizard';

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Proyectos />
          </RequireAuth>
        }
      />
      <Route
        path="/proyecto/:id"
        element={
          <RequireAuth>
            <Wizard />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
