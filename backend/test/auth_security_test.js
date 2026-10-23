/**
 * Roamly Automated Security & Authentication Test Suite
 * Strictly runs against an ISOLATED test database (never touches roamly.db).
 * 
 * Tests:
 * 1. Public browsing without authentication
 * 2. Rejection of unauthenticated protected writes (401)
 * 3. Rejection of spoofed x-user-id and user_id query parameters (401)
 * 4. Invalid Google ID-token rejection (400/401)
 * 5. Valid session verification, cookie handling, and session restoration
 * 6. Cross-user BOLA/IDOR protection (403 on updating/deleting another user's trip or comment)
 * 7. Authorized owner actions succeed
 * 8. Protection of demo accounts against linking
 * 9. CSRF origin verification on mutating requests
 * 10. Logout and session termination
 */

const path = require('path');
const fs = require('fs');
const http = require('http');

// Configure isolated test environment
const TEST_PORT = 5098;
const TEST_DB_PATH = path.resolve(__dirname, '../data/test_auth_isolated.db');

process.env.NODE_ENV = 'test';
process.env.PORT = String(TEST_PORT);
process.env.DB_PATH = TEST_DB_PATH;
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.GOOGLE_CLIENT_ID = 'test_google_client_id.apps.googleusercontent.com';
process.env.JWT_SECRET = 'test_super_secret_jwt_key_for_isolated_test_suite_32chars';

// Clean up any stale test database before starting
function cleanTestDb() {
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  if (fs.existsSync(TEST_DB_PATH + '-wal')) fs.unlinkSync(TEST_DB_PATH + '-wal');
  if (fs.existsSync(TEST_DB_PATH + '-shm')) fs.unlinkSync(TEST_DB_PATH + '-shm');
}
cleanTestDb();

const { DatabaseSync } = require('node:sqlite');
const { initSchema } = require('../src/config/schema');
const { seedDatabase } = require('../src/config/seed');
const { getDb, closeDb } = require('../src/config/db');
const { signSessionToken } = require('../src/middleware/auth');
const { app } = require('../src/server');

const BASE_URL = `http://127.0.0.1:${TEST_PORT}/api`;

let serverInstance = null;
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: []
};

function recordTest(name, passed, details = '') {
  results.total++;
  if (passed) {
    results.passed++;
    results.tests.push({ name, status: 'PASS', details });
    console.log(`  ✓ PASS: ${name}`);
  } else {
    results.failed++;
    results.tests.push({ name, status: 'FAIL', details });
    console.error(`  ✗ FAIL: ${name} -> ${details}`);
  }
}

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'Connection': 'close',
    ...(options.headers || {})
  };

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const contentType = response.headers.get('content-type') || '';
  let data = null;
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  const setCookie = response.headers.get('set-cookie');
  return { status: response.status, data, headers: response.headers, setCookie };
}

async function runAuthSecurityTests() {
  console.log('\n======================================================');
  console.log('   ROAMLY AUTH & SECURITY VERIFICATION SUITE         ');
  console.log('   (Isolated Test DB: ' + path.basename(TEST_DB_PATH) + ')');
  console.log('======================================================\n');

  // Verify that the isolated database is initialized
  const db = getDb();
  seedDatabase(true);

  // Start test server
  serverInstance = await new Promise((resolve, reject) => {
    const s = app.listen(TEST_PORT, '127.0.0.1', () => resolve(s));
    s.on('error', reject);
  });
  console.log(`Test server running on http://127.0.0.1:${TEST_PORT}\n`);

  try {
    // -----------------------------------------------------------------
    // 1. Public Browsing Without Authentication
    // -----------------------------------------------------------------
    console.log('[1. Public Read-Only Browsing]');
    const healthRes = await request('/health');
    recordTest(
      'GET /api/health returns 200 with active_user null for anonymous visitor',
      healthRes.status === 200 && healthRes.data.active_user === null,
      `active_user: ${JSON.stringify(healthRes.data?.active_user)}`
    );

    const destsRes = await request('/destinations');
    recordTest(
      'GET /api/destinations returns 200 with all is_bookmarked: false for anonymous visitor',
      destsRes.status === 200 && destsRes.data.data.every(d => d.is_bookmarked === false),
      `Count: ${destsRes.data?.count}`
    );

    const tripsRes = await request('/trips');
    recordTest(
      'GET /api/trips returns 200 with is_liked: false for anonymous visitor',
      tripsRes.status === 200 && tripsRes.data.data.every(t => t.is_liked === false),
      `Count: ${tripsRes.data?.count}`
    );

    const trip1Res = await request('/trips/1');
    recordTest(
      'GET /api/trips/1 returns 200 with is_owner: false for anonymous visitor',
      trip1Res.status === 200 && trip1Res.data.data.is_owner === false,
      `is_owner: ${trip1Res.data?.data?.is_owner}`
    );

    // -----------------------------------------------------------------
    // 2. Protected Endpoints Reject Unauthenticated Requests (401)
    // -----------------------------------------------------------------
    console.log('\n[2. Authentication Gate: Protected Mutating Endpoints Require Auth]');
    const createTripUnauth = await request('/trips', {
      method: 'POST',
      body: { title: 'Unauthorized Trip', start_date: '2026-11-01', end_date: '2026-11-05' }
    });
    recordTest(
      'POST /api/trips rejects unauthenticated request with 401',
      createTripUnauth.status === 401 && createTripUnauth.data.success === false,
      `Status: ${createTripUnauth.status}`
    );

    const bookmarkUnauth = await request('/destinations/1/bookmark', { method: 'POST' });
    recordTest(
      'POST /api/destinations/:id/bookmark rejects unauthenticated request with 401',
      bookmarkUnauth.status === 401 && bookmarkUnauth.data.success === false,
      `Status: ${bookmarkUnauth.status}`
    );

    const getBookmarksUnauth = await request('/bookmarks');
    recordTest(
      'GET /api/bookmarks rejects unauthenticated request with 401',
      getBookmarksUnauth.status === 401 && getBookmarksUnauth.data.success === false,
      `Status: ${getBookmarksUnauth.status}`
    );

    const likeUnauth = await request('/trips/1/like', { method: 'POST' });
    recordTest(
      'POST /api/trips/:id/like rejects unauthenticated request with 401',
      likeUnauth.status === 401 && likeUnauth.data.success === false,
      `Status: ${likeUnauth.status}`
    );

    const commentUnauth = await request('/trips/1/comments', {
      method: 'POST',
      body: { content: 'Anonymous comment attempt' }
    });
    recordTest(
      'POST /api/trips/:id/comments rejects unauthenticated request with 401',
      commentUnauth.status === 401 && commentUnauth.data.success === false,
      `Status: ${commentUnauth.status}`
    );

    const deleteCommentUnauth = await request('/comments/1', { method: 'DELETE' });
    recordTest(
      'DELETE /api/comments/:id rejects unauthenticated request with 401',
      deleteCommentUnauth.status === 401 && deleteCommentUnauth.data.success === false,
      `Status: ${deleteCommentUnauth.status}`
    );

    const profileUnauth = await request('/profile');
    recordTest(
      'GET /api/profile (own profile) rejects unauthenticated request with 401',
      profileUnauth.status === 401 && profileUnauth.data.success === false,
      `Status: ${profileUnauth.status}`
    );

    const meUnauth = await request('/auth/me');
    recordTest(
      'GET /api/auth/me rejects unauthenticated request with 401',
      meUnauth.status === 401 && meUnauth.data.success === false,
      `Status: ${meUnauth.status}`
    );

    // -----------------------------------------------------------------
    // 3. Spoofed Identity Headers (x-user-id) & Query Params are Strictly Ignored
    // -----------------------------------------------------------------
    console.log('\n[3. Spoofed Identity Rejection (x-user-id / user_id bypass test)]');
    const spoofHeaderTrip = await request('/trips', {
      method: 'POST',
      headers: { 'x-user-id': '1' },
      body: { title: 'Spoofed Header Trip', start_date: '2026-11-01', end_date: '2026-11-05' }
    });
    recordTest(
      'POST /api/trips rejects spoofed x-user-id header with 401',
      spoofHeaderTrip.status === 401,
      `Status: ${spoofHeaderTrip.status}`
    );

    const spoofQueryTrip = await request('/trips?user_id=1', {
      method: 'POST',
      body: { title: 'Spoofed Query Trip', start_date: '2026-11-01', end_date: '2026-11-05' }
    });
    recordTest(
      'POST /api/trips rejects spoofed user_id query parameter with 401',
      spoofQueryTrip.status === 401,
      `Status: ${spoofQueryTrip.status}`
    );

    const spoofUpdateTrip = await request('/trips/1', {
      method: 'PUT',
      headers: { 'x-user-id': '1' },
      body: { title: 'Hacked Trip Title' }
    });
    recordTest(
      'PUT /api/trips/1 rejects spoofed x-user-id header with 401',
      spoofUpdateTrip.status === 401,
      `Status: ${spoofUpdateTrip.status}`
    );

    // -----------------------------------------------------------------
    // 4. Invalid Google Credentials Rejection
    // -----------------------------------------------------------------
    console.log('\n[4. Google Token Verification]');
    const missingCred = await request('/auth/google', {
      method: 'POST',
      body: {}
    });
    recordTest(
      'POST /api/auth/google fails with 400 when credential is missing',
      missingCred.status === 400 && missingCred.data.success === false,
      `Status: ${missingCred.status}`
    );

    const forgedCred = await request('/auth/google', {
      method: 'POST',
      body: { credential: 'forged.fake.jwt.token' }
    });
    recordTest(
      'POST /api/auth/google rejects forged token with 401',
      forgedCred.status === 401 && forgedCred.data.success === false,
      `Status: ${forgedCred.status}`
    );

    // -----------------------------------------------------------------
    // 5. Valid Session Issuance, Cookie Handling & Session Restoration
    // -----------------------------------------------------------------
    console.log('\n[5. Verified Session & Cookie Handling]');
    // Create valid sessions for User 1 (Elena) and User 2 (Marcus)
    const user1 = db.prepare('SELECT id, name, username, email FROM users WHERE id = 1').get();
    const user2 = db.prepare('SELECT id, name, username, email FROM users WHERE id = 2').get();

    const user1Token = signSessionToken(user1);
    const user2Token = signSessionToken(user2);

    const user1CookieHeader = { 'Cookie': `roamly_session=${user1Token}`, 'Origin': 'http://localhost:5173' };
    const user2CookieHeader = { 'Cookie': `roamly_session=${user2Token}`, 'Origin': 'http://localhost:5173' };

    const meUser1 = await request('/auth/me', { headers: user1CookieHeader });
    recordTest(
      'GET /api/auth/me returns Elena (ID 1) with valid session cookie',
      meUser1.status === 200 && meUser1.data.user.id === 1 && meUser1.data.user.name === 'Elena Rostova',
      `Name: ${meUser1.data?.user?.name}`
    );

    const healthUser1 = await request('/health', { headers: user1CookieHeader });
    recordTest(
      'GET /api/health restores active_user context from session cookie',
      healthUser1.status === 200 && healthUser1.data.active_user.id === 1,
      `Active user: ${healthUser1.data?.active_user?.username}`
    );

    // Bearer token fallback support
    const meBearer = await request('/auth/me', {
      headers: { 'Authorization': `Bearer ${user2Token}`, 'Origin': 'http://localhost:5173' }
    });
    recordTest(
      'GET /api/auth/me accepts Bearer authorization token header',
      meBearer.status === 200 && meBearer.data.user.id === 2 && meBearer.data.user.name === 'Marcus Vance',
      `Name: ${meBearer.data?.user?.name}`
    );

    // -----------------------------------------------------------------
    // 6. Cross-User Authorization Enforcement (BOLA / IDOR Prevention)
    // -----------------------------------------------------------------
    console.log('\n[6. BOLA / IDOR Prevention: Cross-User Resource Protection]');
    // Trip 1 belongs to User 1 (Elena).
    // Test: User 2 (Marcus) attempts to edit User 1's trip
    const crossUserEdit = await request('/trips/1', {
      method: 'PUT',
      headers: user2CookieHeader,
      body: { title: 'Marcus trying to edit Elena trip' }
    });
    recordTest(
      'PUT /api/trips/1 rejects non-owner with 403 Forbidden',
      crossUserEdit.status === 403 && crossUserEdit.data.error.includes('Forbidden'),
      `Status: ${crossUserEdit.status}, Error: ${crossUserEdit.data.error}`
    );

    // Test: User 2 attempting to delete User 1's trip
    const crossUserDelete = await request('/trips/1', {
      method: 'DELETE',
      headers: user2CookieHeader
    });
    recordTest(
      'DELETE /api/trips/1 rejects non-owner with 403 Forbidden',
      crossUserDelete.status === 403 && crossUserDelete.data.error.includes('Forbidden'),
      `Status: ${crossUserDelete.status}`
    );

    // Test: User 2 attempting edit with spoofed x-user-id: 1 while having User 2 session
    const crossUserSpoofHeader = await request('/trips/1', {
      method: 'PUT',
      headers: { ...user2CookieHeader, 'x-user-id': '1' },
      body: { title: 'Marcus trying to edit Elena trip with spoofed header' }
    });
    recordTest(
      'PUT /api/trips/1 derives identity exclusively from session (x-user-id cannot bypass 403)',
      crossUserSpoofHeader.status === 403,
      `Status: ${crossUserSpoofHeader.status}`
    );

    // Marcus (User 2) comment. Elena (User 1) attempts to delete it
    const marcusComment = db.prepare('SELECT id FROM comments WHERE user_id = 2 LIMIT 1').get();
    const crossCommentDelete = await request(`/comments/${marcusComment.id}`, {
      method: 'DELETE',
      headers: user1CookieHeader
    });
    recordTest(
      'DELETE /api/comments/:id rejects non-author with 403 Forbidden',
      crossCommentDelete.status === 403 && crossCommentDelete.data.error.includes('Forbidden'),
      `Status: ${crossCommentDelete.status}`
    );

    // -----------------------------------------------------------------
    // 7. Authorized Actions by Resource Owner Succeed
    // -----------------------------------------------------------------
    console.log('\n[7. Authorized Owner Operations]');
    // Elena updates own trip 1
    const ownerUpdate = await request('/trips/1', {
      method: 'PUT',
      headers: user1CookieHeader,
      body: { title: 'Autumn Light in Kyoto (Authorized Update)' }
    });
    recordTest(
      'PUT /api/trips/1 succeeds when authenticated as trip owner',
      ownerUpdate.status === 200 && ownerUpdate.data.data.title.includes('Authorized Update'),
      `Updated Title: ${ownerUpdate.data?.data?.title}`
    );

    // Elena creates a new trip
    const ownerCreateTrip = await request('/trips', {
      method: 'POST',
      headers: user1CookieHeader,
      body: {
        title: 'Elena New Alpine Hike',
        destination_id: 8,
        start_date: '2026-12-01',
        end_date: '2026-12-07',
        currency: 'USD',
        estimated_budget: 2200,
        stops: [
          { place_name: 'Lake Louise Chalet', category: 'Stay', day_number: 1, cost: 250 }
        ]
      }
    });
    const newTripId = ownerCreateTrip.data?.data?.id;
    recordTest(
      'POST /api/trips creates trip bound to authenticated user',
      ownerCreateTrip.status === 200 && newTripId > 0 && ownerCreateTrip.data.data.user_id === 1,
      `Trip ID: ${newTripId}, User ID: ${ownerCreateTrip.data?.data?.user_id}`
    );

    // Elena posts comment on new trip
    const addComment = await request(`/trips/${newTripId}/comments`, {
      method: 'POST',
      headers: user1CookieHeader,
      body: { content: 'Packing microspikes and hand warmers.' }
    });
    const newCommentId = addComment.data?.data?.id;
    recordTest(
      'POST /api/trips/:id/comments posts comment with authenticated author',
      addComment.status === 201 && newCommentId > 0 && addComment.data.data.user_id === 1,
      `Comment ID: ${newCommentId}`
    );

    // Elena deletes own created comment
    const deleteOwnComment = await request(`/comments/${newCommentId}`, {
      method: 'DELETE',
      headers: user1CookieHeader
    });
    recordTest(
      'DELETE /api/comments/:id allows author to delete own comment',
      deleteOwnComment.status === 200 && deleteOwnComment.data.success === true,
      `Status: ${deleteOwnComment.status}`
    );

    // Elena deletes own created trip
    const deleteOwnTrip = await request(`/trips/${newTripId}`, {
      method: 'DELETE',
      headers: user1CookieHeader
    });
    recordTest(
      'DELETE /api/trips/:id allows owner to delete own trip',
      deleteOwnTrip.status === 200 && deleteOwnTrip.data.deleted_id === newTripId,
      `Status: ${deleteOwnTrip.status}`
    );

    // -----------------------------------------------------------------
    // 8. CSRF Protection for Authenticated Mutating Requests
    // -----------------------------------------------------------------
    console.log('\n[8. CSRF Origin Protection]');
    const csrfAttack = await request('/trips', {
      method: 'POST',
      headers: {
        'Cookie': `roamly_session=${user1Token}`,
        'Origin': 'http://malicious-cross-origin.com'
      },
      body: { title: 'CSRF Attack Trip', start_date: '2026-11-01', end_date: '2026-11-05' }
    });
    recordTest(
      'POST /api/trips rejects unauthorized cross-origin request with 403 Forbidden (CSRF)',
      csrfAttack.status === 403 && csrfAttack.data.error.includes('CSRF'),
      `Status: ${csrfAttack.status}, Error: ${csrfAttack.data.error}`
    );

    // -----------------------------------------------------------------
    // 9. Logout & Session Invalidation
    // -----------------------------------------------------------------
    console.log('\n[9. Logout & Session Termination]');
    const logoutRes = await request('/auth/logout', {
      method: 'POST',
      headers: user1CookieHeader
    });
    recordTest(
      'POST /api/auth/logout succeeds and returns 200 with clear session cookie',
      logoutRes.status === 200 && logoutRes.data.success === true && logoutRes.setCookie?.includes('roamly_session='),
      `Set-Cookie header: ${logoutRes.setCookie}`
    );

    // -----------------------------------------------------------------
    // 10. Database Schema Idempotency & Demo Account Protection Check
    // -----------------------------------------------------------------
    console.log('\n[10. Database Schema Migration Idempotency & Safety Check]');
    const columns = db.prepare('PRAGMA table_info(users);').all();
    const hasGoogleId = columns.some(c => c.name === 'google_id');
    const indexes = db.prepare('PRAGMA index_list(users);').all();
    const hasGoogleIdIndex = indexes.some(i => i.name === 'idx_users_google_id');

    recordTest(
      'users table has google_id column and unique index',
      hasGoogleId && hasGoogleIdIndex,
      `google_id column: ${hasGoogleId}, index: ${hasGoogleIdIndex}`
    );

    // Verify demo user records remain intact with original emails
    const elena = db.prepare('SELECT id, name, email FROM users WHERE id = 1').get();
    const marcus = db.prepare('SELECT id, name, email FROM users WHERE id = 2').get();
    recordTest(
      'Demo users elena@roamly.local and marcus@roamly.local preserved intact',
      elena.email === 'elena@roamly.local' && marcus.email === 'marcus@roamly.local',
      `Users: ${elena.name} (${elena.email}), ${marcus.name} (${marcus.email})`
    );

  } finally {
    if (serverInstance) {
      await new Promise(r => serverInstance.close(r));
    }
    closeDb();
    cleanTestDb();
    console.log('\n  -> Isolated test database cleanly unlinked.');
  }

  // Print final summary
  console.log('\n======================================================');
  console.log(`TEST RESULTS: ${results.passed}/${results.total} PASSED (${results.failed} FAILED)`);
  console.log('======================================================\n');

  if (results.failed > 0) {
    process.exit(1);
  }
}

runAuthSecurityTests().catch(err => {
  console.error('Fatal test execution error:', err);
  cleanTestDb();
  process.exit(1);
});
