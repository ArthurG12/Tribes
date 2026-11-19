CREATE INDEX IF NOT EXISTS feed_items_created_idx
  ON feed_items (created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS tribe_memberships_active_user_tribe_idx
  ON tribe_memberships (user_id, tribe_id) WHERE status = 'active';
