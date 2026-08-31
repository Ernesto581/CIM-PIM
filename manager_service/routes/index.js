const express = require('express');
const router = express.Router();
const userRoutes = require('./users');
const proyectoRoutes = require('./proyectos');

router.use('/users', userRoutes);
router.use('/proyectos', proyectoRoutes);

module.exports = router;
