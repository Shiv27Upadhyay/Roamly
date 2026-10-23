const express = require('express');
const router = express.Router();
const {
  getAllTrips,
  getTripById,
  createTrip,
  updateTrip,
  deleteTrip
} = require('../controllers/tripController');
const {
  toggleTripLike,
  addTripComment
} = require('../controllers/interactionController');
const {
  validateIdParam,
  validateTripPayload,
  validateCommentPayload
} = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');

// Trip CRUD
router.get('/', getAllTrips);
router.get('/:id', validateIdParam('id'), getTripById);
router.post('/', requireAuth, validateTripPayload(false), createTrip);
router.put('/:id', requireAuth, validateIdParam('id'), validateTripPayload(true), updateTrip);
router.delete('/:id', requireAuth, validateIdParam('id'), deleteTrip);

// Interactions on Trips
router.post('/:id/like', requireAuth, validateIdParam('id'), toggleTripLike);
router.post('/:id/comments', requireAuth, validateIdParam('id'), validateCommentPayload, addTripComment);

module.exports = router;
