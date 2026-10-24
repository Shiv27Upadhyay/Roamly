/**
 * Roamly Express Application Entry Point
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const { getDb, closeDb, isPostgres } = require('./config/db');
const { seedDatabase } = require('./config/seed');
const { optionalAuth } = require('./middleware/auth');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const apiRoutes = require('./routes/index');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;
const FRONTEND_ORIGIN = process.env.FRONTEND_URL || 'http://localhost:5173';

// Initialize Database & Auto-seed if empty (offline SQLite mode only)
const db = getDb();
if (!isPostgres()) {
  seedDatabase(false);
}

// Security & Parsing Global Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(cors({
  origin: FRONTEND_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-share-token']
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Global user session resolution (validates JWT, leaves req.user = null if unauthenticated)
app.use(optionalAuth);

// Mount API Routes
app.use('/api', apiRoutes);

// Root Welcome Route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    name: 'Roamly Travel API',
    tagline: 'Discover. Plan. Remember.',
    version: '1.0.0',
    documentation: '/api/health'
  });
});

// 404 & Centralized Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

// Server startup
let server = null;
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, () => {
    console.log(`[Roamly Backend] Server running on http://localhost:${PORT}`);
    console.log(`[Roamly Backend] Health check: http://localhost:${PORT}/api/health`);
  });
}

// Graceful Shutdown
function handleShutdown(signal) {
  console.log(`\nReceived ${signal}. Gracefully closing database and server...`);
  if (server) {
    server.close(() => {
      closeDb();
      console.log('Server and database closed. Clean exit.');
      process.exit(0);
    });
  } else {
    closeDb();
    process.exit(0);
  }
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

module.exports = { app, server };
