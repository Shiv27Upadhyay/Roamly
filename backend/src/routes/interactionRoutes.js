const express = require('express');
const router = express.Router();
const {
  getUserBookmarks,
  deleteComment
} = require('../controllers/interactionController');
const { validateIdParam } = require('../middleware/validate');

// Bookmarks listing for active user
router.get('/bookmarks', getUserBookmarks);

// Delete comment (verified author ownership)
router.delete('/comments/:id', validateIdParam('id'), deleteComment);

module.exports = router;
