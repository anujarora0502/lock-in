-- Supabase Database Schema for Lock In
-- Single-user setup with no login. Run this in the Supabase SQL editor.

CREATE TABLE IF NOT EXISTS lock_in_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#111827' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS lock_in_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type_id UUID REFERENCES lock_in_types(id) ON DELETE SET NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
  note TEXT DEFAULT '' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- If you previously ran the auth-based schema, this removes the user dependency.
DROP POLICY IF EXISTS "Users can view their own lock in types." ON lock_in_types;
DROP POLICY IF EXISTS "Users can insert their own lock in types." ON lock_in_types;
DROP POLICY IF EXISTS "Users can update their own lock in types." ON lock_in_types;
DROP POLICY IF EXISTS "Users can delete their own lock in types." ON lock_in_types;
DROP POLICY IF EXISTS "Users can view their own lock in sessions." ON lock_in_sessions;
DROP POLICY IF EXISTS "Users can insert their own lock in sessions." ON lock_in_sessions;
DROP POLICY IF EXISTS "Users can update their own lock in sessions." ON lock_in_sessions;
DROP POLICY IF EXISTS "Users can delete their own lock in sessions." ON lock_in_sessions;

ALTER TABLE lock_in_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE lock_in_sessions DISABLE ROW LEVEL SECURITY;

DROP INDEX IF EXISTS lock_in_sessions_user_started_idx;
DROP INDEX IF EXISTS lock_in_sessions_user_type_started_idx;
ALTER TABLE lock_in_types DROP CONSTRAINT IF EXISTS lock_in_types_user_id_name_key;
ALTER TABLE lock_in_types DROP CONSTRAINT IF EXISTS lock_in_types_user_id_fkey;
ALTER TABLE lock_in_sessions DROP CONSTRAINT IF EXISTS lock_in_sessions_user_id_fkey;
ALTER TABLE lock_in_sessions DROP COLUMN IF EXISTS user_id;
ALTER TABLE lock_in_types DROP COLUMN IF EXISTS user_id;

CREATE UNIQUE INDEX IF NOT EXISTS lock_in_types_name_unique_idx
  ON lock_in_types (lower(name));

CREATE INDEX IF NOT EXISTS lock_in_sessions_started_idx
  ON lock_in_sessions (started_at DESC);

CREATE INDEX IF NOT EXISTS lock_in_sessions_type_started_idx
  ON lock_in_sessions (type_id, started_at DESC);

GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON lock_in_types TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON lock_in_sessions TO anon;
