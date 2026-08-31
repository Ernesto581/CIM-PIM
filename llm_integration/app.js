require('dotenv').config();
const express = require('express');
const cors = require('cors');
const logger = require('./utils/logger');
const routes = require('./routes');

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.use('/api/llm', routes);

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => logger.info(`llm_integration listening on port ${PORT}`));
