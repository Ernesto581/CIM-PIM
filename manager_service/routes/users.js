const express = require('express');
const router = express.Router();
const users = require('../controllers/users');

router.get('/', users.list);
router.post('/', users.create);
router.delete('/:id', users.remove);

module.exports = router;
