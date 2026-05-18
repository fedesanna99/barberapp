-- =============================================================
-- Task 16/17/18 — Direct messages tra profili (utente ↔ barbiere)
-- =============================================================
-- conversations: 1 riga per coppia ordinata di partecipanti
--   (participant_a, participant_b) con participant_a < participant_b
--   per garantire unicità senza doppione (A,B) vs (B,A).
--
-- messages: riga per ogni messaggio; sender_id deve essere uno dei
--   due partecipanti.
--
-- Lazy-create (task 17): nessun trigger crea conversazioni automaticamente.
-- L'app crea la riga `conversations` SOLO quando l'utente invia il primo
-- messaggio (vedi useDirectMessages.openOrCreateConversation).
--
-- Reopen (task 18): un partecipante può rimettere `status='open'` quando
-- vuole. È buona pratica che il client lo faccia automaticamente prima di
-- inviare un nuovo messaggio se la conv è chiusa.
-- =============================================================

CREATE TABLE IF NOT EXISTS conversations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_a   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  participant_b   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status          text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT conv_ordered_participants  CHECK (participant_a < participant_b),
  CONSTRAINT conv_no_self                CHECK (participant_a <> participant_b),
  CONSTRAINT conv_unique_pair            UNIQUE (participant_a, participant_b)
);

CREATE INDEX IF NOT EXISTS conversations_a_idx ON conversations (participant_a, updated_at DESC);
CREATE INDEX IF NOT EXISTS conversations_b_idx ON conversations (participant_b, updated_at DESC);

CREATE TABLE IF NOT EXISTS direct_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body            text NOT NULL CHECK (char_length(trim(body)) > 0 AND char_length(body) <= 4000),
  read_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS direct_messages_conv_idx ON direct_messages (conversation_id, created_at);

-- Aggiorna conversations.updated_at quando arriva un nuovo messaggio
-- (così la lista può ordinare per attività recente).
CREATE OR REPLACE FUNCTION touch_dm_conversation_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE conversations SET updated_at = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS direct_messages_touch_conv ON direct_messages;
CREATE TRIGGER direct_messages_touch_conv
  AFTER INSERT ON direct_messages
  FOR EACH ROW EXECUTE FUNCTION touch_dm_conversation_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE conversations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages  ENABLE ROW LEVEL SECURITY;

-- conversations: solo i due partecipanti
CREATE POLICY "dm_conv_select" ON conversations
  FOR SELECT TO authenticated
  USING (
    auth.uid() = participant_a
    OR auth.uid() = participant_b
  );

CREATE POLICY "dm_conv_insert" ON conversations
  FOR INSERT TO authenticated
  WITH CHECK (
    (auth.uid() = participant_a OR auth.uid() = participant_b)
    AND participant_a <> participant_b
  );

-- Permette ai due partecipanti di toggle status (open/closed) e di
-- rimettere a 'open' una conv chiusa (task 18).
CREATE POLICY "dm_conv_update" ON conversations
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = participant_a
    OR auth.uid() = participant_b
  )
  WITH CHECK (
    auth.uid() = participant_a
    OR auth.uid() = participant_b
  );

-- messages: solo i partecipanti della conv possono leggere/scrivere
CREATE POLICY "dm_msg_select" ON direct_messages
  FOR SELECT TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM conversations
       WHERE participant_a = auth.uid() OR participant_b = auth.uid()
    )
  );

CREATE POLICY "dm_msg_insert" ON direct_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND conversation_id IN (
      SELECT id FROM conversations
       WHERE participant_a = auth.uid() OR participant_b = auth.uid()
    )
  );

-- Update: il destinatario può marcare read_at
CREATE POLICY "dm_msg_update_read" ON direct_messages
  FOR UPDATE TO authenticated
  USING (
    sender_id <> auth.uid()
    AND conversation_id IN (
      SELECT id FROM conversations
       WHERE participant_a = auth.uid() OR participant_b = auth.uid()
    )
  )
  WITH CHECK (
    sender_id <> auth.uid()
  );

-- Realtime per ricevere i nuovi messaggi senza polling
ALTER PUBLICATION supabase_realtime ADD TABLE direct_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
