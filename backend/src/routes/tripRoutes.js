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

// Trip CRUD
router.get('/', getAllTrips);
router.get('/:id', validateIdParam('id'), getTripById);
router.post('/', validateTripPayload(false), createTrip);
router.put('/:id', validateIdParam('id'), validateTripPayload(true), updateTrip);
router.delete('/:id', validateIdParam('id'), deleteTrip);

// Interactions on Trips
router.post('/:id/like', validateIdParam('id'), toggleTripLike);
router.post('/:id/comments', validateIdParam('id'), validateCommentPayload, addTripComment);

module.exports = router;
