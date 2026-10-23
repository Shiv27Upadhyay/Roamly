/**
 * Cryptographic Token Utilities
 * Generates and validates high-entropy tokens for unlisted trip access.
 */

const crypto = require('crypto');

/**
 * Generates a cryptographically secure, URL-safe 32-character base64url token (192 bits of entropy).
 */
function generateShareToken() {
  return crypto.randomBytes(24).toString('base64url');
}

/**
 * Validates a user-provided token against the stored secret token using constant-time comparison.
 */
function isValidShareToken(providedToken, actualToken) {
  if (!providedToken || !actualToken) return false;
  if (typeof providedToken !== 'string' || typeof actualToken !== 'string') return false;

  const bufProvided = Buffer.from(providedToken);
  const bufActual = Buffer.from(actualToken);

  if (bufProvided.length !== bufActual.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufProvided, bufActual);
}

module.exports = {
  generateShareToken,
  isValidShareToken
};
