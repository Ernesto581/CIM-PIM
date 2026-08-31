require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const logger = require('./utils/logger');

const app = express();
app.use(cors());

app.use(
  '/api/llm',
  createProxyMiddleware({
    target: 'http://llm_integration:3002',
    changeOrigin: true
  })
);

app.use(
  '/api/manager',
  createProxyMiddleware({
    target: 'http://manager_service:3003',
    changeOrigin: true
  })
);

app.get('/status', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => logger.info(`api_gateway listening on port ${PORT}`));
