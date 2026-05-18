-- =============================================================
-- Task 13 — Tag di 1 profilo nei post
-- =============================================================
-- Un post può taggare al massimo 1 profilo (vincolo "1 per post").
-- Quando il profilo taggato viene eliminato il campo diventa null
-- (non vogliamo cancellare il post, solo il riferimento).
-- =============================================================

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS tagged_profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- Index utile per "trova i post in cui sono taggato"
CREATE INDEX IF NOT EXISTS posts_tagged_profile_id ON posts (tagged_profile_id) WHERE tagged_profile_id IS NOT NULL;
