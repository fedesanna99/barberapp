-- One conversation per user; admins can read and reply to any conversation.

CREATE TABLE support_conversations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status     text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT support_conversations_user_id_key UNIQUE (user_id)
);

CREATE TABLE support_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES support_conversations(id) ON DELETE CASCADE,
  sender_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_admin        boolean NOT NULL DEFAULT false,
  content         text NOT NULL CHECK (char_length(trim(content)) > 0),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX support_messages_conv_idx ON support_messages(conversation_id, created_at);

-- Keep updated_at current whenever a new message is inserted so the
-- conversation list can be sorted by most-recent activity.
CREATE OR REPLACE FUNCTION touch_conversation_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE support_conversations SET updated_at = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER support_messages_touch_conv
  AFTER INSERT ON support_messages
  FOR EACH ROW EXECUTE FUNCTION touch_conversation_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages      ENABLE ROW LEVEL SECURITY;

-- Conversations: user sees own; admin sees all.
CREATE POLICY "conv_select"
  ON support_conversations FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "conv_insert_own"
  ON support_conversations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admin can close conversations.
CREATE POLICY "conv_update_admin"
  ON support_conversations FOR UPDATE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Messages: user can read/write to their own conversation; admin can read/write all.
CREATE POLICY "msg_select"
  ON support_messages FOR SELECT TO authenticated
  USING (
    conversation_id IN (SELECT id FROM support_conversations WHERE user_id = auth.uid())
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "msg_insert"
  ON support_messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND (
      conversation_id IN (SELECT id FROM support_conversations WHERE user_id = auth.uid())
      OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    )
  );

-- ── Realtime ─────────────────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE support_conversations;
