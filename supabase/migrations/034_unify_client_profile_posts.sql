-- =============================================================
-- Unifica i post profilo cliente con il feed pubblico
-- =============================================================
-- I post dei clienti ora vivono in `posts` con:
--   author_id = profilo cliente
--   barber_id = null
--
-- Manteniamo `user_posts` per compatibilita' storica, ma copiamo i
-- contenuti esistenti in `posts` cosi' appaiono sia nel feed sia nel profilo.
-- =============================================================

INSERT INTO posts (
  author_id,
  barber_id,
  image_url,
  caption,
  label,
  likes_count,
  comments_count,
  tagged_profile_id,
  created_at
)
SELECT
  up.user_id,
  null,
  up.image_url,
  up.caption,
  up.label,
  up.likes_count,
  0,
  null,
  up.created_at
FROM user_posts up
WHERE NOT EXISTS (
  SELECT 1
  FROM posts p
  WHERE p.author_id = up.user_id
    AND p.barber_id IS NULL
    AND p.image_url = up.image_url
);
