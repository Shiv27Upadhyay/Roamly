/**
 * Roamly PostgreSQL Schema for Neon
 * Translates the 10 core entities, constraints, and indexes to PostgreSQL 18.
 */

const POSTGRES_SCHEMA_SQL = `
-- 1. USERS
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  home_city TEXT,
  google_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. DESTINATIONS
CREATE TABLE IF NOT EXISTS destinations (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  country TEXT NOT NULL,
  continent TEXT NOT NULL,
  tagline TEXT NOT NULL,
  description TEXT NOT NULL,
  cover_image TEXT NOT NULL,
  season TEXT NOT NULL,
  budget_tier TEXT NOT NULL CHECK (budget_tier IN ('$', '$$', '$$$')),
  tags TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. TRIPS
CREATE TABLE IF NOT EXISTS trips (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  destination_id INTEGER REFERENCES destinations(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  estimated_budget DOUBLE PRECISION NOT NULL DEFAULT 0,
  cover_image TEXT,
  notes TEXT,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'unlisted', 'private')),
  share_token TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. TRIP STOPS / ITINERARY ITEMS
CREATE TABLE IF NOT EXISTS trip_stops (
  id SERIAL PRIMARY KEY,
  trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL DEFAULT 1,
  place_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Stay', 'Food', 'Culture', 'Nature', 'Activity', 'Transit')),
  cost DOUBLE PRECISION NOT NULL DEFAULT 0,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. BOOKMARKS (Saved Destinations)
CREATE TABLE IF NOT EXISTS bookmarks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  destination_id INTEGER NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, destination_id)
);

-- 6. TRIP LIKES
CREATE TABLE IF NOT EXISTS trip_likes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, trip_id)
);

-- 7. COMMENTS
CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY,
  trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. TRIP GROUPS
CREATE TABLE IF NOT EXISTS trip_groups (
  id SERIAL PRIMARY KEY,
  trip_id INTEGER UNIQUE NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  invite_token TEXT UNIQUE NOT NULL,
  invite_status TEXT NOT NULL DEFAULT 'active' CHECK (invite_status IN ('active', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 9. TRIP GROUP MEMBERS
CREATE TABLE IF NOT EXISTS trip_group_members (
  id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL REFERENCES trip_groups(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'editor', 'member')),
  joined_via TEXT NOT NULL DEFAULT 'owner' CHECK (joined_via IN ('owner', 'invite_code', 'invite_link', 'qr_code')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(group_id, user_id)
);

-- 10. TRIP MEDIA
CREATE TABLE IF NOT EXISTS trip_media (
  id SERIAL PRIMARY KEY,
  trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('photo', 'video')),
  public_id TEXT UNIQUE NOT NULL,
  secure_url TEXT NOT NULL,
  thumbnail_url TEXT,
  format TEXT NOT NULL,
  bytes BIGINT NOT NULL,
  width INTEGER,
  height INTEGER,
  duration DOUBLE PRECISION,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
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
CREATE INDEX IF NOT EXISTS idx_trip_media_trip_id ON trip_media(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_media_type ON trip_media(media_type);
CREATE INDEX IF NOT EXISTS idx_trip_media_user_id ON trip_media(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_trip_media_public_id ON trip_media(public_id);
CREATE INDEX IF NOT EXISTS idx_trip_media_trip_type ON trip_media(trip_id, media_type, created_at DESC);
`;

async function initPostgresSchema(client) {
  await client.query(POSTGRES_SCHEMA_SQL);
}

module.exports = {
  POSTGRES_SCHEMA_SQL,
  initPostgresSchema
};
