CREATE TABLE IF NOT EXISTS saved_content (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES feed_items(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, content_id)
);
CREATE INDEX IF NOT EXISTS saved_content_user_created_idx ON saved_content (user_id, created_at DESC);
