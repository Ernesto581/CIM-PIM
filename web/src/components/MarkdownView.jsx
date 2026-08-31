import ReactMarkdown from 'react-markdown';
import { Paper, Typography } from '@mui/material';

export default function MarkdownView({ content }) {
  if (!content) {
    return (
      <Typography variant="body2" color="text.secondary">
        Sin contenido todavía.
      </Typography>
    );
  }
  return (
    <Paper variant="outlined" sx={{ p: 2, maxHeight: 520, overflow: 'auto' }}>
      <ReactMarkdown>{content}</ReactMarkdown>
    </Paper>
  );
}
