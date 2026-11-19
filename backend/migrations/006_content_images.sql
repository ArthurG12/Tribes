CREATE TABLE IF NOT EXISTS content_images (
  content_id UUID PRIMARY KEY REFERENCES feed_items(id) ON DELETE CASCADE,
  mime_type TEXT NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
  image_data BYTEA NOT NULL,
  byte_size INTEGER NOT NULL CHECK (byte_size BETWEEN 1 AND 5242880),
  CHECK (octet_length(image_data) = byte_size)
);
