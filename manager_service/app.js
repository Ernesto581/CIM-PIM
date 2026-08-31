require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./config/db');
const logger = require('./utils/logger');
const publicRoutes = require('./routes/noauth');
const protectedRoutes = require('./routes/index');
const auth = require('./middlewares/auth');
const seed = require('./seed');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api/manager/public', publicRoutes);
app.use('/api/manager', auth.verificarToken, protectedRoutes);

app.get('/status', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3003;

db.connect()
  .then(async () => {
    await seed();
    app.listen(PORT, () => logger.info(`manager_service listening on port ${PORT}`));
  })
  .catch((err) => logger.error('mongo connect error:', err.message));
