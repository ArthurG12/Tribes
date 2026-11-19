CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name TEXT NOT NULL CHECK (char_length(display_name) BETWEEN 2 AND 80),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_sessions (
  token_hash CHAR(64) PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS user_sessions_expiry_idx ON user_sessions (expires_at);

CREATE TABLE IF NOT EXISTS tribes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 80),
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 2 AND 1000),
  category TEXT NOT NULL CHECK (char_length(category) BETWEEN 2 AND 60),
  format TEXT NOT NULL CHECK (format IN ('Presencial', 'Híbrido', 'Online')),
  city TEXT NOT NULL CHECK (char_length(city) BETWEEN 2 AND 100),
  neighborhood TEXT NOT NULL DEFAULT '',
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS tribes_created_at_idx ON tribes (created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS tribes_category_idx ON tribes (category);

CREATE TABLE IF NOT EXISTS tribe_memberships (
  tribe_id UUID NOT NULL REFERENCES tribes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'left')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  left_at TIMESTAMPTZ,
  PRIMARY KEY (tribe_id, user_id),
  CHECK ((status = 'active' AND left_at IS NULL) OR (status = 'left' AND left_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS tribe_memberships_user_status_idx
  ON tribe_memberships (user_id, status, tribe_id);

CREATE TABLE IF NOT EXISTS feed_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tribe_id UUID NOT NULL REFERENCES tribes(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id),
  kind TEXT NOT NULL CHECK (kind IN ('post', 'event')),
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  edited_at TIMESTAMPTZ,
  UNIQUE (id, kind)
);
CREATE INDEX IF NOT EXISTS feed_items_tribe_created_idx
  ON feed_items (tribe_id, created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS tribe_events (
  content_id UUID PRIMARY KEY REFERENCES feed_items(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 2 AND 120),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  location TEXT NOT NULL CHECK (char_length(location) BETWEEN 2 AND 240),
  cost TEXT NOT NULL DEFAULT '',
  max_attendees INTEGER CHECK (max_attendees IS NULL OR max_attendees BETWEEN 1 AND 10000),
  CHECK (ends_at IS NULL OR ends_at >= starts_at)
);

CREATE TABLE IF NOT EXISTS content_likes (
  content_id UUID NOT NULL REFERENCES feed_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (content_id, user_id)
);
CREATE INDEX IF NOT EXISTS content_likes_user_idx ON content_likes (user_id, content_id);

CREATE TABLE IF NOT EXISTS content_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES feed_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  edited_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS content_comments_content_created_idx
  ON content_comments (content_id, created_at ASC, id ASC);
