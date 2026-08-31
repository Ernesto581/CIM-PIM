const User = require('./models/User');
const logger = require('./utils/logger');

async function seed() {
  const exists = await User.findOne({ username: 'admin' });
  if (!exists) {
    await User.create({
      nombre: 'Admin',
      apellidos: 'Sistema',
      username: 'admin',
      email: 'admin@jmda.cu',
      password: 'admin123',
      rol: 'admin'
    });
    logger.info('Usuario admin creado (admin / admin123)');
  }
}

module.exports = seed;
