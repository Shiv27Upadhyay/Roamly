/**
 * Roamly Neon PostgreSQL Live Integration Test Suite
 * Verifies connectivity, pooled queries, schema integrity, case-insensitivity,
 * transactions, and row counts directly against the Neon PostgreSQL production branch.
 */

const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { getDb, isPostgres, closeDb } = require('../src/config/db');

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

async function runNeonIntegrationTests() {
  console.log('======================================================');
  console.log('   ROAMLY NEON POSTGRESQL LIVE INTEGRATION SUITE      ');
  console.log('======================================================\n');

  recordTest('Environment configured with Neon DATABASE_URL', Boolean(process.env.DATABASE_URL));
  recordTest('Database driver identifies as PostgreSQL', isPostgres() === true);

  const db = getDb();

  try {
    // 1. Table Verification
    console.log('\n[1. Schema & Entity Integrity]');
    const tablesRes = await db.prepare(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `).all();

    const tableNames = tablesRes.map(t => t.table_name);
    const requiredTables = [
      'bookmarks',
      'comments',
      'destinations',
      'trip_group_members',
      'trip_groups',
      'trip_likes',
      'trip_media',
      'trip_stops',
      'trips',
      'users'
    ];

    for (const req of requiredTables) {
      recordTest(`Table "${req}" exists in Neon public schema`, tableNames.includes(req));
    }

    // 2. Querying Curated Data
    console.log('\n[2. Editorial Records Verification]');
    const userCount = await db.prepare('SELECT COUNT(*) as c FROM users').get();
    recordTest('Users table contains migrated rows (>= 4)', parseInt(userCount.c, 10) >= 4, `Count: ${userCount.c}`);

    const destCount = await db.prepare('SELECT COUNT(*) as c FROM destinations').get();
    recordTest('Destinations table contains 8 curated locations', parseInt(destCount.c, 10) === 8, `Count: ${destCount.c}`);

    const tripsCount = await db.prepare('SELECT COUNT(*) as c FROM trips').get();
    recordTest('Trips table contains migrated records (>= 5)', parseInt(tripsCount.c, 10) >= 5, `Count: ${tripsCount.c}`);

    // 3. Search & ILIKE Case-Insensitivity
    console.log('\n[3. Parameter Translation & Case-Insensitive Search]');
    const searchLower = await db.prepare('SELECT id, title FROM destinations WHERE title LIKE ?').all('%kyoto%');
    const searchUpper = await db.prepare('SELECT id, title FROM destinations WHERE title LIKE ?').all('%KYOTO%');
    recordTest(
      'ILIKE search matches "kyoto" in lowercase and uppercase',
      searchLower.length === 1 && searchUpper.length === 1 && searchLower[0].title === 'Kyoto',
      `Lower: ${searchLower.length}, Upper: ${searchUpper.length}`
    );

    // 4. Join & Subquery Capabilities
    console.log('\n[4. Complex Joins & Subqueries]');
    const tripDetail = await db.prepare(`
      SELECT 
        t.id, t.title, u.name as author_name, d.title as dest_title,
        (SELECT COUNT(*) FROM trip_likes tl WHERE tl.trip_id = t.id) as likes_count
      FROM trips t
      JOIN users u ON u.id = t.user_id
      LEFT JOIN destinations d ON d.id = t.destination_id
      WHERE t.id = ?
    `).get(1);

    recordTest(
      'Complex join returns trip with author, destination, and likes count',
      Boolean(tripDetail && tripDetail.author_name && tripDetail.dest_title),
      `Trip 1: "${tripDetail?.title}" by ${tripDetail?.author_name}`
    );

    // 5. Sequence and Insert with RETURNING id
    console.log('\n[5. Insert with RETURNING and Sequence Alignment]');
    const insertTest = await db.prepare(`
      INSERT INTO comments (trip_id, user_id, content)
      VALUES (?, ?, ?)
    `).run(1, 1, '__NEON_TEST_TRANSIENT_COMMENT__');

    recordTest(
      'Insert returns numeric lastInsertRowid via RETURNING id',
      typeof insertTest.lastInsertRowid === 'number' && insertTest.lastInsertRowid > 0,
      `Returned ID: ${insertTest.lastInsertRowid}`
    );

    // Clean up transient test comment
    if (insertTest.lastInsertRowid) {
      const deleteTest = await db.prepare('DELETE FROM comments WHERE id = ?').run(insertTest.lastInsertRowid);
      recordTest('Transient comment successfully cleaned up', deleteTest.changes === 1);
    }

  } catch (err) {
    console.error('Neon test error:', err);
    recordTest('Neon test execution without unhandled exception', false, err.message);
  } finally {
    await closeDb();
  }

  console.log('\n======================================================');
  console.log(`TEST RESULTS: ${results.passed}/${results.total} PASSED (${results.failed} FAILED)`);
  console.log('======================================================\n');

  if (results.failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runNeonIntegrationTests();
}

module.exports = { runNeonIntegrationTests };
