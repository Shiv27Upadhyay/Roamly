/**
 * Roamly Automated Trip Privacy & Authorization Test Suite (Phase 1)
 * Strictly runs against an ISOLATED temporary test database (never touches roamly.db).
 * 
 * Verifies all 11 required scenarios:
 * 1. Existing trips receive 'public' visibility through schema migration
 * 2. Schema migration is safe to run repeatedly (idempotent)
 * 3. Public trips remain readable without authentication
 * 4. Private trip is inaccessible to anonymous visitors and other authenticated users (uniform 404)
 * 5. Owner can read their private trip with full details
 * 6. Unlisted trip rejects missing or invalid share token (uniform 404)
 * 7. Unlisted trip accepts valid share token via query param and header (without leaking token to visitor)
 * 8. Public feeds, destination guides, and public profile views exclude private and unlisted trips
 * 9. Owners retain access to their own trips in personal context (trips?user_id=... and /profile)
 * 10. Existing owner-only editing/deletion rules and token lifecycle (rotation & clearing) work correctly
 * 11. Validation rules enforce allowed visibility values ('public', 'unlisted', 'private')
 */

const path = require('path');
const fs = require('fs');

const TEST_PORT = 5097;
const TEST_DB_PATH = path.resolve(__dirname, '../data/test_privacy_isolated.db');
const TEST_MIGRATION_DB_PATH = path.resolve(__dirname, '../data/test_migration_isolated.db');

process.env.NODE_ENV = 'test';
process.env.PORT = String(TEST_PORT);
process.env.DB_PATH = TEST_DB_PATH;
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.GOOGLE_CLIENT_ID = 'test_google_client_id.apps.googleusercontent.com';
process.env.JWT_SECRET = 'test_super_secret_jwt_key_for_isolated_privacy_suite_32chars';

function cleanFiles(fileBasePath) {
  for (const suffix of ['', '-wal', '-shm']) {
    const full = fileBasePath + suffix;
    if (fs.existsSync(full)) {
      try {
        fs.unlinkSync(full);
      } catch {
        // ignore on Windows if momentarily delayed
      }
    }
  }
}

cleanFiles(TEST_DB_PATH);
cleanFiles(TEST_MIGRATION_DB_PATH);

const { DatabaseSync } = require('node:sqlite');
const { migrateSchema, initSchema } = require('../src/config/schema');
const { seedDatabase } = require('../src/config/seed');
const { getDb, closeDb } = require('../src/config/db');
const { signSessionToken } = require('../src/middleware/auth');
const { isValidShareToken, generateShareToken } = require('../src/utils/token');
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

  return { status: response.status, data, headers: response.headers };
}

async function runPrivacyTestSuite() {
  console.log('\n======================================================');
  console.log('   ROAMLY TRIP PRIVACY & BACKEND FOUNDATION TESTS     ');
  console.log('   (Isolated Test DB: ' + path.basename(TEST_DB_PATH) + ')');
  console.log('======================================================\n');

  try {
    // -----------------------------------------------------------------
    // 1. Safe, Idempotent Schema Migration & Legacy Trip Preservation
    // -----------------------------------------------------------------
    console.log('[1. Schema Migration & Idempotency]');

    cleanFiles(TEST_MIGRATION_DB_PATH);
    const legacyDb = new DatabaseSync(TEST_MIGRATION_DB_PATH);
    legacyDb.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        google_id TEXT UNIQUE
      );
      CREATE TABLE IF NOT EXISTS destinations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        country TEXT NOT NULL,
        continent TEXT NOT NULL,
        cover_image TEXT,
        season TEXT,
        budget_tier TEXT
      );
      CREATE TABLE IF NOT EXISTS trips (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        destination_id INTEGER,
        title TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        currency TEXT DEFAULT 'USD',
        estimated_budget REAL DEFAULT 0,
        cover_image TEXT,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `);

    // Insert legacy test trips
    legacyDb.prepare(`
      INSERT INTO users (id, name, username, email) VALUES (1, 'Elena Rostova', 'elena', 'elena@test.local');
    `).run();
    legacyDb.prepare(`
      INSERT INTO users (id, name, username, email) VALUES (2, 'Marcus Vance', 'marcus', 'marcus@test.local');
    `).run();
    legacyDb.prepare(`
      INSERT INTO destinations (id, title, country, continent) VALUES (1, 'Kyoto Gardens', 'Japan', 'Asia');
    `).run();
    legacyDb.prepare(`
      INSERT INTO trips (id, user_id, destination_id, title, start_date, end_date)
      VALUES (101, 1, 1, 'Legacy Autumn in Kyoto', '2026-10-10', '2026-10-17');
    `).run();
    legacyDb.prepare(`
      INSERT INTO trips (id, user_id, destination_id, title, start_date, end_date)
      VALUES (102, 2, 1, 'Legacy Bamboo Grove Walk', '2026-11-01', '2026-11-08');
    `).run();

    // Run migrateSchema on the legacy DB
    migrateSchema(legacyDb);

    const tripColsAfterMigration = legacyDb.prepare('PRAGMA table_info(trips);').all();
    const hasVisibilityCol = tripColsAfterMigration.some(c => c.name === 'visibility');
    const hasShareTokenCol = tripColsAfterMigration.some(c => c.name === 'share_token');

    recordTest(
      'Schema migration adds visibility and share_token columns to trips',
      hasVisibilityCol && hasShareTokenCol,
      `Columns: ${tripColsAfterMigration.map(c => c.name).join(', ')}`
    );

    const legacyTrip101 = legacyDb.prepare('SELECT id, title, visibility, share_token FROM trips WHERE id = 101').get();
    const legacyTrip102 = legacyDb.prepare('SELECT id, title, visibility, share_token FROM trips WHERE id = 102').get();

    recordTest(
      'Existing legacy trips default to public visibility with null share_token',
      legacyTrip101.visibility === 'public' && legacyTrip101.share_token === null &&
      legacyTrip102.visibility === 'public' && legacyTrip102.share_token === null,
      `Trip 101: visibility=${legacyTrip101?.visibility}, token=${legacyTrip101?.share_token}`
    );

    // Test Idempotency (run migration 3 more times on legacyDb)
    let migrationError = null;
    try {
      migrateSchema(legacyDb);
      migrateSchema(legacyDb);
      initSchema(legacyDb);
    } catch (err) {
      migrationError = err;
    }

    const tripColsAfterRepeat = legacyDb.prepare('PRAGMA table_info(trips);').all();
    const indexesAfterRepeat = legacyDb.prepare('PRAGMA index_list(trips);').all();
    const hasTokenIndex = indexesAfterRepeat.some(idx => idx.name === 'idx_trips_share_token');
    const hasVisIndex = indexesAfterRepeat.some(idx => idx.name === 'idx_trips_visibility');

    recordTest(
      'Repeated migration is idempotent without throwing errors or corrupting schema',
      migrationError === null && hasTokenIndex && hasVisIndex && tripColsAfterRepeat.length === tripColsAfterMigration.length,
      migrationError ? migrationError.message : 'Clean repeated run'
    );

    legacyDb.close();
    cleanFiles(TEST_MIGRATION_DB_PATH);

    // -----------------------------------------------------------------
    // 2. Token Generation & Constant-Time Validation Unit Checks
    // -----------------------------------------------------------------
    console.log('\n[2. Secure Token Generation & Constant-Time Comparison]');
    const tokenA = generateShareToken();
    const tokenB = generateShareToken();

    recordTest(
      'generateShareToken returns high-entropy 32-character base64url strings',
      tokenA.length === 32 && tokenB.length === 32 && tokenA !== tokenB,
      `Token sample: ${tokenA.slice(0, 8)}...`
    );

    recordTest(
      'isValidShareToken accepts exact match and rejects mismatched tokens',
      isValidShareToken(tokenA, tokenA) === true &&
      isValidShareToken('wrong_token', tokenA) === false &&
      isValidShareToken(null, tokenA) === false &&
      isValidShareToken('', tokenA) === false,
      'Validated constant-time comparison'
    );

    // -----------------------------------------------------------------
    // 3. Initialize Isolated Server Test Database & Users
    // -----------------------------------------------------------------
    const db = getDb();
    seedDatabase(true);

    const user1 = db.prepare('SELECT id, name, username, email FROM users WHERE id = 1').get();
    const user2 = db.prepare('SELECT id, name, username, email FROM users WHERE id = 2').get();

    const user1Token = signSessionToken(user1);
    const user2Token = signSessionToken(user2);

    const user1Headers = { 'Cookie': `roamly_session=${user1Token}`, 'Origin': 'http://localhost:5173' };
    const user2Headers = { 'Cookie': `roamly_session=${user2Token}`, 'Origin': 'http://localhost:5173' };

    serverInstance = await new Promise((resolve, reject) => {
      const s = app.listen(TEST_PORT, '127.0.0.1', () => resolve(s));
      s.on('error', reject);
    });
    console.log(`Test server running on http://127.0.0.1:${TEST_PORT}\n`);

    // -----------------------------------------------------------------
    // 4. Public Trips Remain Readable
    // -----------------------------------------------------------------
    console.log('[3. Public Itineraries Access]');
    const publicTripRes = await request('/trips/1');
    recordTest(
      'GET /api/trips/:id for public trip is readable by anonymous visitor (200)',
      publicTripRes.status === 200 && publicTripRes.data.data.visibility === 'public' && publicTripRes.data.data.is_owner === false,
      `Status: ${publicTripRes.status}, Title: ${publicTripRes.data?.data?.title}`
    );

    const publicTripUser2 = await request('/trips/1', { headers: user2Headers });
    recordTest(
      'GET /api/trips/:id for public trip is readable by other authenticated user (200)',
      publicTripUser2.status === 200 && publicTripUser2.data.data.id === 1,
      `Status: ${publicTripUser2.status}`
    );

    // -----------------------------------------------------------------
    // 5. Private Itinerary Creation & Access Gate (Uniform 404)
    // -----------------------------------------------------------------
    console.log('\n[4. Private Itinerary Security & Leaks Gate]');
    const createPrivateRes = await request('/trips', {
      method: 'POST',
      headers: user1Headers,
      body: {
        title: 'Elena Confidential Solo Journey',
        destination_id: 1,
        start_date: '2026-12-01',
        end_date: '2026-12-10',
        currency: 'USD',
        estimated_budget: 4500,
        notes: 'Top secret personal reflections and unreleased itinerary.',
        visibility: 'private',
        stops: [
          { day_number: 1, place_name: 'Hidden Zen Sanctuary', cost: 120, notes: 'Private meditation' }
        ]
      }
    });

    const privateTripId = createPrivateRes.data?.data?.id;
    recordTest(
      'POST /api/trips creates private trip with visibility=private and share_token=null',
      createPrivateRes.status === 200 && privateTripId > 0 &&
      createPrivateRes.data.data.visibility === 'private' &&
      createPrivateRes.data.data.share_token === null,
      `Created ID: ${privateTripId}, visibility: ${createPrivateRes.data?.data?.visibility}`
    );

    // Anonymous visitor tries to read private trip
    const anonPrivateGet = await request(`/trips/${privateTripId}`);
    recordTest(
      'GET /api/trips/:privateId rejects anonymous visitor with uniform 404 (does not disclose trip)',
      anonPrivateGet.status === 404 && anonPrivateGet.data.error.includes('not found') && !anonPrivateGet.data.data,
      `Status: ${anonPrivateGet.status}`
    );

    // Non-owner authenticated user tries to read private trip
    const user2PrivateGet = await request(`/trips/${privateTripId}`, { headers: user2Headers });
    recordTest(
      'GET /api/trips/:privateId rejects non-owner with uniform 404',
      user2PrivateGet.status === 404 && user2PrivateGet.data.error.includes('not found') && !user2PrivateGet.data.data,
      `Status: ${user2PrivateGet.status}`
    );

    // Non-owner tries to like private trip
    const user2LikePrivate = await request(`/trips/${privateTripId}/like`, { method: 'POST', headers: user2Headers });
    recordTest(
      'POST /api/trips/:privateId/like rejects non-owner with 404 (cannot interact with private trip)',
      user2LikePrivate.status === 404,
      `Status: ${user2LikePrivate.status}`
    );

    // Non-owner tries to comment on private trip
    const user2CommentPrivate = await request(`/trips/${privateTripId}/comments`, {
      method: 'POST',
      headers: user2Headers,
      body: { content: 'Sneaking a comment on private trip' }
    });
    recordTest(
      'POST /api/trips/:privateId/comments rejects non-owner with 404',
      user2CommentPrivate.status === 404,
      `Status: ${user2CommentPrivate.status}`
    );

    // -----------------------------------------------------------------
    // 6. Owner Access to Private Trip
    // -----------------------------------------------------------------
    console.log('\n[5. Owner Access to Private Trip]');
    const ownerPrivateGet = await request(`/trips/${privateTripId}`, { headers: user1Headers });
    recordTest(
      'GET /api/trips/:privateId allows authenticated owner with full stops and is_owner=true',
      ownerPrivateGet.status === 200 && ownerPrivateGet.data.data.is_owner === true &&
      ownerPrivateGet.data.data.stops.length === 1 &&
      ownerPrivateGet.data.data.title === 'Elena Confidential Solo Journey',
      `Stops: ${ownerPrivateGet.data?.data?.stops?.length}`
    );

    // -----------------------------------------------------------------
    // 7. Unlisted Itinerary Token Generation & Protection
    // -----------------------------------------------------------------
    console.log('\n[6. Unlisted Itinerary & Token Protection]');
    const createUnlistedRes = await request('/trips', {
      method: 'POST',
      headers: user1Headers,
      body: {
        title: 'Secret Kyoto Tea Ceremony Itinerary',
        destination_id: 1,
        start_date: '2026-11-15',
        end_date: '2026-11-20',
        visibility: 'unlisted',
        notes: 'Shared only via secret token link.',
        stops: [
          { day_number: 1, place_name: 'Private Teahouse Uji', cost: 85, notes: 'Matcha whisking' }
        ]
      }
    });

    const unlistedTripId = createUnlistedRes.data?.data?.id;
    const unlistedShareToken = createUnlistedRes.data?.data?.share_token;

    recordTest(
      'POST /api/trips with visibility=unlisted generates high-entropy share_token for owner',
      createUnlistedRes.status === 200 && unlistedTripId > 0 &&
      createUnlistedRes.data.data.visibility === 'unlisted' &&
      typeof unlistedShareToken === 'string' && unlistedShareToken.length === 32,
      `Token: ${unlistedShareToken?.slice(0, 8)}... (len: ${unlistedShareToken?.length})`
    );

    // Missing token
    const anonUnlistedNoToken = await request(`/trips/${unlistedTripId}`);
    recordTest(
      'GET /api/trips/:unlistedId without token returns 404',
      anonUnlistedNoToken.status === 404,
      `Status: ${anonUnlistedNoToken.status}`
    );

    // Invalid query token
    const anonUnlistedBadToken = await request(`/trips/${unlistedTripId}?token=invalid_token_1234567890`);
    recordTest(
      'GET /api/trips/:unlistedId?token=badToken returns 404',
      anonUnlistedBadToken.status === 404,
      `Status: ${anonUnlistedBadToken.status}`
    );

    // Invalid header token
    const anonUnlistedBadHeader = await request(`/trips/${unlistedTripId}`, {
      headers: { 'x-share-token': 'another_invalid_token' }
    });
    recordTest(
      'GET /api/trips/:unlistedId with invalid x-share-token header returns 404',
      anonUnlistedBadHeader.status === 404,
      `Status: ${anonUnlistedBadHeader.status}`
    );

    // Non-owner authenticated user without token
    const user2UnlistedNoToken = await request(`/trips/${unlistedTripId}`, { headers: user2Headers });
    recordTest(
      'GET /api/trips/:unlistedId rejects non-owner without token with 404',
      user2UnlistedNoToken.status === 404,
      `Status: ${user2UnlistedNoToken.status}`
    );

    // Non-owner like without token rejected
    const user2LikeNoToken = await request(`/trips/${unlistedTripId}/like`, { method: 'POST', headers: user2Headers });
    recordTest(
      'POST /api/trips/:unlistedId/like without token returns 404',
      user2LikeNoToken.status === 404,
      `Status: ${user2LikeNoToken.status}`
    );

    // -----------------------------------------------------------------
    // 8. Unlisted Trip Access with Valid Share Token
    // -----------------------------------------------------------------
    console.log('\n[7. Valid Share Token Authorization]');
    // Query parameter token access
    const anonValidQueryToken = await request(`/trips/${unlistedTripId}?token=${unlistedShareToken}`);
    recordTest(
      'GET /api/trips/:unlistedId?token=VALID succeeds (200) and returns full stops',
      anonValidQueryToken.status === 200 && anonValidQueryToken.data.data.stops.length === 1 &&
      anonValidQueryToken.data.data.title === 'Secret Kyoto Tea Ceremony Itinerary',
      `Status: ${anonValidQueryToken.status}, Stops: ${anonValidQueryToken.data?.data?.stops?.length}`
    );

    // Token must NOT be exposed in response to non-owner visitor
    recordTest(
      'Response payload does NOT disclose share_token to non-owner visitor',
      anonValidQueryToken.data.data.share_token === undefined,
      `share_token in response: ${anonValidQueryToken.data?.data?.share_token}`
    );

    // Header-based token access (x-share-token)
    const anonValidHeaderToken = await request(`/trips/${unlistedTripId}`, {
      headers: { 'x-share-token': unlistedShareToken }
    });
    recordTest(
      'GET /api/trips/:unlistedId with valid x-share-token header succeeds (200)',
      anonValidHeaderToken.status === 200 && anonValidHeaderToken.data.data.id === unlistedTripId,
      `Status: ${anonValidHeaderToken.status}`
    );

    // Non-owner authenticated interaction with valid token (Like & Comment)
    const user2LikeWithToken = await request(`/trips/${unlistedTripId}/like?token=${unlistedShareToken}`, {
      method: 'POST',
      headers: user2Headers
    });
    recordTest(
      'POST /api/trips/:unlistedId/like with valid token succeeds (200, liked: true)',
      user2LikeWithToken.status === 200 && user2LikeWithToken.data.data.liked === true,
      `Liked: ${user2LikeWithToken.data?.data?.liked}`
    );

    const user2CommentWithToken = await request(`/trips/${unlistedTripId}/comments?token=${unlistedShareToken}`, {
      method: 'POST',
      headers: user2Headers,
      body: { content: 'Thank you for sharing this secret itinerary link!' }
    });
    recordTest(
      'POST /api/trips/:unlistedId/comments with valid token succeeds (201)',
      user2CommentWithToken.status === 201 && user2CommentWithToken.data.data.content.includes('secret itinerary link'),
      `Comment ID: ${user2CommentWithToken.data?.data?.id}`
    );

    // -----------------------------------------------------------------
    // 9. Public Feeds & Related Endpoints Exclude Private and Unlisted Trips
    // -----------------------------------------------------------------
    console.log('\n[8. Feed & Discovery Isolation]');
    // Discovery feed (GET /api/trips)
    const discoveryFeed = await request('/trips');
    const feedTripIds = discoveryFeed.data.data.map(t => t.id);
    const feedHasPrivate = feedTripIds.includes(privateTripId);
    const feedHasUnlisted = feedTripIds.includes(unlistedTripId);

    recordTest(
      'GET /api/trips discovery feed excludes private and unlisted trips',
      !feedHasPrivate && !feedHasUnlisted && discoveryFeed.data.data.every(t => t.visibility === 'public'),
      `Feed IDs: [${feedTripIds.slice(0, 5).join(', ')}...], total: ${feedTripIds.length}`
    );

    // Search filter (/api/trips?search=...)
    const searchPrivate = await request('/trips?search=Confidential');
    recordTest(
      'GET /api/trips?search=... does NOT leak private trips matching search terms',
      searchPrivate.data.count === 0,
      `Count: ${searchPrivate.data.count}`
    );

    const searchUnlisted = await request('/trips?search=Teahouse');
    recordTest(
      'GET /api/trips?search=... does NOT leak unlisted trips matching search terms',
      searchUnlisted.data.count === 0,
      `Count: ${searchUnlisted.data.count}`
    );

    // Destination associated_trips (/api/destinations/1)
    const dest1Res = await request('/destinations/1');
    const destTrips = dest1Res.data.data.associated_trips || [];
    const destHasPrivate = destTrips.some(t => t.id === privateTripId);
    const destHasUnlisted = destTrips.some(t => t.id === unlistedTripId);

    recordTest(
      'GET /api/destinations/:id associated_trips excludes private and unlisted trips',
      !destHasPrivate && !destHasUnlisted,
      `Associated count: ${destTrips.length}`
    );

    // Public Profile View (/api/profile/1 requested by anonymous visitor)
    const publicProfileAnon = await request('/profile/1');
    const anonProfileTrips = publicProfileAnon.data.data.trips || [];
    const profileHasPrivate = anonProfileTrips.some(t => t.id === privateTripId);
    const profileHasUnlisted = anonProfileTrips.some(t => t.id === unlistedTripId);
    const profileExposesTokens = anonProfileTrips.some(t => t.share_token !== undefined);

    recordTest(
      'GET /api/profile/:id (public view) excludes private/unlisted trips and omits share_token',
      !profileHasPrivate && !profileHasUnlisted && !profileExposesTokens,
      `Profile trips count: ${anonProfileTrips.length}`
    );

    // -----------------------------------------------------------------
    // 10. Personal Context Access for Owner
    // -----------------------------------------------------------------
    console.log('\n[9. Owner Personal Context Access]');
    // Owner queries /api/trips?user_id=1
    const ownerTripsFilter = await request('/trips?user_id=1', { headers: user1Headers });
    const ownerTripIds = ownerTripsFilter.data.data.map(t => t.id);

    recordTest(
      'GET /api/trips?user_id=1 allows authenticated owner to view all their trips (public, unlisted, private)',
      ownerTripIds.includes(privateTripId) && ownerTripIds.includes(unlistedTripId),
      `Owner trips count: ${ownerTripsFilter.data.count}`
    );

    // Non-owner queries /api/trips?user_id=1
    const visitorTripsFilter = await request('/trips?user_id=1', { headers: user2Headers });
    const visitorSeenIds = visitorTripsFilter.data.data.map(t => t.id);

    recordTest(
      'GET /api/trips?user_id=1 for non-owner shows ONLY user 1 public trips',
      !visitorSeenIds.includes(privateTripId) && !visitorSeenIds.includes(unlistedTripId) &&
      visitorTripsFilter.data.data.every(t => t.visibility === 'public'),
      `Visitor saw: ${visitorSeenIds.length} public trips`
    );

    // Owner views own profile (GET /api/profile)
    const ownerProfile = await request('/profile', { headers: user1Headers });
    const ownerProfileTrips = ownerProfile.data.data.trips || [];
    const ownerProfileHasPrivate = ownerProfileTrips.some(t => t.id === privateTripId);
    const ownerProfileHasUnlisted = ownerProfileTrips.some(t => t.id === unlistedTripId);

    recordTest(
      'GET /api/profile provides authenticated owner access to private and unlisted trips',
      ownerProfileHasPrivate && ownerProfileHasUnlisted,
      `Owner profile trips count: ${ownerProfileTrips.length}`
    );

    // -----------------------------------------------------------------
    // 11. Owner-Only Editing/Deletion & Token Lifecycle (Rotation & Clearing)
    // -----------------------------------------------------------------
    console.log('\n[10. Editing, Deletion & Share-Token Lifecycle]');
    // Non-owner cannot update private or unlisted trip
    const unauthorizedPut = await request(`/trips/${privateTripId}`, {
      method: 'PUT',
      headers: user2Headers,
      body: { title: 'Hacked by Marcus' }
    });
    recordTest(
      'PUT /api/trips/:id rejects non-owner with 403 Forbidden',
      unauthorizedPut.status === 403,
      `Status: ${unauthorizedPut.status}`
    );

    // Non-owner cannot delete private or unlisted trip
    const unauthorizedDel = await request(`/trips/${privateTripId}`, {
      method: 'DELETE',
      headers: user2Headers
    });
    recordTest(
      'DELETE /api/trips/:id rejects non-owner with 403 Forbidden',
      unauthorizedDel.status === 403,
      `Status: ${unauthorizedDel.status}`
    );

    // Lifecycle Step 1: Owner updates trip from 'private' to 'unlisted' -> should generate a new share_token
    const updateToUnlisted = await request(`/trips/${privateTripId}`, {
      method: 'PUT',
      headers: user1Headers,
      body: { visibility: 'unlisted' }
    });
    const generatedToken1 = updateToUnlisted.data?.data?.share_token;

    recordTest(
      'Updating trip from private to unlisted generates a fresh share_token',
      updateToUnlisted.status === 200 && updateToUnlisted.data.data.visibility === 'unlisted' &&
      typeof generatedToken1 === 'string' && generatedToken1.length === 32,
      `Generated token: ${generatedToken1?.slice(0, 8)}...`
    );

    // Lifecycle Step 2: Owner updates from 'unlisted' to 'private' -> share_token should be cleared to null
    const updateToPrivate = await request(`/trips/${privateTripId}`, {
      method: 'PUT',
      headers: user1Headers,
      body: { visibility: 'private' }
    });
    recordTest(
      'Updating trip from unlisted to private clears share_token to null',
      updateToPrivate.status === 200 && updateToPrivate.data.data.visibility === 'private' &&
      updateToPrivate.data.data.share_token === null,
      `Token: ${updateToPrivate.data?.data?.share_token}`
    );

    // Verify the previous link is now completely dead (404)
    const deadLinkRes = await request(`/trips/${privateTripId}?token=${generatedToken1}`);
    recordTest(
      'Old share token cannot access the trip once turned private (404)',
      deadLinkRes.status === 404,
      `Status: ${deadLinkRes.status}`
    );

    // Lifecycle Step 3: Owner updates from 'private' back to 'unlisted' -> generates ROTATED new token
    const updateToUnlistedRotated = await request(`/trips/${privateTripId}`, {
      method: 'PUT',
      headers: user1Headers,
      body: { visibility: 'unlisted' }
    });
    const rotatedToken = updateToUnlistedRotated.data?.data?.share_token;

    recordTest(
      'Turning trip back to unlisted generates a rotated new token (different from old token)',
      rotatedToken && rotatedToken !== generatedToken1 && rotatedToken.length === 32,
      `Old: ${generatedToken1?.slice(0, 8)}..., New: ${rotatedToken?.slice(0, 8)}...`
    );

    // Lifecycle Step 4: Owner updates from 'unlisted' to 'public' -> share_token cleared
    const updateToPublic = await request(`/trips/${privateTripId}`, {
      method: 'PUT',
      headers: user1Headers,
      body: { visibility: 'public' }
    });
    recordTest(
      'Updating trip from unlisted to public clears share_token to null',
      updateToPublic.status === 200 && updateToPublic.data.data.visibility === 'public' &&
      updateToPublic.data.data.share_token === null,
      `Token: ${updateToPublic.data?.data?.share_token}`
    );

    // Owner deletes trip
    const ownerDeleteTrip = await request(`/trips/${privateTripId}`, {
      method: 'DELETE',
      headers: user1Headers
    });
    recordTest(
      'DELETE /api/trips/:id allows owner to successfully delete trip (200)',
      ownerDeleteTrip.status === 200 && ownerDeleteTrip.data.success === true,
      `Deleted ID: ${ownerDeleteTrip.data?.deleted_id}`
    );

    // -----------------------------------------------------------------
    // 12. Visibility Validation Gate
    // -----------------------------------------------------------------
    console.log('\n[11. Payload Validation Gate]');
    const invalidVisibilityCreate = await request('/trips', {
      method: 'POST',
      headers: user1Headers,
      body: {
        title: 'Trip With Invalid Visibility',
        destination_id: 1,
        start_date: '2026-12-01',
        end_date: '2026-12-05',
        visibility: 'super-secret'
      }
    });
    recordTest(
      'POST /api/trips rejects invalid visibility with 400 Bad Request',
      invalidVisibilityCreate.status === 400 && invalidVisibilityCreate.data.details?.some(d => d.includes('visibility')),
      `Details: ${JSON.stringify(invalidVisibilityCreate.data?.details)}`
    );

    const invalidVisibilityPut = await request(`/trips/${unlistedTripId}`, {
      method: 'PUT',
      headers: user1Headers,
      body: { visibility: 'hidden' }
    });
    recordTest(
      'PUT /api/trips/:id rejects invalid visibility with 400 Bad Request',
      invalidVisibilityPut.status === 400 && invalidVisibilityPut.data.details?.some(d => d.includes('visibility')),
      `Details: ${JSON.stringify(invalidVisibilityPut.data?.details)}`
    );

  } finally {
    if (serverInstance) {
      await new Promise(res => serverInstance.close(res));
    }
    closeDb();
    cleanFiles(TEST_DB_PATH);
    cleanFiles(TEST_MIGRATION_DB_PATH);
    console.log('\n  -> Isolated test databases cleanly unlinked.\n');
  }

  console.log('======================================================');
  console.log(`TEST RESULTS: ${results.passed}/${results.total} PASSED (${results.failed} FAILED)`);
  console.log('======================================================\n');

  if (results.failed > 0) {
    process.exit(1);
  }
}

runPrivacyTestSuite().catch(err => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
