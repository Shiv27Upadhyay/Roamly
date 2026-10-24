/**
 * Roamly Authentication & Session Middleware
 * Validates JWT sessions, enforces authorization on state-changing routes,
 * and guards against CSRF attacks.
 */

const jwt = require('jsonwebtoken');
const { getDb } = require('../config/db');

const COOKIE_NAME = 'roamly_session';

/**
 * Returns JWT secret from environment, ensuring it exists.
 */
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured in backend environment.');
  }
  return secret;
}

/**
 * Signs a session JWT for an authenticated user.
 */
function signSessionToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name,
    username: user.username
  };
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' });
}

/**
 * Sets the HttpOnly session cookie on the response.
 */
function setSessionCookie(res, token) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
}

/**
 * Clears the session cookie.
 */
function clearSessionCookie(res) {
  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/'
  });
}

/**
 * Extracts session token from cookie or Authorization Bearer header.
 */
function extractToken(req) {
  if (req.cookies && req.cookies[COOKIE_NAME]) {
    return req.cookies[COOKIE_NAME];
  }
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return null;
}

/**
 * Global optional authentication middleware.
 * Verifies session if provided, attaching req.user.
 * If no session or invalid, leaves req.user = null and passes through.
 * Strictly ignores spoofed x-user-id and user_id params.
 */
async function optionalAuth(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) {
      req.user = null;
      return next();
    }

    let decoded;
    try {
      decoded = jwt.verify(token, getJwtSecret());
    } catch {
      // Expired or invalid signature -> unauthenticated session
      req.user = null;
      return next();
    }

    if (!decoded || !decoded.id) {
      req.user = null;
      return next();
    }

    const db = getDb();
    const user = await db.prepare(`
      SELECT id, name, username, email, avatar_url, bio, home_city, google_id, created_at
      FROM users
      WHERE id = ?
    `).get(decoded.id);

    req.user = user || null;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Enforces mandatory authentication on protected endpoints.
 * Includes CSRF origin validation for state-changing requests.
 */
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please sign in to perform this action.'
    });
  }

  // CSRF validation for mutating methods (POST, PUT, DELETE, PATCH)
  const mutatingMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
  if (mutatingMethods.includes(req.method)) {
    const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
    const requestOrigin = req.headers['origin'];
    const requestReferer = req.headers['referer'];

    // If an Origin header is present (standard for cross-origin or fetch), verify it matches
    if (requestOrigin && requestOrigin !== allowedOrigin) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: CSRF validation failed (unauthorized origin).'
      });
    }

    // If Origin is missing but Referer is present, verify Referer starts with allowed origin
    if (!requestOrigin && requestReferer && !requestReferer.startsWith(allowedOrigin)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: CSRF validation failed (unauthorized referer).'
      });
    }
  }

  next();
}

module.exports = {
  COOKIE_NAME,
  signSessionToken,
  setSessionCookie,
  clearSessionCookie,
  optionalAuth,
  requireAuth
};
