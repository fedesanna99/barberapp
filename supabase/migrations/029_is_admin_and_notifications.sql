-- =============================================================
-- Task 9 — Sistema notifiche + admin via is_admin
-- =============================================================
-- DECISIONI VINCOLANTI:
--   • Admin = `profiles.is_admin boolean` (flag ortogonale al role)
--   • NON tenere 'admin' in profiles.role
--   • Tabella `notifications` con recipient_id null = broadcast
--
-- Migrazione:
--   1) profiles.is_admin
--   2) backfill: tutti i profili con role='admin' diventano is_admin=true,
--      role='client' (default neutro — un admin può sempre essere anche barbiere
--      ricollegandosi un row in `barbers`)
--   3) drop 'admin' dal CHECK constraint di profiles.role
--   4) sostituisce TUTTE le policy/funzioni che facevano `role = 'admin'`
--      con `is_admin = true` via subquery
--   5) crea `notifications` + RLS
-- =============================================================

-- 1) Colonna is_admin
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- 2) Backfill admin esistenti
UPDATE profiles
SET is_admin = true,
    role     = 'client'
WHERE role = 'admin';

-- 3) Drop 'admin' dal check constraint del role
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('client', 'barber'));

-- 4) Sostituisci policy e funzioni che usavano role='admin'

-- 4a) app_logs (010_admin_role.sql)
DROP POLICY IF EXISTS "admin_read_app_logs" ON app_logs;
CREATE POLICY "admin_read_app_logs"
  ON app_logs FOR SELECT
  TO authenticated
  USING (
    (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
  );

DROP POLICY IF EXISTS "admin_delete_app_logs" ON app_logs;
CREATE POLICY "admin_delete_app_logs"
  ON app_logs FOR DELETE
  TO authenticated
  USING (
    (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
  );

-- 4b) admin_update_any_profile (011_admin_functions.sql)
DROP POLICY IF EXISTS "admin_update_any_profile" ON profiles;
CREATE POLICY "admin_update_any_profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    (SELECT is_admin FROM profiles p WHERE p.id = auth.uid()) = true
  )
  WITH CHECK (
    (SELECT is_admin FROM profiles p WHERE p.id = auth.uid()) = true
  );

-- 4c) RPC get_admin_users / admin_delete_user (011_admin_functions.sql)
-- NB: la funzione esistente ritornava 5 colonne; aggiungendo `is_admin` la
-- firma cambia, quindi CREATE OR REPLACE non basta. Va droppata prima.
DROP FUNCTION IF EXISTS get_admin_users();
DROP FUNCTION IF EXISTS admin_delete_user(uuid);

CREATE OR REPLACE FUNCTION get_admin_users()
RETURNS TABLE (
  id           uuid,
  email        text,
  display_name text,
  role         text,
  is_admin     boolean,
  created_at   timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT COALESCE((SELECT profiles.is_admin FROM profiles WHERE profiles.id = auth.uid()), false) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    au.id,
    au.email::text,
    COALESCE(p.display_name, au.email)::text AS display_name,
    COALESCE(p.role, 'client')::text         AS role,
    COALESCE(p.is_admin, false)              AS is_admin,
    au.created_at
  FROM auth.users au
  LEFT JOIN public.profiles p ON p.id = au.id
  ORDER BY au.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION admin_delete_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT COALESCE((SELECT profiles.is_admin FROM profiles WHERE profiles.id = auth.uid()), false) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

-- 4d) support chat (012_support_chat.sql)
DROP POLICY IF EXISTS "conv_select" ON support_conversations;
CREATE POLICY "conv_select"
  ON support_conversations FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
  );

DROP POLICY IF EXISTS "conv_update_admin" ON support_conversations;
CREATE POLICY "conv_update_admin"
  ON support_conversations FOR UPDATE TO authenticated
  USING ((SELECT is_admin FROM profiles WHERE id = auth.uid()) = true);

DROP POLICY IF EXISTS "msg_select" ON support_messages;
CREATE POLICY "msg_select"
  ON support_messages FOR SELECT TO authenticated
  USING (
    conversation_id IN (SELECT id FROM support_conversations WHERE user_id = auth.uid())
    OR (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
  );

DROP POLICY IF EXISTS "msg_insert" ON support_messages;
CREATE POLICY "msg_insert"
  ON support_messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND (
      conversation_id IN (SELECT id FROM support_conversations WHERE user_id = auth.uid())
      OR (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
    )
  );

-- 5) NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id  uuid REFERENCES profiles(id) ON DELETE CASCADE,
  -- NULL = broadcast a tutti gli utenti autenticati
  title         text NOT NULL CHECK (char_length(trim(title)) > 0),
  body_html     text,
  type          text NOT NULL DEFAULT 'admin',
  is_read       boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_recipient_created
  ON notifications (recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS notifications_broadcast_created
  ON notifications (created_at DESC) WHERE recipient_id IS NULL;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- SELECT: il destinatario o broadcast (recipient_id IS NULL) per tutti gli auth users.
-- Admin può anche leggere quelle che ha inviato (utile per "le mie notifiche inviate")
-- via la sua copia per recipient_id quando esiste; per ora basta vedere broadcast + le proprie.
CREATE POLICY "notif_select" ON notifications
  FOR SELECT TO authenticated
  USING (
    recipient_id = auth.uid()
    OR recipient_id IS NULL
  );

-- INSERT: solo admin
CREATE POLICY "notif_insert_admin" ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    COALESCE((SELECT is_admin FROM profiles WHERE id = auth.uid()), false) = true
  );

-- UPDATE is_read: solo il destinatario (per le sue notifiche). Broadcast non
-- tracciano lo stato di lettura per singolo utente (tradeoff: niente tabella
-- read-receipts; sarebbe oltre lo scope di questo task).
CREATE POLICY "notif_update_recipient" ON notifications
  FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- DELETE: solo admin (per cleanup)
CREATE POLICY "notif_delete_admin" ON notifications
  FOR DELETE TO authenticated
  USING (
    COALESCE((SELECT is_admin FROM profiles WHERE id = auth.uid()), false) = true
  );
