CREATE TABLE IF NOT EXISTS event_waitlist (
  content_id UUID NOT NULL REFERENCES tribe_events(content_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (content_id, user_id)
);
CREATE INDEX IF NOT EXISTS event_waitlist_order_idx
  ON event_waitlist (content_id, created_at ASC, user_id ASC);
