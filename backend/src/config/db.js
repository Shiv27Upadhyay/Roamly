/**
 * SQLite Database Connection Management using Node.js 24 native node:sqlite
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const { initSchema } = require('./schema');

let dbInstance = null;

function getDb(customPath = null) {
  if (dbInstance) {
    return dbInstance;
  }

  const defaultDbPath = process.env.DB_PATH 
    ? path.resolve(process.cwd(), process.env.DB_PATH)
    : path.join(__dirname, '../../data/roamly.db');

  const resolvedPath = customPath ? path.resolve(customPath) : defaultDbPath;

  // Ensure data directory exists
  const dir = path.dirname(resolvedPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  dbInstance = new DatabaseSync(resolvedPath);

  // Enforce foreign keys and enable WAL mode for durability & concurrency
  dbInstance.exec('PRAGMA foreign_keys = ON;');
  dbInstance.exec('PRAGMA journal_mode = WAL;');

  // Initialize schema
  initSchema(dbInstance);

  return dbInstance;
}

function withTransaction(fn) {
  const db = getDb();
  db.exec('BEGIN TRANSACTION');
  try {
    const result = fn(db);
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

function closeDb() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

module.exports = {
  getDb,
  withTransaction,
  closeDb
};
