/**
 * Roamly Authentication Controller
 * Handles Google Identity Services ID-token verification, safe account linking,
 * session creation, user profile resolution, and logout.
 */

const { OAuth2Client } = require('google-auth-library');
const { getDb } = require('../config/db');
const { signSessionToken, setSessionCookie, clearSessionCookie } = require('../middleware/auth');

const DEMO_EMAILS = ['elena@roamly.local', 'marcus@roamly.local'];

let oauthClientInstance = null;
function getOAuthClient() {
  if (!oauthClientInstance) {
    oauthClientInstance = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }
  return oauthClientInstance;
}

/**
 * Verifies Google ID-token credential, safely links or creates a user,
 * and sets an HttpOnly session cookie.
 */
async function loginWithGoogle(req, res, next) {
  try {
    const { credential } = req.body;
    if (!credential || typeof credential !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Google ID token credential is required.'
      });
    }

    const client = getOAuthClient();
    let ticket;
    try {
      ticket = await client.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID
      });
    } catch (verifyErr) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired Google credential.',
        details: verifyErr.message
      });
    }

    const payload = ticket.getPayload();
    if (!payload || !payload.sub || !payload.email) {
      return res.status(400).json({
        success: false,
        error: 'Google credential payload is missing subject or email.'
      });
    }

    // Mandatory requirement: Email must be verified by Google
    if (!payload.email_verified) {
      return res.status(403).json({
        success: false,
        error: 'Google email address is not verified. A verified email is required to sign in.'
      });
    }

    const googleId = payload.sub;
    const emailLower = payload.email.toLowerCase().trim();
    const db = getDb();

    let user = null;

    // 1. Check if user already exists with this google_id
    user = db.prepare(`
      SELECT id, name, username, email, avatar_url, bio, home_city, google_id, created_at
      FROM users
      WHERE google_id = ?
    `).get(googleId);

    if (!user) {
      // 2. Check if an account already exists with this email
      const existingByEmail = db.prepare(`
        SELECT id, name, username, email, avatar_url, bio, home_city, google_id, created_at
        FROM users
        WHERE LOWER(email) = ?
      `).get(emailLower);

      if (existingByEmail) {
        // Safe account-linking safeguards:
        // Never automatically link demo accounts (.local) to external Google identities
        const isDemo = DEMO_EMAILS.includes(emailLower) || emailLower.endsWith('.local');

        if (isDemo) {
          // Create a new separate user for the Google identity to protect demo data
          user = createNewGoogleUser(db, payload, googleId, emailLower);
        } else if (existingByEmail.google_id && existingByEmail.google_id !== googleId) {
          // Conflict: Existing account is already permanently bound to another Google identity
          return res.status(409).json({
            success: false,
            error: 'Account linking conflict: this email is already linked to another Google identity.'
          });
        } else {
          // Safe link: Verified email with no existing conflicting Google link
          db.prepare(`
            UPDATE users
            SET google_id = ?,
                avatar_url = COALESCE(avatar_url, ?)
            WHERE id = ?
          `).run(googleId, payload.picture || null, existingByEmail.id);

          user = db.prepare(`
            SELECT id, name, username, email, avatar_url, bio, home_city, google_id, created_at
            FROM users
            WHERE id = ?
          `).get(existingByEmail.id);
        }
      } else {
        // 3. Brand new user
        user = createNewGoogleUser(db, payload, googleId, emailLower);
      }
    }

    // Generate JWT and set HttpOnly cookie
    const token = signSessionToken(user);
    setSessionCookie(res, token);

    res.status(200).json({
      success: true,
      message: 'Signed in successfully with Google.',
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        avatar_url: user.avatar_url,
        bio: user.bio,
        home_city: user.home_city
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Derives a unique username and inserts a new user record.
 */
function createNewGoogleUser(db, payload, googleId, emailLower) {
  let baseUsername = emailLower.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');
  if (baseUsername.length < 3) {
    baseUsername = `user_${baseUsername}`;
  }

  let candidateUsername = baseUsername;
  let counter = 1;
  while (db.prepare('SELECT id FROM users WHERE username = ?').get(candidateUsername)) {
    candidateUsername = `${baseUsername}_${Math.floor(1000 + Math.random() * 9000)}`;
    counter++;
    if (counter > 10) {
      candidateUsername = `${baseUsername}_${Date.now().toString().slice(-4)}`;
      break;
    }
  }

  const result = db.prepare(`
    INSERT INTO users (name, username, email, avatar_url, google_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    payload.name || candidateUsername,
    candidateUsername,
    emailLower,
    payload.picture || null,
    googleId
  );

  const newUserId = Number(result.lastInsertRowid);
  return db.prepare(`
    SELECT id, name, username, email, avatar_url, bio, home_city, google_id, created_at
    FROM users
    WHERE id = ?
  `).get(newUserId);
}

/**
 * Returns current authenticated user profile.
 */
function getMe(req, res) {
  res.status(200).json({
    success: true,
    user: req.user
  });
}

/**
 * Logs out user by clearing the session cookie.
 */
function logout(req, res) {
  clearSessionCookie(res);
  res.status(200).json({
    success: true,
    message: 'Logged out successfully.'
  });
}

module.exports = {
  loginWithGoogle,
  getMe,
  logout
};
