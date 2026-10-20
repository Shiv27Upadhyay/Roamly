/**
 * Roamly Express Application Entry Point
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { getDb, closeDb } = require('./config/db');
const { seedDatabase } = require('./config/seed');
const { resolveUser } = require('./middleware/validate');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const apiRoutes = require('./routes/index');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Database & Auto-seed if empty
const db = getDb();
seedDatabase(false); // Only seeds if destinations table is empty

// Global Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// User context resolution
app.use(resolveUser);

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
