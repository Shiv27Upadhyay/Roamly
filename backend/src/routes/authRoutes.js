/**
 * Roamly Authentication Routes
 */

const express = require('express');
const router = express.Router();
const { loginWithGoogle, getMe, logout } = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

// Google Identity Services sign-in / registration
router.post('/google', loginWithGoogle);

// Active authenticated user profile
router.get('/me', requireAuth, getMe);

// End active session
router.post('/logout', requireAuth, logout);

module.exports = router;
