const Proyecto = require('../models/Proyecto');

exports.list = async (req, res) => {
  const proyectos = await Proyecto.find().sort({ createdAt: -1 });
  res.json(proyectos);
};

exports.get = async (req, res) => {
  const p = await Proyecto.findById(req.params.id);
  if (!p) return res.status(404).json({ error: 'Proyecto no encontrado' });
  res.json(p);
};

exports.create = async (req, res) => {
  try {
    const { nombre, descripcion } = req.body || {};
    if (!nombre) return res.status(400).json({ error: 'El nombre del proyecto es requerido' });
    const proyecto = await Proyecto.create({ nombre, descripcion, creador: req.user.id });
    res.status(201).json(proyecto);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { nombre, descripcion, etapas, estado } = req.body || {};
    const p = await Proyecto.findById(req.params.id);
    if (!p) return res.status(404).json({ error: 'Proyecto no encontrado' });
    if (nombre !== undefined) p.nombre = nombre;
    if (descripcion !== undefined) p.descripcion = descripcion;
    if (estado !== undefined) p.estado = estado;
    if (etapas !== undefined) p.etapas = etapas;
    await p.save();
    res.json(p);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

exports.remove = async (req, res) => {
  await Proyecto.findByIdAndDelete(req.params.id);
  res.json({ message: 'Proyecto eliminado satisfactoriamente' });
};
