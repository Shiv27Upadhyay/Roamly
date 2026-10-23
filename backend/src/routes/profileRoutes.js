const express = require('express');
const router = express.Router();
const { getUserProfile } = require('../controllers/profileController');
const { validateIdParam } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');

// Profile for current active user
router.get('/', requireAuth, getUserProfile);

// Profile for a specific user ID (public)
router.get('/:id', validateIdParam('id'), getUserProfile);

module.exports = router;
