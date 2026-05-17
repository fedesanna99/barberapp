-- Add 'admin' to the role check constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('client', 'barber', 'admin'));

-- App logs for admin monitoring
CREATE TABLE IF NOT EXISTS app_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level       text NOT NULL DEFAULT 'info' CHECK (level IN ('info', 'warning', 'error')),
  action      text NOT NULL,
  message     text NOT NULL,
  user_id     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  user_email  text,
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE app_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read logs
CREATE POLICY "admin_read_app_logs"
  ON app_logs FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Authenticated users can write logs
CREATE POLICY "auth_insert_app_logs"
  ON app_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only admins can delete logs
CREATE POLICY "admin_delete_app_logs"
  ON app_logs FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );
