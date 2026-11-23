ALTER TABLE notifications
  ALTER COLUMN content_id DROP NOT NULL,
  ALTER COLUMN tribe_id DROP NOT NULL;

ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('post_like', 'post_comment', 'event_created', 'event_attendance', 'follow'));

CREATE TABLE IF NOT EXISTS user_follows (
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followed_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (follower_id, followed_id),
  CHECK (follower_id <> followed_id)
);

CREATE INDEX IF NOT EXISTS user_follows_followed_idx
  ON user_follows (followed_id, created_at DESC);
