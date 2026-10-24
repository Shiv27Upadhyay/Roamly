/**
 * In-Memory Sliding Rate Limiter for Sensitive Operations
 * Protects short invitation code endpoints against brute-force enumeration.
 */

const failedAttemptsMap = new Map();

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_FAILED_ATTEMPTS = 10;

/**
 * Gets identifier key for rate limiting (user ID or client IP).
 */
function getClientKey(req) {
  if (req.user && req.user.id) {
    return `user:${req.user.id}`;
  }
  return `ip:${req.ip || req.connection.remoteAddress || 'unknown'}`;
}

/**
 * Cleans up expired timestamps in a list.
 */
function cleanExpired(timestamps, now) {
  return timestamps.filter(t => now - t < WINDOW_MS);
}

/**
 * Middleware that checks if client has exceeded allowed failed attempts.
 */
function checkJoinRateLimit(req, res, next) {
  const key = getClientKey(req);
  const now = Date.now();
  const history = failedAttemptsMap.get(key) || [];
  const activeHistory = cleanExpired(history, now);

  if (activeHistory.length >= MAX_FAILED_ATTEMPTS) {
    const oldest = activeHistory[0];
    const retryAfterSec = Math.ceil((WINDOW_MS - (now - oldest)) / 1000);
    res.setHeader('Retry-After', String(retryAfterSec));
    return res.status(429).json({
      success: false,
      error: `Too many invalid invitation attempts. Please wait ${retryAfterSec} seconds before trying again.`
    });
  }

  // Attach key and reporter to req for controller use
  req.rateLimitKey = key;
  next();
}

/**
 * Records a failed join attempt for the request client.
 */
function recordFailedAttempt(key) {
  const now = Date.now();
  const history = failedAttemptsMap.get(key) || [];
  const activeHistory = cleanExpired(history, now);
  activeHistory.push(now);
  failedAttemptsMap.set(key, activeHistory);
}

/**
 * Resets failed attempts after a successful operation.
 */
function resetFailedAttempts(key) {
  failedAttemptsMap.delete(key);
}

/**
 * Clears all rate limit memory (useful for isolated tests).
 */
function clearRateLimits() {
  failedAttemptsMap.clear();
}

module.exports = {
  checkJoinRateLimit,
  recordFailedAttempt,
  resetFailedAttempts,
  clearRateLimits,
  MAX_FAILED_ATTEMPTS,
  WINDOW_MS
};
