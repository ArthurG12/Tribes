ALTER TABLE users
  ADD COLUMN IF NOT EXISTS profile_visibility JSONB NOT NULL
  DEFAULT '{"aboutMe":"public","city":"public","interests":"public"}'::jsonb;

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_profile_visibility_valid;

ALTER TABLE users
  ADD CONSTRAINT users_profile_visibility_valid
  CHECK (
    jsonb_typeof(profile_visibility) = 'object'
    AND profile_visibility ?& ARRAY['aboutMe', 'city', 'interests']
    AND profile_visibility->>'aboutMe' IN ('public', 'followers', 'private')
    AND profile_visibility->>'city' IN ('public', 'followers', 'private')
    AND profile_visibility->>'interests' IN ('public', 'followers', 'private')
  );
