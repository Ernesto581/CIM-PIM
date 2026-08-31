const mongoose = require('mongoose');

const etapaSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    nombre: { type: String, required: true },
    nivel: { type: String, default: '' },
    contenido: { type: String, default: '' },
    uml: { type: String, default: '' },
    estado: { type: String, default: 'Edición' }
  },
  { _id: false }
);

const proyectoSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true },
    descripcion: { type: String, default: '' },
    estado: { type: String, default: 'Edición' },
    creador: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    etapas: { type: [etapaSchema], default: [] }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Proyecto', proyectoSchema);
