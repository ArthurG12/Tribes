CREATE TABLE IF NOT EXISTS email_queue (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('registration', 'password_reset')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'skipped')),
  attempts INTEGER NOT NULL DEFAULT 0,
  available_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at TIMESTAMPTZ,
  last_error TEXT
);

CREATE INDEX IF NOT EXISTS email_queue_pending_idx
  ON email_queue (available_at, created_at)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS email_queue_processing_idx
  ON email_queue (locked_at)
  WHERE status = 'processing';
CREATE INDEX IF NOT EXISTS email_queue_email_created_idx
  ON email_queue (kind, email, created_at DESC);

CREATE TABLE IF NOT EXISTS email_queue_state (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton = TRUE),
  paused_until TIMESTAMPTZ,
  pause_reason TEXT
);

INSERT INTO email_queue_state (singleton) VALUES (TRUE)
ON CONFLICT (singleton) DO NOTHING;
