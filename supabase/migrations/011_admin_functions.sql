-- RLS: admin can update any profile (needed for role changes)
CREATE POLICY "admin_update_any_profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Lists all auth users with their profile data.
-- SECURITY DEFINER runs with owner privileges so it can access auth.users.
CREATE OR REPLACE FUNCTION get_admin_users()
RETURNS TABLE (
  id           uuid,
  email        text,
  display_name text,
  role         text,
  created_at   timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT profiles.role FROM profiles WHERE profiles.id = auth.uid()) != 'admin' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    au.id,
    au.email::text,
    COALESCE(p.display_name, au.email)::text AS display_name,
    COALESCE(p.role, 'client')::text         AS role,
    au.created_at
  FROM auth.users au
  LEFT JOIN public.profiles p ON p.id = au.id
  ORDER BY au.created_at DESC;
END;
$$;

-- Deletes an auth user (cascades to profiles via FK).
CREATE OR REPLACE FUNCTION admin_delete_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT profiles.role FROM profiles WHERE profiles.id = auth.uid()) != 'admin' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;
