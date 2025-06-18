const express = require('express');
const router = express.Router();
const sneakerController = require('../controllers/sneakerController');

router.get('/', sneakerController.getAllSneakers);

module.exports = router;