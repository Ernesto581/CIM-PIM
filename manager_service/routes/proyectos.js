const express = require('express');
const router = express.Router();
const proyectos = require('../controllers/proyectos');

router.get('/', proyectos.list);
router.post('/', proyectos.create);
router.get('/:id', proyectos.get);
router.put('/:id', proyectos.update);
router.delete('/:id', proyectos.remove);

module.exports = router;
