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
  createTripGroup,
  getTripGroup,
  getTripGroupQr,
  rotateGroupInvite,
  updateGroupInviteStatus,
  removeGroupMember
} = require('../controllers/groupController');
const {
  getTripMedia,
  getUploadSignature,
  registerMedia,
  deleteMedia
} = require('../controllers/mediaController');
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

// Group Trip Management
router.post('/:id/group', requireAuth, validateIdParam('id'), createTripGroup);
router.get('/:id/group', requireAuth, validateIdParam('id'), getTripGroup);
router.get('/:id/group/qr', requireAuth, validateIdParam('id'), getTripGroupQr);
router.post('/:id/group/invite/rotate', requireAuth, validateIdParam('id'), rotateGroupInvite);
router.patch('/:id/group/invite/status', requireAuth, validateIdParam('id'), updateGroupInviteStatus);
router.delete('/:id/group/members/:userId', requireAuth, validateIdParam('id'), validateIdParam('userId'), removeGroupMember);

// Trip Media Management (Photos & Videos)
router.get('/:id/media', validateIdParam('id'), getTripMedia);
router.post('/:id/media/signature', requireAuth, validateIdParam('id'), getUploadSignature);
router.post('/:id/media', requireAuth, validateIdParam('id'), registerMedia);
router.delete('/:id/media/:mediaId', requireAuth, validateIdParam('id'), validateIdParam('mediaId'), deleteMedia);

module.exports = router;
