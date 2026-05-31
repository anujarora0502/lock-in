-- Supabase Database Schema for Lock In

CREATE TABLE lock_in_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#111827' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (user_id, name)
);

CREATE TABLE lock_in_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type_id UUID REFERENCES lock_in_types(id) ON DELETE SET NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
  note TEXT DEFAULT '' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX lock_in_sessions_user_started_idx
  ON lock_in_sessions (user_id, started_at DESC);

CREATE INDEX lock_in_sessions_user_type_started_idx
  ON lock_in_sessions (user_id, type_id, started_at DESC);

ALTER TABLE lock_in_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE lock_in_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own lock in types." ON lock_in_types
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own lock in types." ON lock_in_types
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lock in types." ON lock_in_types
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lock in types." ON lock_in_types
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own lock in sessions." ON lock_in_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own lock in sessions." ON lock_in_sessions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND (
      type_id IS NULL OR EXISTS (
        SELECT 1 FROM lock_in_types
        WHERE lock_in_types.id = lock_in_sessions.type_id
          AND lock_in_types.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update their own lock in sessions." ON lock_in_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lock in sessions." ON lock_in_sessions
  FOR DELETE USING (auth.uid() = user_id);
