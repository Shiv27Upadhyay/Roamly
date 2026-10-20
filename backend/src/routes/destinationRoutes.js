const express = require('express');
const router = express.Router();
const { getAllDestinations, getDestinationById } = require('../controllers/destinationController');
const { toggleBookmark } = require('../controllers/interactionController');
const { validateIdParam } = require('../middleware/validate');

// Catalog & Detail
router.get('/', getAllDestinations);
router.get('/:id', validateIdParam('id'), getDestinationById);

// Bookmark / Wishlist toggle
router.post('/:id/bookmark', validateIdParam('id'), toggleBookmark);

module.exports = router;
