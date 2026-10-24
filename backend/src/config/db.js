/**
 * Roamly Hybrid Database Connection Management
 * Supports Neon PostgreSQL via `pg.Pool` when DATABASE_URL is configured,
 * with seamless fallback to SQLite `node:sqlite` for isolated offline test environments.
 */

const path = require('path');
const fs = require('fs');

let pgPool = null;
let sqliteInstance = null;

function isPostgres() {
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.DATABASE_URL) {
      throw new Error('[Roamly Database Config] FATAL: DATABASE_URL is required in production environment.');
    }
    return true;
  }
  if (process.env.FORCE_SQLITE === 'true') return false;
  if (!process.env.DATABASE_URL) return false;
  // If running in test mode with an isolated test SQLite db (e.g. test_auth_isolated.db)
  if (process.env.DB_PATH && process.env.DB_PATH.includes('test_')) return false;
  return true;
}

/**
 * Translates SQLite-flavored SQL queries to PostgreSQL-compatible SQL.
 * 1. Replaces `?` parameter markers with `$1, $2, ...` (skipping quoted string literals).
 * 2. Replaces `datetime('now')` with `CURRENT_TIMESTAMP`.
 * 3. Replaces `LIKE` with `ILIKE` for case-insensitive text search.
 */
function translateSqlForPostgres(sql) {
  let paramIndex = 1;
  let inString = false;
  let converted = '';

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    if (char === "'") {
      inString = !inString;
      converted += char;
    } else if (char === '?' && !inString) {
      converted += `$${paramIndex++}`;
    } else {
      converted += char;
    }
  }

  // Replace SQLite datetime('now') with PostgreSQL CURRENT_TIMESTAMP
  converted = converted.replace(/datetime\('now'\)/gi, 'CURRENT_TIMESTAMP');

  // Convert LIKE to ILIKE for case-insensitive matching
  converted = converted.replace(/\bLIKE\b/gi, 'ILIKE');

  return converted;
}

/**
 * Wraps a PostgreSQL Pool or Client to provide a unified `prepare` interface
 * compatible with existing SQLite query call sites (`stmt.all()`, `stmt.get()`, `stmt.run()`).
 */
function createPgWrapper(clientOrPool) {
  return {
    isPostgres: true,
    prepare(sql) {
      const isInsert = /^\s*INSERT\s+INTO/i.test(sql);
      let translated = translateSqlForPostgres(sql);
      if (isInsert && !/RETURNING/i.test(translated)) {
        translated += ' RETURNING id';
      }

      return {
        async all(...params) {
          const flat = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
          const res = await clientOrPool.query(translated, flat);
          return res.rows;
        },
        async get(...params) {
          const flat = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
          const res = await clientOrPool.query(translated, flat);
          return res.rows[0] || null;
        },
        async run(...params) {
          const flat = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
          const res = await clientOrPool.query(translated, flat);
          return {
            lastInsertRowid: res.rows[0]?.id ? Number(res.rows[0].id) : null,
            changes: res.rowCount
          };
        }
      };
    },
    async exec(sql) {
      await clientOrPool.query(sql);
    },
    async query(sql, params = []) {
      const translated = translateSqlForPostgres(sql);
      return clientOrPool.query(translated, params);
    }
  };
}

function getDb(customPath = null) {
  if (isPostgres()) {
    if (!pgPool) {
      const { Pool } = require('pg');
      pgPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        max: parseInt(process.env.PG_POOL_MAX || '10', 10),
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000
      });

      pgPool.on('error', (err) => {
        console.error('[Neon PostgreSQL Pool Error]:', err.message);
      });
    }
    return createPgWrapper(pgPool);
  }

  // SQLite fallback mode (for offline tests & when DATABASE_URL is unset)
  if (sqliteInstance) {
    return sqliteInstance;
  }

  const { DatabaseSync } = require('node:sqlite');
  const { initSchema } = require('./schema');

  const defaultDbPath = process.env.DB_PATH
    ? path.resolve(process.cwd(), process.env.DB_PATH)
    : path.join(__dirname, '../../data/roamly.db');

  const resolvedPath = customPath ? path.resolve(customPath) : defaultDbPath;

  const dir = path.dirname(resolvedPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  sqliteInstance = new DatabaseSync(resolvedPath);
  sqliteInstance.exec('PRAGMA foreign_keys = ON;');
  sqliteInstance.exec('PRAGMA journal_mode = WAL;');

  initSchema(sqliteInstance);
  return sqliteInstance;
}

function withTransaction(fn) {
  if (isPostgres()) {
    return (async () => {
      if (!pgPool) {
        getDb();
      }
      const client = await pgPool.connect();
      try {
        await client.query('BEGIN');
        const txDb = createPgWrapper(client);
        const result = await fn(txDb);
        await client.query('COMMIT');
        return result;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    })();
  }

  // SQLite transaction mode
  const db = getDb();
  db.exec('BEGIN TRANSACTION');
  try {
    const result = fn(db);
    if (result && typeof result.then === 'function') {
      return result
        .then((res) => {
          db.exec('COMMIT');
          return res;
        })
        .catch((err) => {
          db.exec('ROLLBACK');
          throw err;
        });
    }
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

async function closeDb() {
  if (pgPool) {
    await pgPool.end();
    pgPool = null;
  }
  if (sqliteInstance) {
    sqliteInstance.close();
    sqliteInstance = null;
  }
}

module.exports = {
  getDb,
  withTransaction,
  closeDb,
  isPostgres,
  translateSqlForPostgres
};
