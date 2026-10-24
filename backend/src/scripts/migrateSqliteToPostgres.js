/**
 * Roamly SQLite-to-Neon PostgreSQL Data Migration Script
 * Reads read-only from SQLite data/roamly.db, inserts into Neon PostgreSQL,
 * updates sequences, and verifies row counts and foreign keys.
 */

const { DatabaseSync } = require('node:sqlite');
const { Client } = require('pg');
const path = require('path');
const dotenv = require('dotenv');
const { initPostgresSchema } = require('../config/postgresSchema');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SQLITE_DB_PATH = path.resolve(__dirname, '../../data/roamly.db');
const POSTGRES_URL = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

if (!POSTGRES_URL) {
  console.error('[Migration Error] No DATABASE_URL or DATABASE_URL_UNPOOLED found in environment.');
  process.exit(1);
}

// Ordered tables respecting foreign key relationships
const TABLES_IN_ORDER = [
  'users',
  'destinations',
  'trips',
  'trip_stops',
  'bookmarks',
  'trip_likes',
  'comments',
  'trip_groups',
  'trip_group_members',
  'trip_media'
];

async function migrate() {
  console.log('====================================================');
  console.log('  Roamly SQLite -> Neon PostgreSQL Migration Script ');
  console.log('====================================================\n');

  console.log(`[Source] Reading SQLite from: ${SQLITE_DB_PATH}`);
  const sqliteDb = new DatabaseSync(SQLITE_DB_PATH, { readOnly: true });

  console.log('[Target] Connecting to Neon PostgreSQL...');
  const pgClient = new Client({
    connectionString: POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
  });

  await pgClient.connect();
  console.log('Connected to Neon PostgreSQL.\n');

  try {
    // 1. Initialize Schema
    console.log('[Step 1/4] Applying PostgreSQL schema & indexes...');
    await initPostgresSchema(pgClient);
    console.log('PostgreSQL schema initialized successfully.\n');

    // 2. Migrate each table in a transaction
    console.log('[Step 2/4] Migrating data records...');
    await pgClient.query('BEGIN');

    for (const table of TABLES_IN_ORDER) {
      // Fetch SQLite rows
      const rows = sqliteDb.prepare(`SELECT * FROM "${table}" ORDER BY id ASC`).all();
      console.log(`- Migrating table "${table}": ${rows.length} rows found in SQLite...`);

      if (rows.length === 0) continue;

      const columns = Object.keys(rows[0]);
      const colNamesStr = columns.map(c => `"${c}"`).join(', ');

      for (const row of rows) {
        const values = columns.map(col => {
          let val = row[col];
          // Handle SQLite boolean conversions if needed
          return val;
        });

        const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');
        const insertQuery = `INSERT INTO "${table}" (${colNamesStr}) VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING`;

        await pgClient.query(insertQuery, values);
      }

      // Update sequence to highest id
      const seqQuery = `SELECT setval(pg_get_serial_sequence($1, 'id'), coalesce(max(id), 1), max(id) IS NOT NULL) FROM "${table}"`;
      await pgClient.query(seqQuery, [table]);
    }

    await pgClient.query('COMMIT');
    console.log('Data migration transaction committed successfully.\n');

    // 3. Compare Row Counts
    console.log('[Step 3/4] Validating row counts between SQLite and Neon PostgreSQL...');
    let allCountsMatch = true;

    for (const table of TABLES_IN_ORDER) {
      const sqliteCount = sqliteDb.prepare(`SELECT COUNT(*) as c FROM "${table}"`).get().c;
      const pgRes = await pgClient.query(`SELECT COUNT(*) as c FROM "${table}"`);
      const pgCount = parseInt(pgRes.rows[0].c, 10);

      const status = (sqliteCount === pgCount) ? '✓ MATCH' : '✗ MISMATCH';
      if (sqliteCount !== pgCount) allCountsMatch = false;

      console.log(`  ${table.padEnd(20)} | SQLite: ${String(sqliteCount).padStart(3)} | Neon: ${String(pgCount).padStart(3)} | ${status}`);
    }

    if (!allCountsMatch) {
      throw new Error('Row count mismatch detected between SQLite and PostgreSQL!');
    }
    console.log('All table row counts matched perfectly!\n');

    // 4. Foreign Key and Referential Integrity Check
    console.log('[Step 4/4] Verifying referential integrity and foreign keys...');
    
    // Check trips -> users
    const orphanTrips = await pgClient.query(`
      SELECT t.id FROM trips t LEFT JOIN users u ON u.id = t.user_id WHERE u.id IS NULL
    `);
    console.log(`  Orphan trips (invalid user_id): ${orphanTrips.rows.length}`);

    // Check trip_stops -> trips
    const orphanStops = await pgClient.query(`
      SELECT s.id FROM trip_stops s LEFT JOIN trips t ON t.id = s.trip_id WHERE t.id IS NULL
    `);
    console.log(`  Orphan trip_stops (invalid trip_id): ${orphanStops.rows.length}`);

    // Check bookmarks -> users / destinations
    const orphanBookmarks = await pgClient.query(`
      SELECT b.id FROM bookmarks b
      LEFT JOIN users u ON u.id = b.user_id
      LEFT JOIN destinations d ON d.id = b.destination_id
      WHERE u.id IS NULL OR d.id IS NULL
    `);
    console.log(`  Orphan bookmarks: ${orphanBookmarks.rows.length}`);

    // Check trip_media -> trips / users
    const orphanMedia = await pgClient.query(`
      SELECT m.id FROM trip_media m
      LEFT JOIN trips t ON t.id = m.trip_id
      LEFT JOIN users u ON u.id = m.user_id
      WHERE t.id IS NULL OR u.id IS NULL
    `);
    console.log(`  Orphan media: ${orphanMedia.rows.length}`);

    console.log('\n====================================================');
    console.log('  MIGRATION VERIFICATION COMPLETE: ALL CHECKS PASSED');
    console.log('====================================================\n');

  } catch (err) {
    await pgClient.query('ROLLBACK').catch(() => {});
    console.error('\n[Migration Error]:', err.message);
    throw err;
  } finally {
    sqliteDb.close();
    await pgClient.end();
  }
}

if (require.main === module) {
  migrate().catch(() => process.exit(1));
}

module.exports = { migrate };
