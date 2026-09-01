import plantumlEncoder from 'plantuml-encoder';
import { Box, Typography } from '@mui/material';

const BASE = import.meta.env.VITE_PLANTUML_URL || 'https://www.plantuml.com/plantuml';

export default function PlantUMLViewer({ uml, height = 460 }) {
  if (!uml || !uml.includes('@startuml')) {
    return (
      <Box className="paper" sx={{ p: 3, textAlign: 'center', minHeight: 140, display: 'grid', placeItems: 'center' }}>
        <Box>
          <Typography variant="body2" sx={{ color: '#8a8375' }}>
            No hay diagrama todavía.
          </Typography>
          <Typography variant="caption" sx={{ color: '#b3ab9c' }}>
            Genera el modelo con la IA o escribe código PlantUML.
          </Typography>
        </Box>
      </Box>
    );
  }

  const encoded = plantumlEncoder.encode(uml);
  const svgUrl = `${BASE}/svg/${encoded}`;
  const pngUrl = `${BASE}/png/${encoded}`;

  return (
    <Box>
      <Box
        className="paper"
        sx={{
          p: 1.5,
          minHeight: height,
          overflow: 'auto',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center'
        }}
      >
        <img src={svgUrl} alt="Diagrama PlantUML" style={{ maxWidth: '100%', height: 'auto' }} />
      </Box>
      <Box sx={{ mt: 1.2, display: 'flex', gap: 1.5 }}>
        <a href={svgUrl} target="_blank" rel="noreferrer" style={{ color: '#6c93e8', fontSize: 13, textDecoration: 'none' }}>
          Abrir SVG
        </a>
        <a href={pngUrl} target="_blank" rel="noreferrer" download="diagrama.png" style={{ color: '#6c93e8', fontSize: 13, textDecoration: 'none' }}>
          Descargar PNG
        </a>
      </Box>
    </Box>
  );
}
