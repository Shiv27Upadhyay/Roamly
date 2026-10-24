/**
 * Roamly Dedicated USD-to-INR Currency Migration Script
 *
 * CONVERSION RATE DOCUMENTATION:
 * Fixed migration conversion rate: 1 USD = 95 INR.
 * NOTE: This rate (₹95 = $1) is explicitly documented as a chosen fixed conversion rate
 * for this application migration to establish realistic travel purchasing power in INR,
 * and is not an asserted live quote or official RBI reference rate.
 *
 * SAFETY & IDEMPOTENCE GUARANTEES:
 * 1. Persistent Marker: Records completion in `schema_migrations` table.
 * 2. Strict Filter: Targets only verified records where `currency = 'USD'`.
 * 3. Transactional: Runs inside an atomic transaction with automatic rollback on error.
 * 4. Dry-Run Mode: Preview before/after totals without modifying database.
 * 5. Data Integrity: Preserves user_id, destination_id, visibility, share_token,
 *    group memberships, invite codes, and zero-cost stops ($0 -> ₹0).
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { getDb, withTransaction, isPostgres, closeDb } = require('../config/db');

const CONVERSION_RATE = 95;
const MIGRATION_ID = 'migrate_usd_to_inr_v1';

/**
 * Ensures schema_migrations tracking table exists.
 */
async function ensureMigrationTable(db) {
  if (isPostgres()) {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        details JSONB
      );
    `).run();
  } else {
    db.prepare(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id TEXT PRIMARY KEY,
        applied_at TEXT NOT NULL DEFAULT (datetime('now')),
        details TEXT
      );
    `).run();
  }
}

/**
 * Checks whether this migration has already been executed.
 */
async function isMigrationApplied(db) {
  await ensureMigrationTable(db);
  const row = await db.prepare('SELECT id, applied_at FROM schema_migrations WHERE id = ?').get(MIGRATION_ID);
  return row || null;
}

/**
 * Executes the migration or runs a dry-run preview.
 *
 * @param {Object} options
 * @param {boolean} [options.isDryRun=true] - If true, calculates and previews without writing
 * @param {Object} [options.dbInstance=null] - Optional database instance (for testing)
 * @returns {Promise<Object>} Migration summary
 */
async function runMigration({ isDryRun = true, dbInstance = null } = {}) {
  const db = dbInstance || getDb();

  console.log('=================================================================');
  console.log(`  ROAMLY USD -> INR MIGRATION ${isDryRun ? '(DRY RUN PREVIEW)' : '(PRODUCTION COMMIT)'}`);
  console.log(`  Fixed Conversion Rate: 1 USD = ${CONVERSION_RATE} INR (Documented chosen rate)`);
  console.log('=================================================================');

  // 1. Check persistent migration marker
  const existingMarker = await isMigrationApplied(db);
  if (existingMarker) {
    const msg = `Migration '${MIGRATION_ID}' was already applied on ${existingMarker.applied_at}. Skipping to prevent double-conversion.`;
    console.log(`[IDEMPOTENCY GUARD] ${msg}`);
    return {
      status: 'SKIPPED_ALREADY_APPLIED',
      applied_at: existingMarker.applied_at,
      tripsConverted: 0,
      stopsConverted: 0
    };
  }

  // 2. Inspect all trips currently denominated in USD
  const usdTrips = await db.prepare(`
    SELECT id, title, currency, estimated_budget, visibility, user_id
    FROM trips
    WHERE currency = 'USD'
    ORDER BY id ASC
  `).all();

  // Inspect non-USD trips to confirm they are preserved
  const nonUsdTrips = await db.prepare(`
    SELECT id, title, currency, estimated_budget
    FROM trips
    WHERE currency != 'USD'
    ORDER BY id ASC
  `).all();

  if (usdTrips.length === 0) {
    console.log('No USD-denominated trips found in the database. Nothing to convert.');
    return {
      status: 'NO_USD_TRIPS_FOUND',
      tripsConverted: 0,
      stopsConverted: 0
    };
  }

  console.log(`Found ${usdTrips.length} USD trip(s) requiring conversion:`);
  if (nonUsdTrips.length > 0) {
    console.log(`[PRESERVATION] ${nonUsdTrips.length} non-USD trip(s) detected and will be left untouched:`);
    nonUsdTrips.forEach(t => console.log(`   - Trip #${t.id}: "${t.title}" (${t.currency})`));
  }

  // 3. Collect affected stops and calculate before/after totals
  const tripIds = usdTrips.map(t => t.id);
  const placeholders = tripIds.map(() => '?').join(', ');
  const usdStops = await db.prepare(`
    SELECT id, trip_id, day_number, place_name, category, cost
    FROM trip_stops
    WHERE trip_id IN (${placeholders})
    ORDER BY trip_id ASC, day_number ASC, sort_order ASC, id ASC
  `).all(...tripIds);

  const previewData = [];
  let totalUsdBudget = 0;
  let totalInrBudget = 0;
  let totalUsdStops = 0;
  let totalInrStops = 0;

  for (const trip of usdTrips) {
    const stopsForTrip = usdStops.filter(s => s.trip_id === trip.id);
    const originalBudget = Number(trip.estimated_budget) || 0;
    const convertedBudget = Math.round(originalBudget * CONVERSION_RATE);

    const stopsPreview = stopsForTrip.map(s => {
      const origCost = Number(s.cost) || 0;
      const convCost = Math.round(origCost * CONVERSION_RATE);
      return {
        id: s.id,
        place_name: s.place_name,
        originalCostUsd: origCost,
        convertedCostInr: convCost
      };
    });

    const tripOriginalStopsSum = stopsPreview.reduce((sum, s) => sum + s.originalCostUsd, 0);
    const tripConvertedStopsSum = stopsPreview.reduce((sum, s) => sum + s.convertedCostInr, 0);

    // Validate stops total equality: sum(s.cost * 95) === sum(s.cost) * 95
    const expectedStopsSum = tripOriginalStopsSum * CONVERSION_RATE;
    if (tripConvertedStopsSum !== expectedStopsSum) {
      throw new Error(`[VALIDATION ERROR] Stops cost sum mismatch for Trip #${trip.id}: calculated ${tripConvertedStopsSum} !== expected ${expectedStopsSum}`);
    }

    totalUsdBudget += originalBudget;
    totalInrBudget += convertedBudget;
    totalUsdStops += tripOriginalStopsSum;
    totalInrStops += tripConvertedStopsSum;

    previewData.push({
      tripId: trip.id,
      title: trip.title,
      originalBudgetUsd: originalBudget,
      convertedBudgetInr: convertedBudget,
      stopsCount: stopsPreview.length,
      originalStopsTotalUsd: tripOriginalStopsSum,
      convertedStopsTotalInr: tripConvertedStopsSum,
      stops: stopsPreview
    });

    console.log(`\n• Trip #${trip.id}: "${trip.title}"`);
    console.log(`   Budget: $${originalBudget.toLocaleString()} USD  -->  ₹${convertedBudget.toLocaleString('en-IN')} INR`);
    console.log(`   Stops Total (${stopsPreview.length} stops): $${tripOriginalStopsSum.toLocaleString()} USD  -->  ₹${tripConvertedStopsSum.toLocaleString('en-IN')} INR`);
    stopsPreview.forEach(s => {
      console.log(`      - [Stop #${s.id}] ${s.place_name}: $${s.originalCostUsd} -> ₹${s.convertedCostInr.toLocaleString('en-IN')}`);
    });
  }

  console.log('\n-----------------------------------------------------------------');
  console.log('SUMMARY OF TOTALS:');
  console.log(`   Total Budgets: $${totalUsdBudget.toLocaleString()} USD  -->  ₹${totalInrBudget.toLocaleString('en-IN')} INR`);
  console.log(`   Total Stops:   $${totalUsdStops.toLocaleString()} USD  -->  ₹${totalInrStops.toLocaleString('en-IN')} INR`);
  console.log(`   Affected Trips: ${usdTrips.length}`);
  console.log(`   Affected Stops: ${usdStops.length}`);
  console.log('-----------------------------------------------------------------');

  // 4. If Dry-Run, exit without executing any writes
  if (isDryRun) {
    console.log('\n[DRY RUN COMPLETE] Zero database writes executed.');
    console.log('To apply these changes permanently, run with --commit.');
    return {
      status: 'DRY_RUN_SUCCESS',
      rate: CONVERSION_RATE,
      tripsCount: usdTrips.length,
      stopsCount: usdStops.length,
      totalUsdBudget,
      totalInrBudget,
      totalUsdStops,
      totalInrStops,
      preview: previewData
    };
  }

  // 5. Execute Migration in Transaction
  console.log('\n[COMMITTING] Executing transactional migration...');

  await withTransaction(async (txDb) => {
    // 5a. Convert stop costs for USD trips
    const updateStopsQuery = isPostgres()
      ? `
        UPDATE trip_stops ts
        SET cost = ROUND((ts.cost * ${CONVERSION_RATE})::numeric)
        FROM trips t
        WHERE ts.trip_id = t.id AND t.currency = 'USD'
      `
      : `
        UPDATE trip_stops
        SET cost = ROUND(cost * ${CONVERSION_RATE})
        WHERE trip_id IN (SELECT id FROM trips WHERE currency = 'USD')
      `;

    await txDb.prepare(updateStopsQuery).run();

    // 5b. Convert trips budget and change currency to INR
    const updateTripsQuery = isPostgres()
      ? `
        UPDATE trips
        SET estimated_budget = ROUND((estimated_budget * ${CONVERSION_RATE})::numeric),
            currency = 'INR'
        WHERE currency = 'USD'
      `
      : `
        UPDATE trips
        SET estimated_budget = ROUND(estimated_budget * ${CONVERSION_RATE}),
            currency = 'INR'
        WHERE currency = 'USD'
      `;

    await txDb.prepare(updateTripsQuery).run();

    // 5c. Record persistent migration marker
    const details = JSON.stringify({
      migration: MIGRATION_ID,
      conversion_rate: CONVERSION_RATE,
      trips_converted: usdTrips.length,
      stops_converted: usdStops.length,
      total_inr_budget: totalInrBudget,
      applied_at: new Date().toISOString()
    });

    await txDb.prepare(`
      INSERT INTO schema_migrations (id, details)
      VALUES (?, ?)
    `).run(MIGRATION_ID, details);
  });

  console.log('[SUCCESS] Migration committed successfully and recorded in schema_migrations.');

  return {
    status: 'COMMITTED',
    rate: CONVERSION_RATE,
    tripsConverted: usdTrips.length,
    stopsConverted: usdStops.length,
    totalInrBudget,
    totalInrStops
  };
}

// Allow direct CLI execution
if (require.main === module) {
  const isCommit = process.argv.includes('--commit') || process.env.COMMIT_MIGRATION === 'true';
  runMigration({ isDryRun: !isCommit })
    .then(async (result) => {
      await closeDb();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('\n[FATAL] Migration aborted due to error:', err);
      try { await closeDb(); } catch {}
      process.exit(1);
    });
}

module.exports = {
  CONVERSION_RATE,
  MIGRATION_ID,
  runMigration
};
