const User = require('../models/User');

exports.list = async (req, res) => {
  const users = await User.find();
  res.json(users);
};

exports.create = async (req, res) => {
  try {
    const { nombre, apellidos, username, email, password, rol } = req.body || {};
    const user = await User.create({ nombre, apellidos, username, email, password, rol });
    res.status(201).json(user);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

exports.remove = async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: 'Usuario eliminado satisfactoriamente' });
};
