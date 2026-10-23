const express = require('express');
const router = express.Router();
const {
  getUserBookmarks,
  deleteComment
} = require('../controllers/interactionController');
const { validateIdParam } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');

// Bookmarks listing for active user
router.get('/bookmarks', requireAuth, getUserBookmarks);

// Delete comment (verified author ownership)
router.delete('/comments/:id', requireAuth, validateIdParam('id'), deleteComment);

module.exports = router;
