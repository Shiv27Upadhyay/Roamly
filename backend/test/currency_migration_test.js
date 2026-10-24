/**
 * Roamly Currency Migration & INR Multi-Currency Test Suite
 * Validates:
 * 1. Conversion of USD budgets and stops at exact 95 rate.
 * 2. Mathematical equality of stops totals before and after.
 * 3. Exact handling of zero-cost stops ($0 -> ₹0).
 * 4. Repeat execution idempotency (persistent marker prevents double-conversion).
 * 5. Transactional rollback on error.
 * 6. Preservation of non-USD currencies (EUR, GBP, etc.).
 * 7. Default currency for new trips is 'INR'.
 * 8. Explicit non-INR creation support.
 */

const path = require('path');
const fs = require('fs');

const TEST_DB_PATH = path.resolve(__dirname, '../data/test_currency_isolated.db');
process.env.NODE_ENV = 'test';
process.env.PORT = '5098';
process.env.JWT_SECRET = 'test_secret_for_currency_migration_test_suite_32chars';
process.env.DB_PATH = TEST_DB_PATH;
process.env.FORCE_SQLITE = 'true';

function cleanTestDb() {
  for (const suffix of ['', '-wal', '-shm']) {
    const target = TEST_DB_PATH + suffix;
    if (fs.existsSync(target)) {
      try {
        fs.unlinkSync(target);
      } catch {
        // ignore on Windows if locked briefly
      }
    }
  }
}
cleanTestDb();

const { getDb, closeDb, withTransaction } = require('../src/config/db');
const { runMigration, CONVERSION_RATE, MIGRATION_ID } = require('../src/scripts/migrateUsdToInr');
const { createTrip } = require('../src/controllers/tripController');

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

async function runCurrencyTestSuite() {
  console.log('======================================================');
  console.log('   ROAMLY USD-TO-INR CURRENCY TEST SUITE              ');
  console.log(`   (Conversion Rate: ₹${CONVERSION_RATE} = $1)        `);
  console.log('======================================================\n');

  let db = null;

  try {
    db = getDb();

    // Clean tables to ensure pristine state
    db.exec(`
      DELETE FROM comments;
      DELETE FROM trip_likes;
      DELETE FROM trip_stops;
      DELETE FROM trips;
      DELETE FROM destinations;
      DELETE FROM users;
      DROP TABLE IF EXISTS schema_migrations;
    `);

    // Insert mock user & destination with full required schema fields
    db.prepare("INSERT INTO users (id, name, username, email) VALUES (1, 'Elena Rostova', 'elena', 'elena@test.local')").run();
    db.prepare(`
      INSERT INTO destinations (id, title, country, continent, tagline, description, cover_image, season, budget_tier, tags)
      VALUES (1, 'Kyoto', 'Japan', 'Asia', 'Cultural capital of Japan', 'Ancient temples and shrines', 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e', 'Spring', '$$', 'culture,history')
    `).run();

    // Test Case 1: Seed a USD trip with mixed stops (including a zero-cost stop)
    db.prepare(`
      INSERT INTO trips (id, user_id, destination_id, title, start_date, end_date, currency, estimated_budget, visibility)
      VALUES (101, 1, 1, 'USD Test Itinerary', '2026-11-01', '2026-11-08', 'USD', 2000, 'public')
    `).run();

    db.prepare(`
      INSERT INTO trip_stops (id, trip_id, day_number, place_name, category, cost, sort_order)
      VALUES 
        (201, 101, 1, 'Tea Ceremony', 'Culture', 50, 1),
        (202, 101, 1, 'Kaiseki Dinner', 'Food', 150, 2),
        (203, 101, 2, 'Free Bamboo Grove Walk', 'Nature', 0, 1)
    `).run();

    // Test Case 2: Seed a non-USD trip (EUR) that should NOT be converted
    db.prepare(`
      INSERT INTO trips (id, user_id, destination_id, title, start_date, end_date, currency, estimated_budget, visibility)
      VALUES (102, 1, 1, 'European Trip', '2026-12-01', '2026-12-08', 'EUR', 1500, 'public')
    `).run();

    db.prepare(`
      INSERT INTO trip_stops (id, trip_id, day_number, place_name, category, cost, sort_order)
      VALUES (204, 102, 1, 'Museum Ticket', 'Culture', 25, 1)
    `).run();

    console.log('[1. Dry Run Verification]');
    const dryRunResult = await runMigration({ isDryRun: true, dbInstance: db });
    recordTest(
      'Dry-run returns status DRY_RUN_SUCCESS and detects exactly 1 USD trip',
      dryRunResult.status === 'DRY_RUN_SUCCESS' && dryRunResult.tripsCount === 1,
      `Status: ${dryRunResult.status}, USD Trips: ${dryRunResult.tripsCount}`
    );

    // Verify dry-run did not modify the database
    const preTrip = db.prepare('SELECT currency, estimated_budget FROM trips WHERE id = 101').get();
    recordTest(
      'Dry-run makes zero writes to the database (currency remains USD)',
      preTrip.currency === 'USD' && preTrip.estimated_budget === 2000,
      `Currency: ${preTrip.currency}, Budget: ${preTrip.estimated_budget}`
    );

    console.log('\n[2. Transactional Commit Verification]');
    const commitResult = await runMigration({ isDryRun: false, dbInstance: db });
    recordTest(
      'Commit returns COMMITTED with 1 trip and 3 stops converted',
      commitResult.status === 'COMMITTED' && commitResult.tripsConverted === 1 && commitResult.stopsConverted === 3,
      `Status: ${commitResult.status}, Converted: ${commitResult.tripsConverted} trips, ${commitResult.stopsConverted} stops`
    );

    // Check converted trip budget
    const postTrip = db.prepare('SELECT currency, estimated_budget FROM trips WHERE id = 101').get();
    const expectedBudget = 2000 * CONVERSION_RATE; // 2000 * 95 = 190,000
    recordTest(
      `USD trip budget converted at 95 rate: $2000 -> ₹${expectedBudget} and currency='INR'`,
      postTrip.currency === 'INR' && postTrip.estimated_budget === expectedBudget,
      `Budget: ${postTrip.estimated_budget}, Currency: ${postTrip.currency}`
    );

    // Check converted stops and zero-cost preservation
    const postStops = db.prepare('SELECT id, cost FROM trip_stops WHERE trip_id = 101 ORDER BY id ASC').all();
    const stop1Cost = postStops.find(s => s.id === 201).cost;
    const stop2Cost = postStops.find(s => s.id === 202).cost;
    const stop3Cost = postStops.find(s => s.id === 203).cost;

    recordTest(
      'Stop 1 converted accurately ($50 * 95 = ₹4750)',
      stop1Cost === 4750,
      `Cost: ₹${stop1Cost}`
    );
    recordTest(
      'Stop 2 converted accurately ($150 * 95 = ₹14250)',
      stop2Cost === 14250,
      `Cost: ₹${stop2Cost}`
    );
    recordTest(
      'Zero-cost stop preserved accurately ($0 * 95 = ₹0)',
      stop3Cost === 0,
      `Cost: ₹${stop3Cost}`
    );

    // Check mathematical equality of stops sum
    const sumConvertedStops = stop1Cost + stop2Cost + stop3Cost; // 4750 + 14250 + 0 = 19000
    const expectedSum = (50 + 150 + 0) * CONVERSION_RATE; // 200 * 95 = 19000
    recordTest(
      'Stops total matches exact mathematical product (₹19000 === 200 * 95)',
      sumConvertedStops === expectedSum,
      `Sum: ₹${sumConvertedStops}, Expected: ₹${expectedSum}`
    );

    console.log('\n[3. Preservation of Non-USD Currencies]');
    const eurTrip = db.prepare('SELECT currency, estimated_budget FROM trips WHERE id = 102').get();
    const eurStop = db.prepare('SELECT cost FROM trip_stops WHERE id = 204').get();
    recordTest(
      'EUR trip remains completely untouched (currency=EUR, budget=1500)',
      eurTrip.currency === 'EUR' && eurTrip.estimated_budget === 1500,
      `Currency: ${eurTrip.currency}, Budget: ${eurTrip.estimated_budget}`
    );
    recordTest(
      'EUR stop cost remains completely untouched (cost=25)',
      eurStop.cost === 25,
      `Cost: €${eurStop.cost}`
    );

    console.log('\n[4. Repeat Execution Idempotency]');
    const repeatResult = await runMigration({ isDryRun: false, dbInstance: db });
    recordTest(
      'Repeat migration execution returns SKIPPED_ALREADY_APPLIED via persistent marker',
      repeatResult.status === 'SKIPPED_ALREADY_APPLIED',
      `Status: ${repeatResult.status}`
    );

    // Verify amounts were not double-converted
    const tripAfterRepeat = db.prepare('SELECT currency, estimated_budget FROM trips WHERE id = 101').get();
    recordTest(
      'Values were NOT multiplied again after second run (budget remains ₹190,000)',
      tripAfterRepeat.estimated_budget === expectedBudget,
      `Budget: ₹${tripAfterRepeat.estimated_budget}`
    );

    console.log('\n[5. Transactional Rollback Simulation]');
    let rollbackCaught = false;
    try {
      await withTransaction(async (txDb) => {
        txDb.prepare("UPDATE trips SET estimated_budget = 999999 WHERE id = 101").run();
        throw new Error('Simulated failure during migration transaction');
      });
    } catch (err) {
      rollbackCaught = true;
    }
    const tripAfterRollback = db.prepare('SELECT estimated_budget FROM trips WHERE id = 101').get();
    recordTest(
      'Failed transaction rolled back completely; budget was not altered to 999999',
      rollbackCaught && tripAfterRollback.estimated_budget === expectedBudget,
      `Budget: ₹${tripAfterRollback.estimated_budget}`
    );

    console.log('\n[6. New-Trip Currency Defaults in Controller]');
    // Mock req/res for createTrip
    let createdTripData = null;
    const mockReq1 = {
      user: { id: 1 },
      body: {
        title: 'Default Currency Trip',
        destination_id: 1,
        start_date: '2026-11-10',
        end_date: '2026-11-15',
        estimated_budget: 75000
      },
      params: {},
      query: {},
      headers: {}
    };
    const mockRes1 = {
      status: () => mockRes1,
      json: (payload) => {
        createdTripData = payload.data;
      }
    };

    await createTrip(mockReq1, mockRes1, (err) => { if (err) throw err; });
    recordTest(
      "New trip created without currency payload defaults to currency='INR'",
      createdTripData && createdTripData.currency === 'INR',
      `Created Currency: ${createdTripData?.currency}`
    );

    // Create new trip with explicit non-INR currency (e.g. 'GBP')
    let gbpTripData = null;
    const mockReq2 = {
      user: { id: 1 },
      body: {
        title: 'London Calling',
        destination_id: 1,
        start_date: '2026-11-16',
        end_date: '2026-11-20',
        currency: 'GBP',
        estimated_budget: 1200
      },
      params: {},
      query: {},
      headers: {}
    };
    const mockRes2 = {
      status: () => mockRes2,
      json: (payload) => {
        gbpTripData = payload.data;
      }
    };

    await createTrip(mockReq2, mockRes2, (err) => { if (err) throw err; });
    recordTest(
      "New trip created with explicit currency='GBP' preserves GBP correctly",
      gbpTripData && gbpTripData.currency === 'GBP' && gbpTripData.estimated_budget === 1200,
      `Created Currency: ${gbpTripData?.currency}, Budget: ${gbpTripData?.estimated_budget}`
    );

  } finally {
    closeDb();
    cleanTestDb();
  }

  console.log('\n======================================================');
  console.log(`TEST RESULTS: ${results.passed}/${results.total} PASSED (${results.failed} FAILED)`);
  console.log('======================================================\n');

  if (results.failed > 0) {
    process.exit(1);
  }
}

runCurrencyTestSuite().catch((err) => {
  console.error('Test suite failed unexpectedly:', err);
  try {
    closeDb();
    cleanTestDb();
  } catch {}
  process.exit(1);
});
