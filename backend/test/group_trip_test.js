/**
 * Roamly Automated Group Trips & Invitation Test Suite (Phase 1)
 * Strictly runs against an ISOLATED temporary test database (never touches roamly.db).
 *
 * Verifies all 13 required scenarios:
 * 1. Idempotent schema migration for trip_groups and trip_group_members
 * 2. Authenticated trip owner creates group and is auto-registered with role 'owner'
 * 3. Non-owner cannot create group workspace for someone else's trip (403)
 * 4. Invite code format (ROAM-XXXX, 9 chars, unambiguous alphabet) & token entropy (32 chars)
 * 5. Authenticated user joins group via invite code (joined_via = invite_code, role = member)
 * 6. Authenticated user joins group via invite token (joined_via = invite_link)
 * 7. Duplicate joins are safe, idempotent, and prevent duplicate rows in database
 * 8. Invitation rotation atomically issues new code & token; immediately invalidates old ones
 * 9. Revoked invitation status rejects join attempts (403)
 * 10. Private trip is accessible to active group members (200), while non-members receive uniform 404
 * 11. Trip owner can remove a group member (200)
 * 12. Group member can voluntarily leave the group (200)
 * 13. Group owner cannot leave or be removed from the group (400)
 * 14. Unauthenticated requests are rejected (401 gate)
 * 15. Invalid inputs, invalid codes (404), and rate limiting protections
 */

const path = require('path');
const fs = require('fs');

const TEST_PORT = 5096;
const TEST_DB_PATH = path.resolve(__dirname, '../data/test_group_isolated.db');
const TEST_MIGRATION_DB_PATH = path.resolve(__dirname, '../data/test_group_migration.db');

process.env.NODE_ENV = 'test';
process.env.PORT = String(TEST_PORT);
process.env.DB_PATH = TEST_DB_PATH;
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.GOOGLE_CLIENT_ID = 'test_google_client_id.apps.googleusercontent.com';
process.env.JWT_SECRET = 'test_super_secret_jwt_key_for_group_trips_suite_32chars';

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
const {
  generateInviteCode,
  normalizeInviteCode,
  generateUniqueInviteCode,
  generateUniqueInviteToken,
  UNAMBIGUOUS_ALPHABET
} = require('../src/utils/inviteCode');
const { clearRateLimits, MAX_FAILED_ATTEMPTS } = require('../src/middleware/rateLimiter');
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

async function runGroupTestSuite() {
  console.log('\n======================================================');
  console.log('   ROAMLY GROUP TRIPS & INVITATIONS TEST SUITE        ');
  console.log('   (Isolated Test DB: ' + path.basename(TEST_DB_PATH) + ')');
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
      'Schema defines trip_groups table',
      tables.includes('trip_groups'),
      `Tables: ${tables.join(', ')}`
    );
    recordTest(
      'Schema defines trip_group_members table',
      tables.includes('trip_group_members'),
      `Tables: ${tables.join(', ')}`
    );

    // Verify idempotent repeat
    let migrationRepeatSuccess = true;
    try {
      migrateSchema(isolatedDb);
      migrateSchema(isolatedDb);
    } catch {
      migrationRepeatSuccess = false;
    }
    recordTest(
      'Repeated migration runs idempotently without error',
      migrationRepeatSuccess
    );
    isolatedDb.close();
    cleanFiles(TEST_MIGRATION_DB_PATH);

    // -----------------------------------------------------------------
    // 2. Start Test Server on Isolated Database
    // -----------------------------------------------------------------
    const activeDb = getDb(TEST_DB_PATH);
    seedDatabase(true);

    serverInstance = app.listen(TEST_PORT);
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Prepare Authenticated Test Users
    // User 1: Elena Rostova (Owner of trip 1, 2)
    const user1 = activeDb.prepare('SELECT * FROM users WHERE id = 1').get();
    const user1Token = signSessionToken(user1);
    const user1Headers = { 'Cookie': `roamly_session=${user1Token}` };

    // User 2: Marcus Vance
    const user2 = activeDb.prepare('SELECT * FROM users WHERE id = 2').get();
    const user2Token = signSessionToken(user2);
    const user2Headers = { 'Cookie': `roamly_session=${user2Token}` };

    // Create User 3 for 3rd-party join testing
    activeDb.prepare(`
      INSERT INTO users (name, username, email, home_city)
      VALUES ('Aria Montgomery', 'aria_travels', 'aria@roamly.local', 'Seattle')
    `).run();
    const user3 = activeDb.prepare('SELECT * FROM users WHERE username = ?').get('aria_travels');
    const user3Token = signSessionToken(user3);
    const user3Headers = { 'Cookie': `roamly_session=${user3Token}` };

    // -----------------------------------------------------------------
    // 3. Cryptographic Invitation Code & Token Utilities
    // -----------------------------------------------------------------
    console.log('\n[2. Cryptographic Code & Token Utilities]');

    const sampleCode = generateInviteCode();
    recordTest(
      'generateInviteCode produces 9-character code matching ROAM-XXXX format',
      typeof sampleCode === 'string' && sampleCode.length === 9 && sampleCode.startsWith('ROAM-'),
      `Generated code: ${sampleCode}`
    );

    const suffix = sampleCode.slice(5);
    const allCharsValid = suffix.split('').every(ch => UNAMBIGUOUS_ALPHABET.includes(ch));
    recordTest(
      'Invite code strictly uses unambiguous alphabet (32 characters, 20-bit entropy)',
      allCharsValid,
      `Suffix: ${suffix}`
    );

    recordTest(
      'normalizeInviteCode trims, uppercases and auto-prefixes shorthand suffix input',
      normalizeInviteCode('  roam-7k9p  ') === 'ROAM-7K9P' && normalizeInviteCode('7k9p') === 'ROAM-7K9P'
    );

    const uniqueCode = generateUniqueInviteCode(activeDb);
    const uniqueToken = generateUniqueInviteToken(activeDb);
    recordTest(
      'generateUniqueInviteCode returns valid unique code',
      typeof uniqueCode === 'string' && uniqueCode.startsWith('ROAM-')
    );
    recordTest(
      'generateUniqueInviteToken returns 32-character base64url token (192-bit entropy)',
      typeof uniqueToken === 'string' && uniqueToken.length === 32
    );

    // -----------------------------------------------------------------
    // 4. Group Workspace Creation & Owner Membership
    // -----------------------------------------------------------------
    console.log('\n[3. Group Creation & Access Control]');

    // Owner (User 1) creates group on Trip 1
    const createGroupRes = await request('/trips/1/group', {
      method: 'POST',
      headers: user1Headers,
      body: { name: 'Kyoto Spring Expedition' }
    });

    recordTest(
      'POST /api/trips/:id/group allows trip owner to create group (201 Created)',
      createGroupRes.status === 201 && createGroupRes.data.success === true,
      `Status: ${createGroupRes.status}, Error: ${createGroupRes.data?.error}`
    );

    const groupData = createGroupRes.data?.data;
    recordTest(
      'Group creator is automatically registered as member with role=owner',
      groupData?.members_count === 1 && groupData?.members[0]?.role === 'owner' && groupData?.members[0]?.user_id === 1,
      `Members: ${JSON.stringify(groupData?.members)}`
    );

    recordTest(
      'Group response exposes invite_code and 32-char invite_token to owner',
      typeof groupData?.invite_code === 'string' && groupData.invite_code.startsWith('ROAM-') &&
      typeof groupData?.invite_token === 'string' && groupData.invite_token.length === 32
    );

    // Re-creating group on same trip returns 400 (at most one group per trip)
    const duplicateGroupRes = await request('/trips/1/group', {
      method: 'POST',
      headers: user1Headers,
      body: { name: 'Duplicate Group' }
    });
    recordTest(
      'POST /api/trips/:id/group rejects duplicate group creation for same trip (400 Bad Request)',
      duplicateGroupRes.status === 400 && duplicateGroupRes.data.error?.includes('already exists')
    );

    // Non-owner (User 2) attempting to create group on User 1's trip is rejected (403)
    const nonOwnerCreateRes = await request('/trips/1/group', {
      method: 'POST',
      headers: user2Headers,
      body: { name: 'Unauthorized Group' }
    });
    recordTest(
      'POST /api/trips/:id/group rejects non-owner with 403 Forbidden',
      nonOwnerCreateRes.status === 403
    );

    // Unauthenticated request is rejected (401)
    const unauthCreateRes = await request('/trips/1/group', {
      method: 'POST',
      body: { name: 'Unauth Group' }
    });
    recordTest(
      'POST /api/trips/:id/group rejects unauthenticated request with 401 Unauthorized',
      unauthCreateRes.status === 401
    );

    // -----------------------------------------------------------------
    // 5. Group Retrieval & Token Masking for Non-Managers
    // -----------------------------------------------------------------
    console.log('\n[4. Group Details Retrieval & Security Masking]');

    // Owner retrieves group details
    const ownerGetGroupRes = await request('/trips/1/group', {
      headers: user1Headers
    });
    recordTest(
      'GET /api/trips/:id/group returns 200 with full details and invite_token for owner',
      ownerGetGroupRes.status === 200 && typeof ownerGetGroupRes.data?.data?.invite_token === 'string'
    );

    // Non-member (User 2) attempting to retrieve group
    const nonMemberGetGroupRes = await request('/trips/1/group', {
      headers: user2Headers
    });
    recordTest(
      'GET /api/trips/:id/group rejects non-member with 403 Forbidden',
      nonMemberGetGroupRes.status === 403
    );

    // -----------------------------------------------------------------
    // 5. Dynamic QR Code Generation & Authorization
    // -----------------------------------------------------------------
    console.log('\n[5. Dynamic QR Generation & Verification]');

    // Owner retrieves QR
    const ownerQrRes = await request('/trips/1/group/qr', {
      headers: user1Headers
    });
    recordTest(
      'GET /api/trips/:id/group/qr returns 200 with dynamic data URL and SVG for owner',
      ownerQrRes.status === 200 && typeof ownerQrRes.data?.data?.qr_data_url === 'string' &&
      ownerQrRes.data.data.qr_data_url.startsWith('data:image/png;base64,') &&
      typeof ownerQrRes.data.data.qr_svg === 'string' && ownerQrRes.data.data.qr_svg.includes('<svg'),
      `Status: ${ownerQrRes.status}`
    );

    recordTest(
      'QR invitation URL points to canonical /trips/join?token= flow without hardcoding',
      ownerQrRes.data?.data?.invite_url?.includes('/trips/join?token=') &&
      ownerQrRes.data?.data?.invite_url?.startsWith(process.env.FRONTEND_URL),
      `Invite URL: ${ownerQrRes.data?.data?.invite_url}`
    );

    // QR with SVG format
    const svgQrRes = await request('/trips/1/group/qr?format=svg', {
      headers: user1Headers
    });
    recordTest(
      'GET /api/trips/:id/group/qr?format=svg returns raw image/svg+xml vector',
      svgQrRes.status === 200 && typeof svgQrRes.data === 'string' && svgQrRes.data.includes('<svg')
    );

    // Non-manager (User 2) attempting to get QR is rejected (403)
    const nonManagerQrRes = await request('/trips/1/group/qr', {
      headers: user2Headers
    });
    recordTest(
      'GET /api/trips/:id/group/qr rejects non-manager member with 403 Forbidden',
      nonManagerQrRes.status === 403
    );

    // Unauthenticated QR request is rejected (401)
    const unauthQrRes = await request('/trips/1/group/qr');
    recordTest(
      'GET /api/trips/:id/group/qr rejects unauthenticated visitor with 401 Unauthorized',
      unauthQrRes.status === 401
    );

    // -----------------------------------------------------------------
    // 6. Safe Public Invitation Preview
    // -----------------------------------------------------------------
    console.log('\n[6. Public Invitation Preview]');

    const previewCodeRes = await request(`/groups/preview?code=${groupData.invite_code}`);
    recordTest(
      'GET /api/groups/preview?code= returns safe public trip preview without secret tokens',
      previewCodeRes.status === 200 && previewCodeRes.data.data?.trip_title === 'Autumn Light & Kaiseki in Kyoto' &&
      previewCodeRes.data.data?.organizer_name === 'Elena Rostova' &&
      previewCodeRes.data.data?.invite_token === undefined
    );

    const previewTokenRes = await request(`/groups/preview?token=${groupData.invite_token}`);
    recordTest(
      'GET /api/groups/preview?token= returns safe public trip preview',
      previewTokenRes.status === 200 && previewTokenRes.data.data?.destination_title === 'Kyoto'
    );

    // -----------------------------------------------------------------
    // 7. Joining via Invite Code
    // -----------------------------------------------------------------
    console.log('\n[7. Joining Group via Invite Code]');

    const activeInviteCode = groupData.invite_code;
    const activeInviteToken = groupData.invite_token;

    // User 2 joins via code
    const user2JoinRes = await request('/groups/join', {
      method: 'POST',
      headers: user2Headers,
      body: { code: activeInviteCode.toLowerCase() } // tests case-insensitivity
    });

    recordTest(
      'POST /api/groups/join allows authenticated user to join via invite code (201)',
      user2JoinRes.status === 201 && user2JoinRes.data.data?.role === 'member' && user2JoinRes.data.data?.already_member === false,
      `Status: ${user2JoinRes.status}, Data: ${JSON.stringify(user2JoinRes.data)}`
    );

    // Verify member can now fetch group, and that invite_token is NOT exposed to non-owner member
    const memberGetGroupRes = await request('/trips/1/group', {
      headers: user2Headers
    });
    recordTest(
      'GET /api/trips/:id/group succeeds (200) for active group member',
      memberGetGroupRes.status === 200 && memberGetGroupRes.data?.data?.members_count === 2
    );
    recordTest(
      'GET /api/trips/:id/group DOES NOT leak invite_token to non-manager member',
      memberGetGroupRes.data?.data?.invite_token === undefined,
      `Data keys: ${Object.keys(memberGetGroupRes.data?.data || {}).join(', ')}`
    );

    // -----------------------------------------------------------------
    // 7. Joining via Invite Token
    // -----------------------------------------------------------------
    console.log('\n[6. Joining Group via Invite Token]');

    // User 3 joins via invite token
    const user3JoinRes = await request('/groups/join', {
      method: 'POST',
      headers: user3Headers,
      body: { token: activeInviteToken, via: 'qr_code' }
    });

    recordTest(
      'POST /api/groups/join allows authenticated user to join via invite token (201)',
      user3JoinRes.status === 201 && user3JoinRes.data.data?.role === 'member'
    );

    // Verify member list in database now has 3 members
    const memberCount = activeDb.prepare('SELECT COUNT(*) as count FROM trip_group_members WHERE group_id = ?').get(groupData.id).count;
    recordTest(
      'Database contains exactly 3 members in trip_group_members',
      memberCount === 3,
      `Count: ${memberCount}`
    );

    // -----------------------------------------------------------------
    // 8. Duplicate Join Safety
    // -----------------------------------------------------------------
    console.log('\n[7. Duplicate Join Handling]');

    // User 2 joins again with same code
    const user2RejoinRes = await request('/groups/join', {
      method: 'POST',
      headers: user2Headers,
      body: { code: activeInviteCode }
    });

    recordTest(
      'POST /api/groups/join handles duplicate join safely with already_member=true (200)',
      user2RejoinRes.status === 200 && user2RejoinRes.data.data?.already_member === true
    );

    const memberCountAfterRejoin = activeDb.prepare('SELECT COUNT(*) as count FROM trip_group_members WHERE group_id = ?').get(groupData.id).count;
    recordTest(
      'Duplicate join did not create duplicate database rows',
      memberCountAfterRejoin === 3
    );

    // -----------------------------------------------------------------
    // 9. Invitation Rotation Lifecycle
    // -----------------------------------------------------------------
    console.log('\n[8. Invitation Rotation & Invalidation]');

    // Non-owner cannot rotate (403)
    const nonOwnerRotateRes = await request('/trips/1/group/invite/rotate', {
      method: 'POST',
      headers: user2Headers
    });
    recordTest(
      'POST /api/trips/:id/group/invite/rotate rejects non-owner with 403 Forbidden',
      nonOwnerRotateRes.status === 403
    );

    // Owner rotates invitations
    const ownerRotateRes = await request('/trips/1/group/invite/rotate', {
      method: 'POST',
      headers: user1Headers
    });

    recordTest(
      'POST /api/trips/:id/group/invite/rotate succeeds for owner (200)',
      ownerRotateRes.status === 200 && ownerRotateRes.data.success === true
    );

    const rotatedCode = ownerRotateRes.data.data.invite_code;
    const rotatedToken = ownerRotateRes.data.data.invite_token;

    recordTest(
      'Rotation generates a fresh, distinct invite code and token',
      rotatedCode !== activeInviteCode && rotatedToken !== activeInviteToken,
      `Old code: ${activeInviteCode}, New code: ${rotatedCode}`
    );

    // Verify QR code uses the new rotated token
    const postRotateQrRes = await request('/trips/1/group/qr', {
      headers: user1Headers
    });
    recordTest(
      'GET /api/trips/:id/group/qr automatically updates invite_url and token after rotation',
      postRotateQrRes.status === 200 && postRotateQrRes.data.data?.invite_token === rotatedToken &&
      postRotateQrRes.data.data?.invite_url?.includes(rotatedToken)
    );

    // Attempting to join with OLD code must fail (404)
    // Create User 4 to test join with old credentials
    activeDb.prepare(`
      INSERT INTO users (name, username, email, home_city)
      VALUES ('Test Visitor', 'test_visitor', 'visitor@roamly.local', 'Denver')
    `).run();
    const user4 = activeDb.prepare('SELECT * FROM users WHERE username = ?').get('test_visitor');
    const user4Token = signSessionToken(user4);
    const user4Headers = { 'Cookie': `roamly_session=${user4Token}` };

    const oldCodeJoinRes = await request('/groups/join', {
      method: 'POST',
      headers: user4Headers,
      body: { code: activeInviteCode }
    });
    recordTest(
      'Old invite code is rejected after rotation (404 Not Found)',
      oldCodeJoinRes.status === 404
    );

    // Old token must also fail (404)
    const oldTokenJoinRes = await request('/groups/join', {
      method: 'POST',
      headers: user4Headers,
      body: { token: activeInviteToken }
    });
    recordTest(
      'Old invite token is rejected after rotation (404 Not Found)',
      oldTokenJoinRes.status === 404
    );

    // Joining with NEW rotated code succeeds
    const newCodeJoinRes = await request('/groups/join', {
      method: 'POST',
      headers: user4Headers,
      body: { code: rotatedCode }
    });
    recordTest(
      'Joining with new rotated code succeeds (201)',
      newCodeJoinRes.status === 201 && newCodeJoinRes.data.data?.already_member === false
    );

    // -----------------------------------------------------------------
    // 10. Invitation Revocation / Status Update
    // -----------------------------------------------------------------
    console.log('\n[9. Invitation Revocation]');

    // Owner revokes invitations
    const revokeRes = await request('/trips/1/group/invite/status', {
      method: 'PATCH',
      headers: user1Headers,
      body: { status: 'revoked' }
    });

    recordTest(
      'PATCH /api/trips/:id/group/invite/status sets status=revoked (200)',
      revokeRes.status === 200 && revokeRes.data.data?.invite_status === 'revoked'
    );

    // QR endpoint also rejects when revoked (403)
    const qrRevokedRes = await request('/trips/1/group/qr', {
      headers: user1Headers
    });
    recordTest(
      'GET /api/trips/:id/group/qr rejects requests when invitations are revoked (403 Forbidden)',
      qrRevokedRes.status === 403 && qrRevokedRes.data.error?.includes('revoked')
    );

    // Attempting to join with revoked code is rejected with 403
    activeDb.prepare(`
      INSERT INTO users (name, username, email, home_city)
      VALUES ('Late User', 'late_user', 'late@roamly.local', 'Portland')
    `).run();
    const lateUser = activeDb.prepare('SELECT * FROM users WHERE username = ?').get('late_user');
    const lateUserHeaders = { 'Cookie': `roamly_session=${signSessionToken(lateUser)}` };

    const joinRevokedRes = await request('/groups/join', {
      method: 'POST',
      headers: lateUserHeaders,
      body: { code: rotatedCode }
    });

    recordTest(
      'POST /api/groups/join rejects joins when invitation is revoked (403 Forbidden)',
      joinRevokedRes.status === 403 && joinRevokedRes.data.error?.includes('revoked')
    );

    // Owner reactivates invitations
    const reactivateRes = await request('/trips/1/group/invite/status', {
      method: 'PATCH',
      headers: user1Headers,
      body: { status: 'active' }
    });
    recordTest(
      'PATCH /api/trips/:id/group/invite/status reactivates invitations (200)',
      reactivateRes.status === 200 && reactivateRes.data.data?.invite_status === 'active'
    );

    // Joining now succeeds after reactivation
    const joinReactivatedRes = await request('/groups/join', {
      method: 'POST',
      headers: lateUserHeaders,
      body: { code: rotatedCode }
    });
    recordTest(
      'Joining succeeds once invitation is reactivated (201)',
      joinReactivatedRes.status === 201
    );

    // -----------------------------------------------------------------
    // 11. Private Trip Access Integration
    // -----------------------------------------------------------------
    console.log('\n[10. Private Trip Access Integration]');

    // Create a private trip owned by User 1
    const createPrivateTripRes = await request('/trips', {
      method: 'POST',
      headers: user1Headers,
      body: {
        title: 'Secret Alpine Expedition',
        destination_id: 1,
        start_date: '2026-11-01',
        end_date: '2026-11-07',
        visibility: 'private'
      }
    });
    const privateTripId = createPrivateTripRes.data?.data?.id;

    // Verify User 2 (not member yet) receives uniform 404
    const outsiderReadRes = await request(`/trips/${privateTripId}`, {
      headers: user2Headers
    });
    recordTest(
      'Private trip returns uniform 404 to non-member authenticated user',
      outsiderReadRes.status === 404
    );

    // Create group for private trip
    const privateGroupRes = await request(`/trips/${privateTripId}/group`, {
      method: 'POST',
      headers: user1Headers,
      body: { name: 'Alpine Secret Group' }
    });
    const privateGroupCode = privateGroupRes.data?.data?.invite_code;

    // User 2 joins the private trip group
    const user2JoinPrivateRes = await request('/groups/join', {
      method: 'POST',
      headers: user2Headers,
      body: { code: privateGroupCode }
    });
    recordTest(
      'User 2 joins private trip group successfully',
      user2JoinPrivateRes.status === 201
    );

    // User 2 can now access the private trip!
    const memberReadPrivateRes = await request(`/trips/${privateTripId}`, {
      headers: user2Headers
    });
    recordTest(
      'GET /api/trips/:id allows active group member to access private itinerary (200)',
      memberReadPrivateRes.status === 200 && memberReadPrivateRes.data.data?.id === privateTripId && memberReadPrivateRes.data.data?.is_group_member === true
    );

    // Member can like the private trip
    const memberLikeRes = await request(`/trips/${privateTripId}/like`, {
      method: 'POST',
      headers: user2Headers
    });
    recordTest(
      'Active group member can like private group trip (200)',
      memberLikeRes.status === 200 && memberLikeRes.data.data?.liked === true
    );

    // Member can comment on the private trip
    const memberCommentRes = await request(`/trips/${privateTripId}/comments`, {
      method: 'POST',
      headers: user2Headers,
      body: { content: 'Excited for this alpine expedition!' }
    });
    recordTest(
      'Active group member can comment on private group trip (201)',
      memberCommentRes.status === 201
    );

    // Outsider (Late User) still receives 404 on reading private trip
    const stillOutsiderRes = await request(`/trips/${privateTripId}`, {
      headers: lateUserHeaders
    });
    recordTest(
      'Outsider still receives uniform 404 on private trip',
      stillOutsiderRes.status === 404
    );

    // -----------------------------------------------------------------
    // 12. Member Removal & Voluntary Leaving
    // -----------------------------------------------------------------
    console.log('\n[11. Member Removal & Voluntary Leaving]');

    // Owner cannot be removed by anyone (400)
    const removeOwnerRes = await request(`/trips/1/group/members/1`, {
      method: 'DELETE',
      headers: user1Headers
    });
    recordTest(
      'DELETE member rejects removing the group owner with 400 Bad Request',
      removeOwnerRes.status === 400 && removeOwnerRes.data.error?.includes('owner cannot')
    );

    // User 2 voluntarily leaves group on Trip 1
    const user2LeaveRes = await request(`/trips/1/group/members/${user2.id}`, {
      method: 'DELETE',
      headers: user2Headers
    });
    recordTest(
      'Member can voluntarily leave the group (200)',
      user2LeaveRes.status === 200
    );

    // User 2 cannot access group details anymore (403)
    const user2CheckGroupRes = await request('/trips/1/group', {
      headers: user2Headers
    });
    recordTest(
      'Former member is rejected with 403 Forbidden after leaving',
      user2CheckGroupRes.status === 403
    );

    // Owner removes User 3 from Trip 1 group
    const ownerRemoveUser3Res = await request(`/trips/1/group/members/${user3.id}`, {
      method: 'DELETE',
      headers: user1Headers
    });
    recordTest(
      'Owner can successfully remove another member from the group (200)',
      ownerRemoveUser3Res.status === 200
    );

    // -----------------------------------------------------------------
    // 13. Rate Limiting Protection on Join Endpoint
    // -----------------------------------------------------------------
    console.log('\n[12. Brute-Force Rate Limiting]');

    clearRateLimits();
    // Simulate failed join attempts up to MAX_FAILED_ATTEMPTS
    for (let i = 0; i < MAX_FAILED_ATTEMPTS; i++) {
      await request('/groups/join', {
        method: 'POST',
        headers: user4Headers,
        body: { code: 'ROAM-FAKE' }
      });
    }

    // Attempt 11 must be rate limited (429)
    const rateLimitedRes = await request('/groups/join', {
      method: 'POST',
      headers: user4Headers,
      body: { code: 'ROAM-FAKE' }
    });

    recordTest(
      'POST /api/groups/join enforces rate limiting after repeated failures (429 Too Many Requests)',
      rateLimitedRes.status === 429 && rateLimitedRes.data.error?.includes('Too many')
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

runGroupTestSuite().catch(err => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
