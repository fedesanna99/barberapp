-- =============================================================
-- Task 2 — Anche gli utenti pubblicano post pubblici nel feed
-- =============================================================
-- Generalizza `posts` da barber-only ad author = qualunque profilo.
-- Aggiunge `author_id`, backfilla dal profilo del barbiere proprietario,
-- rende `barber_id` nullable (i post utente non hanno barbiere).
--
-- Aggiorna RLS:
--   - posts_select: pubblico (invariato)
--   - posts_insert: author_id = auth.uid(); se barber_id è valorizzato
--     deve essere il proprio barbiere (per i barbieri)
--   - posts_update / posts_delete: solo l'autore (collegato al task 11)
--
-- Aggiorna anche `comments_delete` perché il path "owner del post può
-- cancellare i commenti" non può più passare per `barbers.profile_id`:
-- ora usa direttamente `posts.author_id`.
-- =============================================================

-- 1) Colonna author_id (nullable in fase di backfill, poi NOT NULL)
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES profiles(id) ON DELETE CASCADE;

-- 2) Backfill: per i post esistenti l'autore è il profilo del barbiere proprietario
UPDATE posts p
SET author_id = b.profile_id
FROM barbers b
WHERE p.barber_id = b.id
  AND p.author_id IS NULL;

-- 3) Vincoli: author_id NOT NULL, barber_id nullable
ALTER TABLE posts
  ALTER COLUMN author_id SET NOT NULL;

ALTER TABLE posts
  ALTER COLUMN barber_id DROP NOT NULL;

-- 4) Indice per query feed per autore
CREATE INDEX IF NOT EXISTS posts_author_id_created_at
  ON posts (author_id, created_at DESC);

-- 5) RLS aggiornate
DROP POLICY IF EXISTS "posts_insert" ON posts;
CREATE POLICY "posts_insert" ON posts
  FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND (
      barber_id IS NULL
      OR barber_id = (SELECT id FROM barbers WHERE profile_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "posts_update" ON posts;
CREATE POLICY "posts_update" ON posts
  FOR UPDATE
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "posts_delete" ON posts;
CREATE POLICY "posts_delete" ON posts
  FOR DELETE
  USING (author_id = auth.uid());

-- 6) comments_delete: post owner = author_id (non più join su barbers)
DROP POLICY IF EXISTS "comments_delete" ON comments;
CREATE POLICY "comments_delete" ON comments
  FOR DELETE USING (
    author_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM posts p
      WHERE p.id = comments.post_id
        AND p.author_id = auth.uid()
    )
  );
