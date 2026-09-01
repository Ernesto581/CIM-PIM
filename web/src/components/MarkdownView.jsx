import ReactMarkdown from 'react-markdown';
import { Box, Typography } from '@mui/material';

export default function MarkdownView({ content, height = 420 }) {
  if (!content) {
    return (
      <Typography variant="body2" color="text.secondary">
        Sin contenido todavía.
      </Typography>
    );
  }
  return (
    <Box
      className="paper"
      sx={{ p: 2.5, maxHeight: height, overflow: 'auto', boxShadow: '0 18px 40px -22px rgba(0,0,0,0.7)' }}
    >
      <Box className="markdown-body">
        <ReactMarkdown>{content}</ReactMarkdown>
      </Box>
    </Box>
  );
}
