/**
 * Group Routes
 * Handles group joining via invite code or invite token.
 */

const express = require('express');
const router = express.Router();
const { joinGroup, getGroupInvitationPreview } = require('../controllers/groupController');
const { requireAuth } = require('../middleware/auth');
const { checkJoinRateLimit } = require('../middleware/rateLimiter');

// GET /api/groups/preview - Safe trip preview for invitation links and codes
router.get('/preview', getGroupInvitationPreview);

// POST /api/groups/join - Authenticated user joins a group trip via code or token
router.post('/join', requireAuth, checkJoinRateLimit, joinGroup);

module.exports = router;
