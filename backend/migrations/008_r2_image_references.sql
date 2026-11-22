ALTER TABLE content_images
  ADD COLUMN IF NOT EXISTS image_key TEXT,
  ALTER COLUMN image_data DROP NOT NULL;

ALTER TABLE content_images
  DROP CONSTRAINT IF EXISTS content_images_check,
  ADD CONSTRAINT content_images_data_size_check
    CHECK (image_data IS NULL OR octet_length(image_data) = byte_size),
  ADD CONSTRAINT content_images_storage_check
    CHECK (image_data IS NOT NULL OR image_key IS NOT NULL),
  ADD CONSTRAINT content_images_image_key_check
    CHECK (image_key IS NULL OR length(image_key) > 0);

CREATE UNIQUE INDEX IF NOT EXISTS content_images_image_key_uidx
  ON content_images (image_key) WHERE image_key IS NOT NULL;

ALTER TABLE user_profile_images
  ADD COLUMN IF NOT EXISTS image_key TEXT,
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  ALTER COLUMN image_data DROP NOT NULL;

ALTER TABLE user_profile_images
  DROP CONSTRAINT IF EXISTS user_profile_images_check,
  ADD CONSTRAINT user_profile_images_data_size_check
    CHECK (image_data IS NULL OR octet_length(image_data) = byte_size),
  ADD CONSTRAINT user_profile_images_storage_check
    CHECK (image_data IS NOT NULL OR image_key IS NOT NULL OR is_deleted),
  ADD CONSTRAINT user_profile_images_image_key_check
    CHECK (image_key IS NULL OR length(image_key) > 0);

CREATE UNIQUE INDEX IF NOT EXISTS user_profile_images_image_key_uidx
  ON user_profile_images (image_key) WHERE image_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS user_profile_images_visible_idx
  ON user_profile_images (user_id) WHERE is_deleted = FALSE;
