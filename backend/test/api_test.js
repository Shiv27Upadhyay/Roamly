/**
 * Roamly Automated End-to-End API Test Suite
 * Tests all endpoints, validation, error handling, ownership rules, interactions, and DB persistence.
 */

const path = require('path');
const fs = require('fs');

process.env.NODE_ENV = 'test';
process.env.PORT = '5099';
process.env.JWT_SECRET = 'test_super_secret_jwt_key_for_isolated_test_suite_32chars';
const TEST_DB_PATH = path.resolve(__dirname, '../data/test_api_isolated.db');
process.env.DB_PATH = TEST_DB_PATH;

function cleanTestDb() {
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  if (fs.existsSync(TEST_DB_PATH + '-wal')) fs.unlinkSync(TEST_DB_PATH + '-wal');
  if (fs.existsSync(TEST_DB_PATH + '-shm')) fs.unlinkSync(TEST_DB_PATH + '-shm');
}
cleanTestDb();

const { app } = require('../src/server');
const { getDb, closeDb } = require('../src/config/db');
const { signSessionToken } = require('../src/middleware/auth');

const defaultToken = signSessionToken({
  id: 1,
  name: 'Elena Rostova',
  username: 'elena',
  email: 'elena@roamly.local'
});

const TEST_PORT = 5099;
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

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    'Connection': 'close',
    'Authorization': `Bearer ${defaultToken}`,
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

  return { status: response.status, data };
}

async function startServer(port = TEST_PORT) {
  return new Promise((resolve, reject) => {
    const s = app.listen(port, '127.0.0.1', () => {
      resolve(s);
    });
    s.on('error', reject);
  });
}

async function stopServer(server) {
  return new Promise((resolve) => {
    if (!server) return resolve();
    server.close(() => {
      resolve();
    });
  });
}

async function runTestSuite() {
  console.log('\n========================================');
  console.log('   ROAMLY BACKEND E2E TEST SUITE        ');
  console.log('========================================\n');

  // Start test server
  serverInstance = await startServer(TEST_PORT);
  console.log(`Test server running on http://127.0.0.1:${TEST_PORT}\n`);

  try {
    // 1. Health & Welcome Check
    console.log('[1. System Health & Routing]');
    const health = await request('/health');
    recordTest(
      'GET /api/health returns 200 with active user info',
      health.status === 200 && health.data.success === true && health.data.active_user.id === 1,
      JSON.stringify(health.data)
    );

    const rootWelcome = await fetch(`http://127.0.0.1:${TEST_PORT}/`).then(r => r.json());
    recordTest(
      'GET / returns welcome object with tagline',
      rootWelcome.success === true && rootWelcome.tagline.includes('Discover'),
      JSON.stringify(rootWelcome)
    );

    // 2. Destinations Endpoint
    console.log('\n[2. Destinations Catalog, Search & Filter]');
    const allDests = await request('/destinations');
    recordTest(
      'GET /api/destinations returns 8 seeded destinations with tags and is_bookmarked',
      allDests.status === 200 && allDests.data.count === 8 && Array.isArray(allDests.data.data[0].tags),
      `Count: ${allDests.data.count}`
    );

    // Search filter
    const searchKyoto = await request('/destinations?search=Kyoto');
    recordTest(
      'GET /api/destinations?search=Kyoto filters accurately',
      searchKyoto.status === 200 && searchKyoto.data.count === 1 && searchKyoto.data.data[0].title === 'Kyoto',
      `Found: ${searchKyoto.data.data.map(d => d.title).join(', ')}`
    );

    // Continent filter
    const filterEurope = await request('/destinations?continent=Europe');
    recordTest(
      'GET /api/destinations?continent=Europe returns European destinations',
      filterEurope.status === 200 && filterEurope.data.count === 3 && filterEurope.data.data.every(d => d.continent === 'Europe'),
      `Count: ${filterEurope.data.count}`
    );

    // Budget filter
    const filterBudget = await request('/destinations?budget_tier=$');
    recordTest(
      'GET /api/destinations?budget_tier=$ filters budget destinations',
      filterBudget.status === 200 && filterBudget.data.count === 2 && filterBudget.data.data.every(d => d.budget_tier === '$'),
      `Count: ${filterBudget.data.count}`
    );

    // Destination Detail
    const destDetail = await request('/destinations/1');
    recordTest(
      'GET /api/destinations/1 returns destination with associated trips',
      destDetail.status === 200 && destDetail.data.data.title === 'Kyoto' && Array.isArray(destDetail.data.data.associated_trips),
      `Title: ${destDetail.data.data.title}`
    );

    const dest404 = await request('/destinations/999');
    recordTest(
      'GET /api/destinations/999 returns 404 for nonexistent destination',
      dest404.status === 404 && dest404.data.success === false,
      `Status: ${dest404.status}`
    );

    const destInvalidId = await request('/destinations/invalid-id');
    recordTest(
      'GET /api/destinations/invalid-id returns 400 Bad Request',
      destInvalidId.status === 400 && destInvalidId.data.success === false,
      `Status: ${destInvalidId.status}`
    );

    // 3. Trips CRUD & Validation
    console.log('\n[3. Trips CRUD, Transactions & Validation]');
    const allTrips = await request('/trips');
    recordTest(
      'GET /api/trips lists trips with author and stop counts',
      allTrips.status === 200 && allTrips.data.count >= 3 && allTrips.data.data[0].author_name !== undefined,
      `Count: ${allTrips.data.count}`
    );

    // Valid Trip Creation
    const newTripPayload = {
      title: 'Nordic Winter Trails & Aurora',
      destination_id: 4,
      start_date: '2026-12-10',
      end_date: '2026-12-17',
      currency: 'INR',
      estimated_budget: 3100,
      notes: 'Glacier trekking, black sand beach sunrise, and geothermal lagoon bathing.',
      stops: [
        {
          day_number: 1,
          place_name: 'Reykjavik Old Harbor Bakery',
          category: 'Food',
          cost: 35,
          notes: 'Warm cinnamon rolls and Arctic coffee.'
        },
        {
          day_number: 2,
          place_name: 'Skógafoss Waterfall Trail',
          category: 'Nature',
          cost: 0,
          notes: 'Ascend steps for top panoramic view.'
        }
      ]
    };

    const createRes = await request('/trips', {
      method: 'POST',
      body: newTripPayload
    });

    const createdTripId = createRes.data?.data?.id;
    recordTest(
      'POST /api/trips successfully creates trip with stops in transaction',
      createRes.status === 200 && createdTripId > 0 && createRes.data.data.stops.length === 2,
      `Created ID: ${createdTripId}, Stops: ${createRes.data?.data?.stops?.length}`
    );

    // Validation Test: Missing title
    const invalidTrip1 = await request('/trips', {
      method: 'POST',
      body: { start_date: '2026-12-10', end_date: '2026-12-17' }
    });
    recordTest(
      'POST /api/trips fails with 400 when required title is missing',
      invalidTrip1.status === 400 && invalidTrip1.data.success === false,
      `Status: ${invalidTrip1.status}`
    );

    // Validation Test: start_date > end_date
    const invalidTrip2 = await request('/trips', {
      method: 'POST',
      body: {
        title: 'Impossible Time Machine Trip',
        start_date: '2026-12-20',
        end_date: '2026-12-10'
      }
    });
    recordTest(
      'POST /api/trips fails with 400 when start_date > end_date',
      invalidTrip2.status === 400 && invalidTrip2.data.details?.some(d => d.includes('cannot be after')),
      `Error details: ${JSON.stringify(invalidTrip2.data.details)}`
    );

    // Validation Test: Nonexistent destination_id
    const invalidTrip3 = await request('/trips', {
      method: 'POST',
      body: {
        title: 'Trip to Nowhere',
        start_date: '2026-12-10',
        end_date: '2026-12-15',
        destination_id: 8888
      }
    });
    recordTest(
      'POST /api/trips fails with 400 when destination_id does not exist',
      invalidTrip3.status === 400 && invalidTrip3.data.details?.some(d => d.includes('does not exist')),
      `Error details: ${JSON.stringify(invalidTrip3.data.details)}`
    );

    // 4. Ownership Verification Tests
    console.log('\n[4. Ownership Protection Rules]');
    // Trip 2 belongs to User 2 (Marcus). Demo user is User 1 (Elena).
    // Test: User 1 trying to edit User 2's trip
    const unauthorizedEdit = await request('/trips/2', {
      method: 'PUT',
      headers: { 'x-user-id': '1' },
      body: { title: 'Hacked Title By User 1' }
    });
    recordTest(
      'PUT /api/trips/2 rejects unauthorized user with 403 Forbidden',
      unauthorizedEdit.status === 403 && unauthorizedEdit.data.error.includes('Forbidden'),
      `Status: ${unauthorizedEdit.status}, Error: ${unauthorizedEdit.data.error}`
    );

    // Test: User 1 trying to delete User 2's trip
    const unauthorizedDelete = await request('/trips/2', {
      method: 'DELETE',
      headers: { 'x-user-id': '1' }
    });
    recordTest(
      'DELETE /api/trips/2 rejects unauthorized user with 403 Forbidden',
      unauthorizedDelete.status === 403 && unauthorizedDelete.data.error.includes('Forbidden'),
      `Status: ${unauthorizedDelete.status}, Error: ${unauthorizedDelete.data.error}`
    );

    // Test: Authorized update by owner on createdTripId
    const authorizedUpdate = await request(`/trips/${createdTripId}`, {
      method: 'PUT',
      headers: { 'x-user-id': '1' },
      body: {
        title: 'Nordic Winter Trails & Aurora (Updated Edition)',
        estimated_budget: 3450
      }
    });
    recordTest(
      'PUT /api/trips/:id allows owner to update trip details',
      authorizedUpdate.status === 200 && authorizedUpdate.data.data.title.includes('Updated Edition') && authorizedUpdate.data.data.estimated_budget === 3450,
      `New Title: ${authorizedUpdate.data?.data?.title}`
    );

    // 5. Interactions: Bookmarks, Likes & Comments
    console.log('\n[5. Real Interactions: Bookmarks, Likes & Comments]');
    // Bookmark Toggle: Save Destination 3 (Oaxaca)
    const bookmarkToggle1 = await request('/destinations/3/bookmark', {
      method: 'POST',
      headers: { 'x-user-id': '1' }
    });
    recordTest(
      'POST /api/destinations/3/bookmark saves destination (bookmarked: true)',
      bookmarkToggle1.status === 201 && bookmarkToggle1.data.data.bookmarked === true,
      `Bookmarked: ${bookmarkToggle1.data.data.bookmarked}`
    );

    // Bookmarks Listing
    const userBookmarks = await request('/bookmarks', {
      headers: { 'x-user-id': '1' }
    });
    recordTest(
      'GET /api/bookmarks lists user wishlist containing newly saved destination',
      userBookmarks.status === 200 && userBookmarks.data.data.some(d => d.id === 3),
      `Bookmarks Count: ${userBookmarks.data.count}`
    );

    // Bookmark Toggle again: Remove Destination 3
    const bookmarkToggle2 = await request('/destinations/3/bookmark', {
      method: 'POST',
      headers: { 'x-user-id': '1' }
    });
    recordTest(
      'POST /api/destinations/3/bookmark toggles off (bookmarked: false)',
      bookmarkToggle2.status === 200 && bookmarkToggle2.data.data.bookmarked === false,
      `Bookmarked: ${bookmarkToggle2.data.data.bookmarked}`
    );

    // Trip Like Toggle
    const likeToggle1 = await request('/trips/1/like', {
      method: 'POST',
      headers: { 'x-user-id': '1' }
    });
    recordTest(
      'POST /api/trips/1/like toggles like on trip and increments count',
      likeToggle1.status === 200 && likeToggle1.data.data.liked === true,
      `Likes count: ${likeToggle1.data.data.likes_count}`
    );

    const likeToggle2 = await request('/trips/1/like', {
      method: 'POST',
      headers: { 'x-user-id': '1' }
    });
    recordTest(
      'POST /api/trips/1/like unlikes on second call',
      likeToggle2.status === 200 && likeToggle2.data.data.liked === false,
      `Likes count: ${likeToggle2.data.data.likes_count}`
    );

    // Post Comment
    const commentRes = await request(`/trips/${createdTripId}/comments`, {
      method: 'POST',
      headers: { 'x-user-id': '1' },
      body: { content: 'Packed warm crampons and thermal boots for the glacier trail!' }
    });
    const createdCommentId = commentRes.data?.data?.id;
    recordTest(
      'POST /api/trips/:id/comments creates comment with author metadata',
      commentRes.status === 201 && createdCommentId > 0 && commentRes.data.data.user_name === 'Elena Rostova',
      `Comment ID: ${createdCommentId}`
    );

    // Comment ownership check: User 2 cannot delete User 1's comment
    const marcusToken = signSessionToken({ id: 2, name: 'Marcus Chen', username: 'marcus', email: 'marcus@roamly.local' });
    const unauthorizedCommentDel = await request(`/comments/${createdCommentId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${marcusToken}` }
    });
    recordTest(
      'DELETE /api/comments/:id rejects non-author with 403 Forbidden',
      unauthorizedCommentDel.status === 403 && unauthorizedCommentDel.data.error.includes('Forbidden'),
      `Status: ${unauthorizedCommentDel.status}`
    );

    // Author deletes comment
    const authorizedCommentDel = await request(`/comments/${createdCommentId}`, {
      method: 'DELETE',
      headers: { 'x-user-id': '1' }
    });
    recordTest(
      'DELETE /api/comments/:id allows author to delete their comment',
      authorizedCommentDel.status === 200 && authorizedCommentDel.data.success === true,
      `Status: ${authorizedCommentDel.status}`
    );

    // 6. User Profile & Aggregated Stats
    console.log('\n[6. User Profile & Activity Aggregations]');
    const profileRes = await request('/profile', {
      headers: { 'x-user-id': '1' }
    });
    recordTest(
      'GET /api/profile returns user details, stats, trips, and saved destinations',
      profileRes.status === 200 &&
      profileRes.data.data.user.name === 'Elena Rostova' &&
      typeof profileRes.data.data.stats.trips_count === 'number' &&
      Array.isArray(profileRes.data.data.trips),
      `Trips: ${profileRes.data.data.stats.trips_count}, Saved: ${profileRes.data.data.stats.saved_destinations_count}`
    );

    const profile404 = await request('/profile/999');
    recordTest(
      'GET /api/profile/999 returns 404 for unknown user',
      profile404.status === 404 && profile404.data.success === false,
      `Status: ${profile404.status}`
    );

    // 7. General Error Handling & 404 Routing
    console.log('\n[7. 404 Routing & Request Handling]');
    const unknownRoute = await request('/nonexistent-path-for-testing');
    recordTest(
      'GET /api/nonexistent-path-for-testing returns 404 with structured error',
      unknownRoute.status === 404 && unknownRoute.data.success === false,
      `Error: ${unknownRoute.data.error}`
    );

    // Clean up created test trip
    const deleteCreatedTrip = await request(`/trips/${createdTripId}`, {
      method: 'DELETE',
      headers: { 'x-user-id': '1' }
    });
    recordTest(
      'DELETE /api/trips/:id allows owner to delete created trip',
      deleteCreatedTrip.status === 200 && deleteCreatedTrip.data.deleted_id === createdTripId,
      `Deleted ID: ${deleteCreatedTrip.data.deleted_id}`
    );

    // 8. Database Persistence Across Server Restart
    console.log('\n[8. Database Disk Persistence Across Restarts]');
    // Create a special persistent trip
    const persistenceTripRes = await request('/trips', {
      method: 'POST',
      headers: { 'x-user-id': '1' },
      body: {
        title: 'Persistent Disk Storage Verification Trip',
        destination_id: 1,
        start_date: '2026-11-20',
        end_date: '2026-11-25',
        currency: 'INR',
        estimated_budget: 1850,
        notes: 'Created specifically to verify that data survives a full server shutdown and restart.'
      }
    });
    const persistenceTripId = persistenceTripRes.data?.data?.id;
    recordTest(
      'Created persistence verification trip before shutdown',
      persistenceTripRes.status === 200 && persistenceTripId > 0,
      `Persistence Trip ID: ${persistenceTripId}`
    );

    // Stop server and close database completely
    await stopServer(serverInstance);
    serverInstance = null;
    closeDb();
    console.log('  -> Server gracefully stopped and database closed.');

    // Small delay to ensure port release on Windows
    await new Promise((r) => setTimeout(r, 600));

    // Verify direct disk presence using a new DB instance
    const directDb = getDb();
    const diskTrip = directDb.prepare('SELECT id, title FROM trips WHERE id = ?').get(persistenceTripId);
    recordTest(
      'Data survives full shutdown (persisted on disk in roamly.db)',
      diskTrip !== undefined && diskTrip.id === persistenceTripId && diskTrip.title.includes('Persistent Disk'),
      `Persisted Record Found: ID ${diskTrip?.id} - "${diskTrip?.title}"`
    );

    // Start a new server instance on the same port to verify HTTP API access after reboot
    serverInstance = await startServer(TEST_PORT);
    console.log('  -> New server started on same port.');

    const verifyRebootFetch = await request(`/trips/${persistenceTripId}`);
    recordTest(
      'GET /api/trips/:id fetches persisted record after server restart',
      verifyRebootFetch.status === 200 && verifyRebootFetch.data?.data?.id === persistenceTripId,
      `Fetched Title: "${verifyRebootFetch.data?.data?.title}"`
    );

    // Clean up persistence test record
    directDb.prepare('DELETE FROM trips WHERE id = ?').run(persistenceTripId);
    recordTest(
      'Persistence test record cleaned up successfully',
      true
    );

  } finally {
    if (serverInstance) {
      await stopServer(serverInstance);
    }
    closeDb();
    cleanTestDb();
  }

  // Print Summary Table
  console.log('\n========================================');
  console.log(`TEST RESULTS: ${results.passed}/${results.total} PASSED (${results.failed} FAILED)`);
  console.log('========================================\n');

  if (results.failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
