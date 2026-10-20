const express = require('express');
const router = express.Router();
const { getUserProfile } = require('../controllers/profileController');
const { validateIdParam } = require('../middleware/validate');

// Profile for current active user
router.get('/', getUserProfile);

// Profile for a specific user ID
router.get('/:id', validateIdParam('id'), getUserProfile);

module.exports = router;
