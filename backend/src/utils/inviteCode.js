/**
 * Roamly Cryptographic Group Invitation Utilities
 *
 * Provides human-friendly, collision-resistant invitation codes and 192-bit URL tokens.
 *
 * Code Specification:
 * - Alphabet: '23456789ABCDEFGHJKLMNPQRSTUVWXYZ' (32 unambiguous alphanumeric characters, 5 bits/char)
 * - Format: 'ROAM-XXXX' (e.g., 'ROAM-7K9P')
 * - Total Length: 9 characters (5 prefix + 4 random characters)
 * - Entropy: 20 bits of cryptographic randomness (32^4 = 1,048,576 combinations)
 * - Protection: 5-attempt retry loop on collision, rate limiting on join endpoint, and DB UNIQUE constraints.
 *
 * Token Specification:
 * - Format: 32-character base64url string (reused from backend/src/utils/token.js)
 * - Entropy: 192 bits of cryptographic randomness (24 random bytes)
 */

const crypto = require('crypto');
const { generateShareToken, isValidShareToken } = require('./token');

const UNAMBIGUOUS_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const DEFAULT_PREFIX = 'ROAM-';
const DEFAULT_RANDOM_LENGTH = 4;
const MAX_COLLISION_RETRIES = 5;

/**
 * Generates a human-friendly invite code using unbiased cryptographic random selection.
 * @param {number} randomLength - Number of random characters (default 4)
 * @param {string} prefix - Optional prefix (default 'ROAM-')
 * @returns {string} Formatted invite code (e.g., 'ROAM-7K9P')
 */
function generateInviteCode(randomLength = DEFAULT_RANDOM_LENGTH, prefix = DEFAULT_PREFIX) {
  const bytes = crypto.randomBytes(randomLength);
  let randomPart = '';
  for (let i = 0; i < randomLength; i++) {
    // 32-character alphabet: index = byte & 0x1F (0..31, zero bias)
    const index = bytes[i] & 0x1F;
    randomPart += UNAMBIGUOUS_ALPHABET[index];
  }
  return `${prefix}${randomPart}`;
}

/**
 * Normalizes user-submitted invite codes (trims whitespace, converts to uppercase).
 * @param {string} code
 * @returns {string}
 */
function normalizeInviteCode(code) {
  if (typeof code !== 'string') return '';
  let cleaned = code.trim().toUpperCase();
  if (cleaned.length === 4 && !cleaned.includes('-')) {
    cleaned = `ROAM-${cleaned}`;
  }
  return cleaned;
}

/**
 * Generates an invite code guaranteed unique in the database, with retry limit.
 * @param {object} db - SQLite database instance
 * @param {number} maxAttempts - Max retry attempts (default 5)
 * @returns {string} Unique invite code
 */
function generateUniqueInviteCode(db, maxAttempts = MAX_COLLISION_RETRIES) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const candidate = generateInviteCode();
    const existing = db.prepare('SELECT 1 FROM trip_groups WHERE invite_code = ?').get(candidate);
    if (!existing) {
      return candidate;
    }
  }
  throw new Error(`Failed to generate a unique invite code after ${maxAttempts} collision attempts.`);
}

/**
 * Generates a unique 192-bit invitation token for URLs and QR codes.
 * Reuses the proven token generator from token.js.
 * @param {object} db - SQLite database instance
 * @param {number} maxAttempts - Max retry attempts (default 5)
 * @returns {string} Unique invite token
 */
function generateUniqueInviteToken(db, maxAttempts = MAX_COLLISION_RETRIES) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const candidate = generateShareToken();
    const existing = db.prepare('SELECT 1 FROM trip_groups WHERE invite_token = ?').get(candidate);
    if (!existing) {
      return candidate;
    }
  }
  throw new Error(`Failed to generate a unique invite token after ${maxAttempts} collision attempts.`);
}

module.exports = {
  UNAMBIGUOUS_ALPHABET,
  DEFAULT_PREFIX,
  DEFAULT_RANDOM_LENGTH,
  MAX_COLLISION_RETRIES,
  generateInviteCode,
  normalizeInviteCode,
  generateUniqueInviteCode,
  generateUniqueInviteToken,
  generateInviteToken: generateShareToken,
  isValidInviteToken: isValidShareToken
};
