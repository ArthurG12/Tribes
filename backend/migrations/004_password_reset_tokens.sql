CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token_hash CHAR(64) PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS password_reset_tokens_user_created_idx
  ON password_reset_tokens (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS password_reset_tokens_expiry_idx
  ON password_reset_tokens (expires_at);
