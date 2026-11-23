CREATE TABLE IF NOT EXISTS tribe_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tribe_id UUID NOT NULL REFERENCES tribes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS tribe_messages_tribe_created_idx
  ON tribe_messages (tribe_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS tribe_messages_expiry_idx
  ON tribe_messages (created_at);
