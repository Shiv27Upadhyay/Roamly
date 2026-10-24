/**
 * Roamly SQLite Database Schema
 * Defines the 7 core entities with foreign keys, uniqueness constraints, and indexes.
 */

const SCHEMA_SQL = `
-- Enforce Foreign Keys
PRAGMA foreign_keys = ON;

-- 1. USERS
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  home_city TEXT,
  google_id TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. DESTINATIONS
CREATE TABLE IF NOT EXISTS destinations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  country TEXT NOT NULL,
  continent TEXT NOT NULL,
  tagline TEXT NOT NULL,
  description TEXT NOT NULL,
  cover_image TEXT NOT NULL,
  season TEXT NOT NULL,
  budget_tier TEXT NOT NULL CHECK (budget_tier IN ('$', '$$', '$$$')),
  tags TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 3. TRIPS
CREATE TABLE IF NOT EXISTS trips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  destination_id INTEGER REFERENCES destinations(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  estimated_budget REAL NOT NULL DEFAULT 0,
  cover_image TEXT,
  notes TEXT,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'unlisted', 'private')),
  share_token TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 4. TRIP STOPS / ITINERARY ITEMS
CREATE TABLE IF NOT EXISTS trip_stops (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL DEFAULT 1,
  place_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Stay', 'Food', 'Culture', 'Nature', 'Activity', 'Transit')),
  cost REAL NOT NULL DEFAULT 0,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 5. BOOKMARKS (Saved Destinations)
CREATE TABLE IF NOT EXISTS bookmarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  destination_id INTEGER NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, destination_id)
);

-- 6. TRIP LIKES
CREATE TABLE IF NOT EXISTS trip_likes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, trip_id)
);

-- 7. COMMENTS
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 8. TRIP GROUPS (Group workspaces bound to a trip)
CREATE TABLE IF NOT EXISTS trip_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trip_id INTEGER UNIQUE NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  invite_token TEXT UNIQUE NOT NULL,
  invite_status TEXT NOT NULL DEFAULT 'active' CHECK (invite_status IN ('active', 'revoked')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 9. TRIP GROUP MEMBERS (Collaborators and participants)
CREATE TABLE IF NOT EXISTS trip_group_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL REFERENCES trip_groups(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'editor', 'member')),
  joined_via TEXT NOT NULL DEFAULT 'owner' CHECK (joined_via IN ('owner', 'invite_code', 'invite_link', 'qr_code')),
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(group_id, user_id)
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_destination_id ON trips(destination_id);
CREATE INDEX IF NOT EXISTS idx_trips_visibility ON trips(visibility);
CREATE UNIQUE INDEX IF NOT EXISTS idx_trips_share_token ON trips(share_token);
CREATE INDEX IF NOT EXISTS idx_trip_stops_trip_id ON trip_stops(trip_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_dest ON bookmarks(destination_id);
CREATE INDEX IF NOT EXISTS idx_trip_likes_trip ON trip_likes(trip_id);
CREATE INDEX IF NOT EXISTS idx_comments_trip ON comments(trip_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_trip_groups_trip_id ON trip_groups(trip_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_trip_groups_invite_code ON trip_groups(invite_code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_trip_groups_invite_token ON trip_groups(invite_token);
CREATE INDEX IF NOT EXISTS idx_trip_group_members_group_id ON trip_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_trip_group_members_user_id ON trip_group_members(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_trip_group_members_unique ON trip_group_members(group_id, user_id);

-- 10. TRIP MEDIA (Photos & Videos stored in Cloudinary)
CREATE TABLE IF NOT EXISTS trip_media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('photo', 'video')),
  public_id TEXT UNIQUE NOT NULL,
  secure_url TEXT NOT NULL,
  thumbnail_url TEXT,
  format TEXT NOT NULL,
  bytes INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  duration REAL,
  caption TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_trip_media_trip_id ON trip_media(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_media_type ON trip_media(media_type);
CREATE INDEX IF NOT EXISTS idx_trip_media_user_id ON trip_media(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_trip_media_public_id ON trip_media(public_id);
CREATE INDEX IF NOT EXISTS idx_trip_media_trip_type ON trip_media(trip_id, media_type, created_at DESC);
`;

/**
 * Idempotently applies incremental migrations without breaking existing data.
 */
function migrateSchema(db) {
  // 1. Users table migrations
  const userTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users';").all();
  if (userTables.length > 0) {
    const userColumns = db.prepare('PRAGMA table_info(users);').all();
    const hasGoogleId = userColumns.some(col => col.name === 'google_id');
    if (!hasGoogleId) {
      db.exec('ALTER TABLE users ADD COLUMN google_id TEXT;');
    }

    const userIndexes = db.prepare('PRAGMA index_list(users);').all();
    const hasGoogleIdIndex = userIndexes.some(idx => idx.name === 'idx_users_google_id');
    if (!hasGoogleIdIndex) {
      db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);');
    }
  }

  // 2. Trips table migrations
  const tripTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='trips';").all();
  if (tripTables.length > 0) {
    const tripColumns = db.prepare('PRAGMA table_info(trips);').all();
    const hasVisibility = tripColumns.some(col => col.name === 'visibility');
    if (!hasVisibility) {
      db.exec("ALTER TABLE trips ADD COLUMN visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'unlisted', 'private'));");
    }

    const hasShareToken = tripColumns.some(col => col.name === 'share_token');
    if (!hasShareToken) {
      db.exec('ALTER TABLE trips ADD COLUMN share_token TEXT;');
    }

    const tripIndexes = db.prepare('PRAGMA index_list(trips);').all();
    const hasShareTokenIndex = tripIndexes.some(idx => idx.name === 'idx_trips_share_token');
    if (!hasShareTokenIndex) {
      db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_trips_share_token ON trips(share_token);');
    }

    const hasVisibilityIndex = tripIndexes.some(idx => idx.name === 'idx_trips_visibility');
    if (!hasVisibilityIndex) {
      db.exec('CREATE INDEX IF NOT EXISTS idx_trips_visibility ON trips(visibility);');
    }
  }

  // 3. Trip groups and group members table migrations
  const tripGroupsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='trip_groups';").all();
  if (tripGroupsTable.length === 0) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS trip_groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trip_id INTEGER UNIQUE NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
        created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        invite_code TEXT UNIQUE NOT NULL,
        invite_token TEXT UNIQUE NOT NULL,
        invite_status TEXT NOT NULL DEFAULT 'active' CHECK (invite_status IN ('active', 'revoked')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_trip_groups_trip_id ON trip_groups(trip_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_trip_groups_invite_code ON trip_groups(invite_code);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_trip_groups_invite_token ON trip_groups(invite_token);
    `);
  }

  const tripGroupMembersTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='trip_group_members';").all();
  if (tripGroupMembersTable.length === 0) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS trip_group_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_id INTEGER NOT NULL REFERENCES trip_groups(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'editor', 'member')),
        joined_via TEXT NOT NULL DEFAULT 'owner' CHECK (joined_via IN ('owner', 'invite_code', 'invite_link', 'qr_code')),
        joined_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(group_id, user_id)
      );
      CREATE INDEX IF NOT EXISTS idx_trip_group_members_group_id ON trip_group_members(group_id);
      CREATE INDEX IF NOT EXISTS idx_trip_group_members_user_id ON trip_group_members(user_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_trip_group_members_unique ON trip_group_members(group_id, user_id);
    `);
  }

  // 4. Trip media table migrations
  const tripMediaTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='trip_media';").all();
  if (tripMediaTable.length === 0) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS trip_media (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        media_type TEXT NOT NULL CHECK (media_type IN ('photo', 'video')),
        public_id TEXT UNIQUE NOT NULL,
        secure_url TEXT NOT NULL,
        thumbnail_url TEXT,
        format TEXT NOT NULL,
        bytes INTEGER NOT NULL,
        width INTEGER,
        height INTEGER,
        duration REAL,
        caption TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_trip_media_trip_id ON trip_media(trip_id);
      CREATE INDEX IF NOT EXISTS idx_trip_media_type ON trip_media(media_type);
      CREATE INDEX IF NOT EXISTS idx_trip_media_user_id ON trip_media(user_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_trip_media_public_id ON trip_media(public_id);
      CREATE INDEX IF NOT EXISTS idx_trip_media_trip_type ON trip_media(trip_id, media_type, created_at DESC);
    `);
  }
}

function initSchema(db) {
  migrateSchema(db);
  db.exec(SCHEMA_SQL);
  migrateSchema(db);
}

module.exports = {
  SCHEMA_SQL,
  migrateSchema,
  initSchema
};
