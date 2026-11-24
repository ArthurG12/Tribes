ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS users_last_seen_at_idx ON users (last_seen_at DESC)
  WHERE last_seen_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS analytics_metadata (
  id SMALLINT PRIMARY KEY CHECK (id = 1),
  baseline_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO analytics_metadata (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS analytics_sessions (
  session_hash CHAR(64) PRIMARY KEY,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ NOT NULL,
  registered_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  registered_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS analytics_sessions_first_seen_idx
  ON analytics_sessions (first_seen_at DESC);
CREATE INDEX IF NOT EXISTS analytics_sessions_expiry_idx
  ON analytics_sessions (expires_at);

CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGSERIAL PRIMARY KEY,
  session_hash CHAR(64) NOT NULL REFERENCES analytics_sessions(session_hash) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_key TEXT NOT NULL CHECK (event_key IN (
    'page_view',
    'hero_cta_click',
    'explorer_interaction',
    'registration_start',
    'registration_complete'
  )),
  page_path TEXT NOT NULL DEFAULT '',
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS analytics_events_created_key_idx
  ON analytics_events (created_at DESC, event_key);
CREATE INDEX IF NOT EXISTS analytics_events_session_key_idx
  ON analytics_events (session_hash, event_key);
CREATE INDEX IF NOT EXISTS analytics_events_category_idx
  ON analytics_events (category, created_at DESC)
  WHERE category IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS analytics_events_unique_session_signal_idx
  ON analytics_events (session_hash, event_key, page_path, COALESCE(category, ''));
