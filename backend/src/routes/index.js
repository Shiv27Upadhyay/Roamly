const express = require('express');
const router = express.Router();

const destinationRoutes = require('./destinationRoutes');
const tripRoutes = require('./tripRoutes');
const interactionRoutes = require('./interactionRoutes');
const profileRoutes = require('./profileRoutes');
const authRoutes = require('./authRoutes');
const groupRoutes = require('./groupRoutes');

// API Health Check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Roamly Travel API is running smoothly.',
    timestamp: new Date().toISOString(),
    active_user: req.user ? { id: req.user.id, name: req.user.name, username: req.user.username } : null
  });
});

// Resource Sub-routers
router.use('/auth', authRoutes);
router.use('/destinations', destinationRoutes);
router.use('/trips', tripRoutes);
router.use('/groups', groupRoutes);
router.use('/', interactionRoutes); // mounts /bookmarks and /comments/:id
router.use('/profile', profileRoutes);

module.exports = router;
