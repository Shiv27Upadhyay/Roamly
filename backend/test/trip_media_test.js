/**
 * Roamly Automated Trip Media & Cloudinary Integration Test Suite
 * Strictly runs against an ISOLATED temporary test database (never touches roamly.db).
 */

const path = require('path');
const fs = require('fs');

const TEST_PORT = 5095;
const TEST_DB_PATH = path.resolve(__dirname, '../data/test_media_isolated.db');
const TEST_MIGRATION_DB_PATH = path.resolve(__dirname, '../data/test_media_migration.db');

process.env.NODE_ENV = 'test';
process.env.PORT = String(TEST_PORT);
process.env.DB_PATH = TEST_DB_PATH;
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.JWT_SECRET = 'test_super_secret_jwt_key_for_media_suite_32chars';
process.env.CLOUDINARY_CLOUD_NAME = 'roamly_test_cloud';
process.env.CLOUDINARY_API_KEY = '123456789012345';
process.env.CLOUDINARY_API_SECRET = 'test_mock_cloudinary_secret_key_32chars';

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

  return {
    status: response.status,
    headers: response.headers,
    data
  };
}

async function runTestSuite() {
  console.log('\n======================================================');
  console.log('   ROAMLY TRIP MEDIA & CLOUDINARY TEST SUITE          ');
  console.log(`   (Isolated Test DB: ${path.basename(TEST_DB_PATH)})`);
  console.log('======================================================\n');

  try {
    // -----------------------------------------------------------------
    // 1. Schema Migration & Idempotency Check
    // -----------------------------------------------------------------
    console.log('[1. Schema Migration & Idempotency]');

    cleanFiles(TEST_MIGRATION_DB_PATH);
    const isolatedDb = new DatabaseSync(TEST_MIGRATION_DB_PATH);
    initSchema(isolatedDb);

    const tables = isolatedDb.prepare("SELECT name FROM sqlite_master WHERE type='table';").all().map(t => t.name);
    recordTest(
      'Schema defines trip_media table',
      tables.includes('trip_media'),
      `Tables: ${tables.join(', ')}`
    );

    const indexes = isolatedDb.prepare("SELECT name FROM sqlite_master WHERE type='index';").all().map(i => i.name);
    recordTest(
      'Indexes created for trip_media (trip_id, type, user_id, public_id, trip_type compound)',
      indexes.includes('idx_trip_media_trip_id') &&
      indexes.includes('idx_trip_media_type') &&
      indexes.includes('idx_trip_media_user_id') &&
      indexes.includes('idx_trip_media_public_id') &&
      indexes.includes('idx_trip_media_trip_type')
    );

    let migrationRepeatSuccess = true;
    try {
      migrateSchema(isolatedDb);
      migrateSchema(isolatedDb);
    } catch (e) {
      migrationRepeatSuccess = false;
    }
    recordTest(
      'Repeated migration runs idempotently without corrupting schema',
      migrationRepeatSuccess
    );
    isolatedDb.close();
    cleanFiles(TEST_MIGRATION_DB_PATH);

    // -----------------------------------------------------------------
    // 2. Setup Active Test Database & Test Server
    // -----------------------------------------------------------------
    cleanFiles(TEST_DB_PATH);
    const activeDb = getDb();
    seedDatabase(true);

    serverInstance = await new Promise((resolve) => {
      const s = app.listen(TEST_PORT, () => resolve(s));
    });

    // Test Users
    // User 1: Elena Rostova (Owner of trip 1)
    const user1 = activeDb.prepare('SELECT * FROM users WHERE id = 1').get();
    const user1Token = signSessionToken(user1);
    const user1Headers = { 'Cookie': `roamly_session=${user1Token}` };

    // User 2: Marcus Vance (Collaborator / Group Member)
    const user2 = activeDb.prepare('SELECT * FROM users WHERE id = 2').get();
    const user2Token = signSessionToken(user2);
    const user2Headers = { 'Cookie': `roamly_session=${user2Token}` };

    // User 3: Outsider / Non-Member
    activeDb.prepare(`
      INSERT INTO users (name, username, email, home_city)
      VALUES ('Outsider User', 'outsider', 'outsider@roamly.local', 'Berlin')
    `).run();
    const user3 = activeDb.prepare('SELECT * FROM users WHERE username = ?').get('outsider');
    const user3Token = signSessionToken(user3);
    const user3Headers = { 'Cookie': `roamly_session=${user3Token}` };

    // Create group workspace for Trip 1 and add Marcus as member
    const groupRes = await request('/trips/1/group', {
      method: 'POST',
      headers: user1Headers,
      body: { name: 'Kyoto Photo Expedition' }
    });
    const trip1GroupId = groupRes.data.data.id;
    const trip1InviteCode = groupRes.data.data.invite_code;

    // Marcus joins group
    await request('/groups/join', {
      method: 'POST',
      headers: user2Headers,
      body: { code: trip1InviteCode }
    });

    // -----------------------------------------------------------------
    // 3. Upload Signature Authorization
    // -----------------------------------------------------------------
    console.log('\n[2. Upload Signature Authorization]');

    // 3.1 Unauthenticated rejected with 401
    const unauthSig = await request('/trips/1/media/signature', {
      method: 'POST',
      body: { media_type: 'photo' }
    });
    recordTest(
      'POST /api/trips/:id/media/signature rejects unauthenticated request with 401',
      unauthSig.status === 401
    );

    // 3.2 Outsider rejected with 403
    const outsiderSig = await request('/trips/1/media/signature', {
      method: 'POST',
      headers: user3Headers,
      body: { media_type: 'photo' }
    });
    recordTest(
      'POST /api/trips/:id/media/signature rejects non-member outsider with 403',
      outsiderSig.status === 403
    );

    // 3.3 Trip owner allowed (200)
    const ownerSig = await request('/trips/1/media/signature', {
      method: 'POST',
      headers: user1Headers,
      body: { media_type: 'photo' }
    });
    recordTest(
      'POST /api/trips/:id/media/signature allows trip owner with 200',
      ownerSig.status === 200 &&
      Boolean(ownerSig.data.data.signature) &&
      ownerSig.data.data.folder.startsWith('roamly/trips/1/')
    );

    // 3.4 Active group member allowed (200)
    const memberSig = await request('/trips/1/media/signature', {
      method: 'POST',
      headers: user2Headers,
      body: { media_type: 'video' }
    });
    recordTest(
      'POST /api/trips/:id/media/signature allows active group companion with 200',
      memberSig.status === 200 &&
      memberSig.data.data.resourceType === 'video' &&
      memberSig.data.data.maxBytes === 100 * 1024 * 1024
    );

    // 3.5 Invalid media_type rejected with 400
    const invalidSig = await request('/trips/1/media/signature', {
      method: 'POST',
      headers: user1Headers,
      body: { media_type: 'audio' }
    });
    recordTest(
      'POST /api/trips/:id/media/signature rejects invalid media_type with 400',
      invalidSig.status === 400
    );

    // -----------------------------------------------------------------
    // 4. Metadata Validation & Asset Registration
    // -----------------------------------------------------------------
    console.log('\n[3. Metadata Validation & Asset Registration]');

    // 4.1 Cross-trip public_id substitution blocked
    const crossTripReg = await request('/trips/1/media', {
      method: 'POST',
      headers: user1Headers,
      body: {
        public_id: 'roamly/trips/99/photos/malicious_asset',
        secure_url: 'https://res.cloudinary.com/roamly/image/upload/sample.jpg',
        media_type: 'photo',
        format: 'jpg',
        bytes: 500000
      }
    });
    recordTest(
      'POST /api/trips/:id/media blocks cross-trip public_id asset substitution (400)',
      crossTripReg.status === 400
    );

    // 4.2 Non-HTTPS secure_url blocked
    const insecureUrlReg = await request('/trips/1/media', {
      method: 'POST',
      headers: user1Headers,
      body: {
        public_id: 'roamly/trips/1/public/photos/insecure_test',
        secure_url: 'http://insecure-site.com/image.jpg',
        media_type: 'photo',
        format: 'jpg',
        bytes: 500000
      }
    });
    recordTest(
      'POST /api/trips/:id/media rejects non-HTTPS URL (400)',
      insecureUrlReg.status === 400
    );

    // 4.3 Unwhitelisted format rejected (e.g. exe or gif)
    const badFormatReg = await request('/trips/1/media', {
      method: 'POST',
      headers: user1Headers,
      body: {
        public_id: 'roamly/trips/1/public/photos/bad_format',
        secure_url: 'https://res.cloudinary.com/roamly/image/upload/file.exe',
        media_type: 'photo',
        format: 'exe',
        bytes: 500000
      }
    });
    recordTest(
      'POST /api/trips/:id/media rejects unwhitelisted format (400)',
      badFormatReg.status === 400
    );

    // 4.4 Oversized photo rejected (> 10MB)
    const oversizePhotoReg = await request('/trips/1/media', {
      method: 'POST',
      headers: user1Headers,
      body: {
        public_id: 'roamly/trips/1/public/photos/huge_photo',
        secure_url: 'https://res.cloudinary.com/roamly/image/upload/huge.jpg',
        media_type: 'photo',
        format: 'jpg',
        bytes: 15 * 1024 * 1024 // 15MB
      }
    });
    recordTest(
      'POST /api/trips/:id/media rejects photo exceeding 10MB limit (400)',
      oversizePhotoReg.status === 400
    );

    // 4.5 Oversized video rejected (> 100MB)
    const oversizeVideoReg = await request('/trips/1/media', {
      method: 'POST',
      headers: user1Headers,
      body: {
        public_id: 'roamly/trips/1/public/videos/huge_video',
        secure_url: 'https://res.cloudinary.com/roamly/video/upload/huge.mp4',
        media_type: 'video',
        format: 'mp4',
        bytes: 120 * 1024 * 1024 // 120MB
      }
    });
    recordTest(
      'POST /api/trips/:id/media rejects video exceeding 100MB limit (400)',
      oversizeVideoReg.status === 400
    );

    // 4.6 Overlong video duration rejected (> 180s)
    const longVideoReg = await request('/trips/1/media', {
      method: 'POST',
      headers: user1Headers,
      body: {
        public_id: 'roamly/trips/1/public/videos/long_video',
        secure_url: 'https://res.cloudinary.com/roamly/video/upload/long.mp4',
        media_type: 'video',
        format: 'mp4',
        bytes: 50 * 1024 * 1024,
        duration: 250.5 // 250s > 180s
      }
    });
    recordTest(
      'POST /api/trips/:id/media rejects video exceeding 180s duration limit (400)',
      longVideoReg.status === 400
    );

    // 4.7 Successful valid photo registration by Owner
    const validPhotoReg = await request('/trips/1/media', {
      method: 'POST',
      headers: user1Headers,
      body: {
        public_id: 'roamly/trips/1/public/photos/bamboo_grove_01',
        secure_url: 'https://res.cloudinary.com/roamly/image/upload/bamboo_grove_01.jpg',
        media_type: 'photo',
        format: 'jpg',
        bytes: 2400000,
        width: 1920,
        height: 1080,
        caption: 'Morning light filtering through Arashiyama bamboo path.'
      }
    });
    const photo1Id = validPhotoReg.data?.data?.id;
    recordTest(
      'POST /api/trips/:id/media registers valid photo with 201 Created',
      validPhotoReg.status === 201 &&
      validPhotoReg.data.data.caption === 'Morning light filtering through Arashiyama bamboo path.' &&
      validPhotoReg.data.data.uploader.name === 'Elena Rostova'
    );

    // 4.8 Duplicate public_id registration rejected
    const duplicatePhotoReg = await request('/trips/1/media', {
      method: 'POST',
      headers: user1Headers,
      body: {
        public_id: 'roamly/trips/1/public/photos/bamboo_grove_01',
        secure_url: 'https://res.cloudinary.com/roamly/image/upload/bamboo_grove_01.jpg',
        media_type: 'photo',
        format: 'jpg',
        bytes: 2400000
      }
    });
    recordTest(
      'POST /api/trips/:id/media rejects duplicate public_id registration (400)',
      duplicatePhotoReg.status === 400
    );

    // 4.9 Successful valid video registration by Companion (Marcus)
    const validVideoReg = await request('/trips/1/media', {
      method: 'POST',
      headers: user2Headers,
      body: {
        public_id: 'roamly/trips/1/public/videos/kamo_river_walk',
        secure_url: 'https://res.cloudinary.com/roamly/video/upload/kamo_river_walk.mp4',
        media_type: 'video',
        format: 'mp4',
        bytes: 35000000,
        width: 1920,
        height: 1080,
        duration: 45.2,
        caption: 'Sunset stroll along the Kamo River.'
      }
    });
    const video1Id = validVideoReg.data?.data?.id;
    recordTest(
      'POST /api/trips/:id/media allows companion to register valid video (201)',
      validVideoReg.status === 201 &&
      validVideoReg.data.data.duration === 45.2 &&
      validVideoReg.data.data.uploader.username === 'marcusvance'
    );

    // -----------------------------------------------------------------
    // 5. Media Retrieval & Categorization
    // -----------------------------------------------------------------
    console.log('\n[4. Media Retrieval & Categorization]');

    const getMedia = await request('/trips/1/media');
    recordTest(
      'GET /api/trips/:id/media returns separated photos and videos',
      getMedia.status === 200 &&
      getMedia.data.count === 2 &&
      getMedia.data.photos.length === 1 &&
      getMedia.data.videos.length === 1
    );

    const getPhotosOnly = await request('/trips/1/media?type=photo');
    recordTest(
      'GET /api/trips/:id/media?type=photo filters correctly',
      getPhotosOnly.status === 200 &&
      getPhotosOnly.data.data.length === 1 &&
      getPhotosOnly.data.data[0].media_type === 'photo'
    );

    // -----------------------------------------------------------------
    // 6. Private & Unlisted Trip Media Access Isolation
    // -----------------------------------------------------------------
    console.log('\n[5. Private & Unlisted Trip Media Access Isolation]');

    // Create a private trip for Elena
    const privateTripRes = activeDb.prepare(`
      INSERT INTO trips (user_id, destination_id, title, visibility, start_date, end_date)
      VALUES (1, 1, 'Secret Kyoto Retreat', 'private', '2026-11-01', '2026-11-05')
    `).run();
    const privateTripId = privateTripRes.lastInsertRowid;

    // Create group on private trip and add Marcus
    const privateGroupRes = await request(`/trips/${privateTripId}/group`, {
      method: 'POST',
      headers: user1Headers,
      body: { name: 'Secret Kyoto Team' }
    });
    const privateInviteCode = privateGroupRes.data.data.invite_code;
    await request('/groups/join', {
      method: 'POST',
      headers: user2Headers,
      body: { code: privateInviteCode }
    });

    // Upload a photo to the private trip
    const privatePhoto = await request(`/trips/${privateTripId}/media`, {
      method: 'POST',
      headers: user1Headers,
      body: {
        public_id: `roamly/trips/${privateTripId}/secret_salt/photos/zen_garden`,
        secure_url: 'https://res.cloudinary.com/roamly/image/upload/zen_garden.jpg',
        media_type: 'photo',
        format: 'jpg',
        bytes: 1800000,
        caption: 'Strictly private zen garden photo'
      }
    });
    recordTest(
      'Media upload succeeds on private trip for owner (201)',
      privatePhoto.status === 201
    );

    // Outsider (User 3) attempts to access private media
    const outsiderPrivateAccess = await request(`/trips/${privateTripId}/media`, {
      headers: user3Headers
    });
    recordTest(
      'GET /api/trips/:id/media on private trip returns uniform 404 to outsider',
      outsiderPrivateAccess.status === 404
    );

    // Unauthenticated visitor attempts to access private media
    const unauthPrivateAccess = await request(`/trips/${privateTripId}/media`);
    recordTest(
      'GET /api/trips/:id/media on private trip returns uniform 404 to unauthenticated visitor',
      unauthPrivateAccess.status === 404
    );

    // Owner can access private trip media
    const ownerPrivateAccess = await request(`/trips/${privateTripId}/media`, {
      headers: user1Headers
    });
    recordTest(
      'GET /api/trips/:id/media on private trip succeeds for owner (200)',
      ownerPrivateAccess.status === 200 &&
      ownerPrivateAccess.data.count === 1
    );

    // Active companion (Marcus) can access private trip media
    const memberPrivateAccess = await request(`/trips/${privateTripId}/media`, {
      headers: user2Headers
    });
    recordTest(
      'GET /api/trips/:id/media on private trip succeeds for companion (200)',
      memberPrivateAccess.status === 200 &&
      memberPrivateAccess.data.count === 1
    );

    // Unlisted trip tests
    const unlistedTripRes = activeDb.prepare(`
      INSERT INTO trips (user_id, destination_id, title, visibility, share_token, start_date, end_date)
      VALUES (1, 1, 'Unlisted Tokyo Tour', 'unlisted', 'secret_share_token_unlisted_12345', '2026-11-10', '2026-11-15')
    `).run();
    const unlistedTripId = unlistedTripRes.lastInsertRowid;

    await request(`/trips/${unlistedTripId}/media`, {
      method: 'POST',
      headers: user1Headers,
      body: {
        public_id: `roamly/trips/${unlistedTripId}/unlisted_salt/photos/tokyo_tower`,
        secure_url: 'https://res.cloudinary.com/roamly/image/upload/tokyo_tower.jpg',
        media_type: 'photo',
        format: 'jpg',
        bytes: 1500000
      }
    });

    const unlistedNoToken = await request(`/trips/${unlistedTripId}/media`);
    recordTest(
      'GET /api/trips/:id/media on unlisted trip returns 404 without token',
      unlistedNoToken.status === 404
    );

    const unlistedBadToken = await request(`/trips/${unlistedTripId}/media?token=wrong_token`);
    recordTest(
      'GET /api/trips/:id/media on unlisted trip returns 404 with bad token',
      unlistedBadToken.status === 404
    );

    const unlistedGoodToken = await request(`/trips/${unlistedTripId}/media?token=secret_share_token_unlisted_12345`);
    recordTest(
      'GET /api/trips/:id/media on unlisted trip returns 200 with valid share token',
      unlistedGoodToken.status === 200 &&
      unlistedGoodToken.data.count === 1
    );

    // -----------------------------------------------------------------
    // 7. Deletion Permissions & Moderation
    // -----------------------------------------------------------------
    console.log('\n[6. Deletion Permissions & Moderation]');

    // Marcus uploaded video1Id on Trip 1
    // 7.1 Outsider attempts to delete Marcus's video -> 403
    const outsiderDelete = await request(`/trips/1/media/${video1Id}`, {
      method: 'DELETE',
      headers: user3Headers
    });
    recordTest(
      'DELETE /api/trips/:id/media/:mediaId rejects non-member outsider with 403',
      outsiderDelete.status === 403
    );

    // 7.2 Unauthenticated user attempts to delete -> 401
    const unauthDelete = await request(`/trips/1/media/${video1Id}`, {
      method: 'DELETE'
    });
    recordTest(
      'DELETE /api/trips/:id/media/:mediaId rejects unauthenticated request with 401',
      unauthDelete.status === 401
    );

    // 7.3 Marcus can delete his own video
    const uploaderDelete = await request(`/trips/1/media/${video1Id}`, {
      method: 'DELETE',
      headers: user2Headers
    });
    recordTest(
      'DELETE /api/trips/:id/media/:mediaId allows uploader to delete own media (200)',
      uploaderDelete.status === 200
    );

    // Verify video is deleted from database
    const checkDeleted = activeDb.prepare('SELECT 1 FROM trip_media WHERE id = ?').get(video1Id);
    recordTest(
      'Deleted media record is removed from SQLite database',
      !checkDeleted
    );

    // Elena (owner) can delete Elena's photo
    const ownerDeleteOwn = await request(`/trips/1/media/${photo1Id}`, {
      method: 'DELETE',
      headers: user1Headers
    });
    recordTest(
      'DELETE /api/trips/:id/media/:mediaId allows trip owner to delete media (200)',
      ownerDeleteOwn.status === 200
    );

    // Test Owner Moderation: Marcus uploads another photo, Elena deletes it
    const marcusPhoto = await request('/trips/1/media', {
      method: 'POST',
      headers: user2Headers,
      body: {
        public_id: 'roamly/trips/1/public/photos/marcus_lantern',
        secure_url: 'https://res.cloudinary.com/roamly/image/upload/marcus_lantern.jpg',
        media_type: 'photo',
        format: 'jpg',
        bytes: 1200000
      }
    });
    const marcusPhotoId = marcusPhoto.data.data.id;

    // Elena deletes Marcus's photo
    const ownerModerationDelete = await request(`/trips/1/media/${marcusPhotoId}`, {
      method: 'DELETE',
      headers: user1Headers
    });
    recordTest(
      'DELETE allows trip owner to moderate and delete companion upload (200)',
      ownerModerationDelete.status === 200
    );

    // -----------------------------------------------------------------
    // 8. Revocation Upon Group Member Removal
    // -----------------------------------------------------------------
    console.log('\n[7. Immediate Revocation Upon Member Removal]');

    // Elena removes Marcus from Kyoto Retreat private trip group
    await request(`/trips/${privateTripId}/group/members/${user2.id}`, {
      method: 'DELETE',
      headers: user1Headers
    });

    // Marcus immediately loses access to private media
    const marcusPrivateAfterRemoval = await request(`/trips/${privateTripId}/media`, {
      headers: user2Headers
    });
    recordTest(
      'Removed member immediately loses access to private trip media (returns 404)',
      marcusPrivateAfterRemoval.status === 404
    );

    // Marcus can no longer request upload signatures for this private trip
    const marcusSigAfterRemoval = await request(`/trips/${privateTripId}/media/signature`, {
      method: 'POST',
      headers: user2Headers,
      body: { media_type: 'photo' }
    });
    recordTest(
      'Removed member is immediately forbidden from requesting upload signatures (403)',
      marcusSigAfterRemoval.status === 403
    );

    // -----------------------------------------------------------------
    // 9. Missing Cloudinary Configuration Gate
    // -----------------------------------------------------------------
    console.log('\n[8. Missing Cloudinary Configuration Gate]');

    const originalSecret = process.env.CLOUDINARY_API_SECRET;
    delete process.env.CLOUDINARY_API_SECRET;

    const unconfiguredSig = await request('/trips/1/media/signature', {
      method: 'POST',
      headers: user1Headers,
      body: { media_type: 'photo' }
    });
    recordTest(
      'POST /api/trips/:id/media/signature returns 503 when Cloudinary credentials are missing',
      unconfiguredSig.status === 503 &&
      unconfiguredSig.data.error.includes('Cloudinary media storage is not configured')
    );

    // Restore secret
    process.env.CLOUDINARY_API_SECRET = originalSecret;

  } catch (err) {
    console.error('Test execution failed with unexpected error:', err);
    recordTest('Test suite encountered uncaught error', false, err.message);
  } finally {
    if (serverInstance) {
      await new Promise((resolve) => serverInstance.close(resolve));
    }
    closeDb();
    cleanFiles(TEST_DB_PATH);
    cleanFiles(TEST_MIGRATION_DB_PATH);
    console.log('\n  -> Isolated test databases cleanly unlinked.');
  }

  console.log('\n======================================================');
  console.log(`TEST RESULTS: ${results.passed}/${results.total} PASSED (${results.failed} FAILED)`);
  console.log('======================================================\n');

  if (results.failed > 0) {
    process.exit(1);
  }
}

runTestSuite();
