import plantumlEncoder from 'plantuml-encoder';
import { Box, Typography } from '@mui/material';

export default function PlantUMLViewer({ uml, height = 480 }) {
  if (!uml || !uml.includes('@startuml')) {
    return (
      <Typography variant="body2" color="text.secondary">
        No hay diagrama. Genera el modelo o escribe código PlantUML.
      </Typography>
    );
  }

  const encoded = plantumlEncoder.encode(uml);
  const svgUrl = `/plantuml/svg/${encoded}`;
  const pngUrl = `/plantuml/png/${encoded}`;

  return (
    <Box>
      <Box
        sx={{
          border: '1px solid #e0e0e0',
          borderRadius: 1,
          overflow: 'auto',
          bgcolor: '#fff',
          p: 1,
          minHeight: height
        }}
      >
        <img
          src={svgUrl}
          alt="Diagrama PlantUML"
          style={{ maxWidth: '100%', display: 'block' }}
        />
      </Box>
      <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
        <a href={svgUrl} target="_blank" rel="noreferrer">
          Abrir SVG
        </a>
        <a href={pngUrl} download="diagrama.png">
          Descargar PNG
        </a>
      </Box>
    </Box>
  );
}
