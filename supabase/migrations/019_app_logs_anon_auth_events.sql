-- =============================================================
-- Allow anonymous (unauthenticated) users to insert app_logs rows
-- but only for security events from the Login screen — actions
-- prefixed with 'auth.' (auth.failed, auth.reset.requested,
-- auth.reset.failed). Previously the policy required role
-- 'authenticated', so writeLog calls from the Login/forgot-password
-- handlers were silently rejected with 401, dropping useful
-- security telemetry.
--
-- Logged-in users keep full insert rights as before (no action
-- prefix restriction); reads remain admin-only.
-- =============================================================

drop policy if exists "auth_insert_app_logs" on app_logs;

create policy "auth_insert_app_logs"
  on app_logs for insert
  to public
  with check (
    auth.role() = 'authenticated'
    or action like 'auth.%'
  );
