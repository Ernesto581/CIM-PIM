import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#e0a45c', contrastText: '#16100a' },
    secondary: { main: '#6c93e8' },
    success: { main: '#7fb78a' },
    error: { main: '#e07a6a' },
    warning: { main: '#e0b45c' },
    background: { default: '#0d1117', paper: '#141b24' },
    text: { primary: '#eae6dc', secondary: '#93a0b0' },
    divider: 'rgba(234,230,220,0.08)'
  },
  typography: {
    fontFamily: '"Sora", sans-serif',
    h1: { fontFamily: '"Fraunces", serif', fontWeight: 600, letterSpacing: '-0.02em' },
    h2: { fontFamily: '"Fraunces", serif', fontWeight: 600, letterSpacing: '-0.02em' },
    h3: { fontFamily: '"Fraunces", serif', fontWeight: 600 },
    h4: { fontFamily: '"Fraunces", serif', fontWeight: 600 },
    h5: { fontFamily: '"Fraunces", serif', fontWeight: 600 },
    h6: { fontFamily: '"Fraunces", serif', fontWeight: 600 },
    button: { fontWeight: 600, letterSpacing: '0.01em' }
  },
  shape: { borderRadius: 14 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { background: '#0d1117' }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', borderRadius: 10, padding: '8px 18px' }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid rgba(234,230,220,0.07)'
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, letterSpacing: '0.02em' }
      }
    }
  }
});
