const jwt = require('jsonwebtoken');
const User = require('../models/User');

function sign(user) {
  return jwt.sign(
    { id: user._id, username: user.username, rol: user.rol },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );
}

exports.login = async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  }
  const user = await User.findOne({ username });
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }
  res.json({ token: sign(user), user });
};

exports.register = async (req, res) => {
  try {
    const { nombre, apellidos, username, email, password, rol } = req.body || {};
    if (!nombre || !username || !email || !password) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }
    const exists = await User.findOne({ $or: [{ username }, { email }] });
    if (exists) {
      return res.status(409).json({ error: 'El usuario o email ya existe' });
    }
    const user = await User.create({
      nombre,
      apellidos,
      username,
      email,
      password,
      rol: rol || 'cliente'
    });
    res.status(201).json({ token: sign(user), user });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};
