DELETE FROM notifications WHERE type = 'follow';

ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('post_like', 'post_comment', 'event_created', 'event_attendance'));

UPDATE users
SET profile_visibility = jsonb_build_object(
  'aboutMe', CASE WHEN profile_visibility->>'aboutMe' = 'followers' THEN 'private' ELSE profile_visibility->>'aboutMe' END,
  'city', CASE WHEN profile_visibility->>'city' = 'followers' THEN 'private' ELSE profile_visibility->>'city' END,
  'interests', CASE WHEN profile_visibility->>'interests' = 'followers' THEN 'private' ELSE profile_visibility->>'interests' END
);

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_profile_visibility_valid;

ALTER TABLE users
  ADD CONSTRAINT users_profile_visibility_valid
  CHECK (
    jsonb_typeof(profile_visibility) = 'object'
    AND profile_visibility ?& ARRAY['aboutMe', 'city', 'interests']
    AND profile_visibility->>'aboutMe' IN ('public', 'private')
    AND profile_visibility->>'city' IN ('public', 'private')
    AND profile_visibility->>'interests' IN ('public', 'private')
  );

DROP TABLE IF EXISTS user_follows;
