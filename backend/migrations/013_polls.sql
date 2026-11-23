CREATE TABLE IF NOT EXISTS poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES feed_items(id) ON DELETE CASCADE,
  position SMALLINT NOT NULL CHECK (position BETWEEN 0 AND 5),
  label VARCHAR(80) NOT NULL,
  UNIQUE (content_id, position),
  UNIQUE (id, content_id)
);
CREATE TABLE IF NOT EXISTS poll_votes (
  content_id UUID NOT NULL REFERENCES feed_items(id) ON DELETE CASCADE,
  option_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (content_id, user_id),
  FOREIGN KEY (option_id, content_id) REFERENCES poll_options(id, content_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS poll_votes_option_idx ON poll_votes (option_id);
