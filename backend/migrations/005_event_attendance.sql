CREATE TABLE IF NOT EXISTS event_attendees (
  content_id UUID NOT NULL REFERENCES tribe_events(content_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (content_id, user_id)
);
CREATE INDEX IF NOT EXISTS event_attendees_user_idx
  ON event_attendees (user_id, content_id);
