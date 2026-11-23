ALTER TABLE feed_items DROP CONSTRAINT IF EXISTS feed_items_kind_check;

ALTER TABLE feed_items
  ADD CONSTRAINT feed_items_kind_check
  CHECK (kind IN ('post', 'event', 'poll'));
