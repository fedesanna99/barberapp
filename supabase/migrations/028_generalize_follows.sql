-- =============================================================
-- Task 3 — Gli utenti possono seguirsi tra loro
-- =============================================================
-- Generalizza `follows` da (follower_id, barber_id) a
-- (follower_id, followee_id), entrambi → profiles(id).
--
-- Backfill: per ogni riga esistente `followee_id` = `barbers.profile_id`
-- corrispondente. Poi droppa la vecchia colonna barber_id e PK.
--
-- Trigger `handle_follow_change` rinominato/aggiornato per mantenere
-- `barbers.followers_count` quando il followee è un profilo barbiere.
--
-- CHECK contro self-follow + nuova RLS per insert/delete (follower_id
-- deve essere auth.uid()).
-- =============================================================

-- 1) Aggiungi followee_id (FK profiles), nullable in fase di backfill
ALTER TABLE follows
  ADD COLUMN IF NOT EXISTS followee_id uuid REFERENCES profiles(id) ON DELETE CASCADE;

-- 2) Backfill
UPDATE follows f
SET followee_id = b.profile_id
FROM barbers b
WHERE f.barber_id = b.id
  AND f.followee_id IS NULL;

-- 3) Drop trigger vecchio (creato in 001) PRIMA di toccare barber_id
DROP TRIGGER IF EXISTS on_follow_change ON follows;

-- 4) Drop policy che referenziano barber_id
DROP POLICY IF EXISTS "follows_select" ON follows;
DROP POLICY IF EXISTS "follows_insert" ON follows;
DROP POLICY IF EXISTS "follows_delete" ON follows;

-- 5) Drop vecchia PK e indice su barber_id
ALTER TABLE follows DROP CONSTRAINT IF EXISTS follows_pkey;
DROP INDEX IF EXISTS follows_barber_id;

-- 6) Rendi followee_id NOT NULL e droppa barber_id
ALTER TABLE follows
  ALTER COLUMN followee_id SET NOT NULL;

ALTER TABLE follows
  DROP COLUMN IF EXISTS barber_id;

-- 7) Nuova PK + check anti self-follow
ALTER TABLE follows
  ADD PRIMARY KEY (follower_id, followee_id);

ALTER TABLE follows
  ADD CONSTRAINT follows_no_self CHECK (follower_id <> followee_id);

-- 8) Indici utili
CREATE INDEX IF NOT EXISTS follows_followee_id ON follows (followee_id);
CREATE INDEX IF NOT EXISTS follows_follower_id ON follows (follower_id);

-- 9) Trigger: mantieni barbers.followers_count quando il followee
--    è il profilo di un barbiere. Per i follow utente↔utente non c'è
--    contatore aggregato in tabella (count() on-demand).
CREATE OR REPLACE FUNCTION handle_follow_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE barbers
      SET followers_count = followers_count + 1
      WHERE profile_id = NEW.followee_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE barbers
      SET followers_count = GREATEST(followers_count - 1, 0)
      WHERE profile_id = OLD.followee_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER on_follow_change
  AFTER INSERT OR DELETE ON follows
  FOR EACH ROW EXECUTE PROCEDURE handle_follow_change();

-- 10) RLS rifatte
CREATE POLICY "follows_select" ON follows
  FOR SELECT USING (true);

CREATE POLICY "follows_insert" ON follows
  FOR INSERT WITH CHECK (
    follower_id = auth.uid()
    AND follower_id <> followee_id
  );

CREATE POLICY "follows_delete" ON follows
  FOR DELETE USING (follower_id = auth.uid());
