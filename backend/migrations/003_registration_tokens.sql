CREATE TABLE IF NOT EXISTS registration_tokens (
  token_hash CHAR(64) PRIMARY KEY,
  email TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS registration_tokens_email_created_idx
  ON registration_tokens (email, created_at DESC);
CREATE INDEX IF NOT EXISTS registration_tokens_expiry_idx
  ON registration_tokens (expires_at);
