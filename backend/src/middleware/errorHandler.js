/**
 * Centralized Error & 404 Handlers
 */

function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    error: `Cannot ${req.method} ${req.originalUrl}. Route not found.`
  });
}

function errorHandler(err, req, res, next) {
  console.error('[Error Middleware]:', err);

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'An unexpected internal server error occurred.';

  // Handle SQLite and PostgreSQL foreign key constraint errors (Postgres code 23503)
  if (
    err.code === '23503' ||
    (err.message && (err.message.includes('FOREIGN KEY constraint failed') || err.message.includes('violates foreign key constraint')))
  ) {
    return res.status(400).json({
      success: false,
      error: 'Foreign key constraint failed. Referenced resource does not exist.',
      details: err.message
    });
  }

  // Handle SQLite and PostgreSQL unique constraint errors (Postgres code 23505)
  if (
    err.code === '23505' ||
    (err.message && (err.message.includes('UNIQUE constraint failed') || err.message.includes('violates unique constraint')))
  ) {
    return res.status(409).json({
      success: false,
      error: 'Duplicate record. Unique constraint violated.',
      details: err.message
    });
  }

  res.status(status).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
}

module.exports = {
  notFoundHandler,
  errorHandler
};
