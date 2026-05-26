-- =============================================================
-- Booking lifecycle — cancellation policy + TTL 72h + refund flow
--
-- Closes 3 gaps left open by PR payment (mig. 038):
--  1. Client non può cancellare una booking online ottenendo refund.
--  2. Barbiere non può declinare una pending paid scatenando refund.
--  3. Booking online pending+paid resta "in attesa di conferma barbiere"
--     senza scadenza → TTL 72h con auto-decline + refund via cron.
--
-- Cambiamenti:
--   1. barbers.cancellation_window_hours  — finestra di cancellazione (h)
--      che il cliente può sfruttare per refund automatico. Default 24.
--      Range 0-168 (1 settimana max).
--   2. bookings.cancellation_window_hours — SNAPSHOT al momento dell'INSERT.
--      Anti-cheat: il barbiere può modificare il suo default in futuro, ma
--      le booking già piazzate mantengono la finestra di quando il client
--      ha prenotato.
--   3. Trigger snapshot_cancellation_window BEFORE INSERT on bookings.
--   4. Trigger immutable esteso: cancellation_window_hours NON è mutabile
--      via PostgREST. service_role può cambiarlo (per admin override).
--   5. Function auto_decline_expired_bookings() che invoca l'edge function
--      auto-decline-expired via pg_net (legge service_role_key da Vault).
--   6. pg_cron schedule — NON in SQL (Supabase limitation, vedi mig. 038).
--      Va schedulato a mano via Dashboard → Database → Cron Jobs.
--      Vedi DEPLOYMENT.md §"Cron jobs setup".
-- =============================================================

-- ── 1. barbers.cancellation_window_hours ────────────────────────────────────
ALTER TABLE public.barbers
  ADD COLUMN IF NOT EXISTS cancellation_window_hours int NOT NULL DEFAULT 24
    CHECK (cancellation_window_hours >= 0 AND cancellation_window_hours <= 168);

-- ── 2. bookings.cancellation_window_hours (nullable temp + backfill) ────────
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS cancellation_window_hours int;

-- Backfill da barbers (solo righe ancora NULL — idempotente al re-run).
UPDATE public.bookings b
   SET cancellation_window_hours = barbs.cancellation_window_hours
  FROM public.barbers barbs
 WHERE b.barber_id = barbs.id
   AND b.cancellation_window_hours IS NULL;

-- Catch-all: se per qualche ragione un barber_id orfano lascia bookings con
-- NULL (non dovrebbe succedere, ma difensivamente), default a 24.
UPDATE public.bookings
   SET cancellation_window_hours = 24
 WHERE cancellation_window_hours IS NULL;

-- Set NOT NULL post-backfill.
ALTER TABLE public.bookings
  ALTER COLUMN cancellation_window_hours SET NOT NULL;

-- Constraint coerente con barbers.
ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_cancellation_window_check;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_cancellation_window_check
  CHECK (cancellation_window_hours >= 0 AND cancellation_window_hours <= 168);

-- ── 3. Trigger snapshot: se INSERT non specifica il valore, copia dal barber ─
-- SECURITY DEFINER per leggere barbers.cancellation_window_hours anche se la
-- RLS di barbers fosse più restrittiva (default pubblico, ma difensivo).
CREATE OR REPLACE FUNCTION public.snapshot_cancellation_window()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
BEGIN
  -- Se il client INSERT specifica un valore, lo lasciamo (sarà comunque
  -- vincolato da RLS bookings_insert + CHECK constraint sotto). In pratica
  -- il client passerà sempre NULL e prendiamo il default barber.
  IF NEW.cancellation_window_hours IS NULL THEN
    SELECT cancellation_window_hours
      INTO NEW.cancellation_window_hours
      FROM public.barbers
     WHERE id = NEW.barber_id;
    -- Fallback estremo: barbiere senza riga (impossibile data la FK, ma OK)
    IF NEW.cancellation_window_hours IS NULL THEN
      NEW.cancellation_window_hours := 24;
    END IF;
  END IF;
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS bookings_snapshot_window ON public.bookings;
CREATE TRIGGER bookings_snapshot_window
  BEFORE INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.snapshot_cancellation_window();

-- ── 4. Estendi trigger immutable: pinna cancellation_window_hours ───────────
-- service_role bypass (admin override consentito); client/barber via PostgREST
-- NON possono modificarlo dopo l'INSERT.
CREATE OR REPLACE FUNCTION public.bookings_prevent_immutable_change()
RETURNS trigger LANGUAGE plpgsql AS $func$
DECLARE
  caller_role text := coalesce(auth.role(), 'anon');
BEGIN
  IF NEW.client_id IS DISTINCT FROM OLD.client_id THEN
    RAISE EXCEPTION 'client_id is immutable';
  END IF;
  IF NEW.barber_id IS DISTINCT FROM OLD.barber_id THEN
    RAISE EXCEPTION 'barber_id is immutable';
  END IF;
  IF NEW.date IS DISTINCT FROM OLD.date THEN
    RAISE EXCEPTION 'date is immutable';
  END IF;
  IF NEW.time_slot IS DISTINCT FROM OLD.time_slot THEN
    RAISE EXCEPTION 'time_slot is immutable';
  END IF;

  IF caller_role <> 'service_role' THEN
    IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
      RAISE EXCEPTION 'payment_status can only be modified by service_role'
        USING ERRCODE = '42501';
    END IF;
    IF NEW.stripe_payment_intent_id IS DISTINCT FROM OLD.stripe_payment_intent_id THEN
      RAISE EXCEPTION 'stripe_payment_intent_id can only be modified by service_role'
        USING ERRCODE = '42501';
    END IF;
    -- Mig. 039: anti-cheat su cancellation_window_hours. Il barbiere può
    -- cambiare il suo barbers.cancellation_window_hours in futuro, ma
    -- non può ridurre la finestra delle booking già esistenti per
    -- impedire un refund già "in tasca" del cliente.
    IF NEW.cancellation_window_hours IS DISTINCT FROM OLD.cancellation_window_hours THEN
      RAISE EXCEPTION 'cancellation_window_hours is immutable after booking (anti-cheat)'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$func$;

-- ── 5. auto_decline_expired_bookings() — chiama edge function via pg_net ────
-- Legge service_role_key da Vault. Triggerata da pg_cron (schedule manuale
-- via Dashboard UI — vedi DEPLOYMENT.md §Cron jobs setup).
-- SECURITY DEFINER perché pg_net.http_post richiede privilegi minimi e la
-- function deve leggere vault.decrypted_secrets (accessibile a postgres su
-- Supabase con installed=true). Il check su auth.role()='service_role' è
-- una salvaguardia ulteriore: la function non dovrebbe essere chiamabile
-- da utenti normali.
CREATE OR REPLACE FUNCTION public.auto_decline_expired_bookings()
RETURNS bigint  -- ritorna request_id di pg_net per debug
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
DECLARE
  v_request_id bigint;
  v_service_role_key text;
  v_base_url text := 'https://yxulcplvtvsivjxfpjuj.supabase.co';
BEGIN
  -- Defense-in-depth: solo service_role o pg_cron (che gira come postgres
  -- ma senza JWT, quindi auth.role() = 'anon' fallback). Permettiamo
  -- entrambi i percorsi: in pratica pg_cron è il chiamante atteso, ma
  -- bloccare gli altri ruoli authenticated è prudente.
  IF coalesce(auth.role(), 'anon') NOT IN ('service_role', 'anon') THEN
    RAISE EXCEPTION 'auto_decline_expired_bookings can only be invoked by service_role or pg_cron'
      USING ERRCODE = '42501';
  END IF;

  -- Legge service_role_key da Supabase Vault. Il secret deve esistere con
  -- name='service_role_key'. Vedi DEPLOYMENT.md §Vault setup.
  SELECT decrypted_secret
    INTO v_service_role_key
    FROM vault.decrypted_secrets
   WHERE name = 'service_role_key'
   LIMIT 1;

  IF v_service_role_key IS NULL THEN
    RAISE EXCEPTION 'Vault secret "service_role_key" missing — create it before scheduling cron'
      USING ERRCODE = 'P0001',
            HINT = 'Dashboard → Project Settings → Vault → Add secret named "service_role_key"';
  END IF;

  -- Fire-and-forget HTTP POST verso l'edge function. La response è raccolta
  -- async in net._http_response — non blocchiamo il cron job aspettandola.
  -- L'edge function fa l'iterazione + chiama refund-booking internamente.
  SELECT net.http_post(
    url := v_base_url || '/functions/v1/auto-decline-expired',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_role_key
    ),
    body := '{}'::jsonb
  )
  INTO v_request_id;

  RETURN v_request_id;
END;
$func$;

REVOKE EXECUTE ON FUNCTION public.auto_decline_expired_bookings() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.auto_decline_expired_bookings() TO service_role;

-- =====================================================================
-- pg_cron schedule MANUALE via Supabase Dashboard
-- =====================================================================
-- pg_cron su Supabase richiede grants su cron.job che postgres non ha.
-- La schedulazione va fatta via Dashboard → Database → Cron Jobs:
--
--   Name:     auto-decline-expired-bookings
--   Schedule: 0 * * * *           (ogni ora, allo scoccare)
--   SQL:      SELECT public.auto_decline_expired_bookings();
--
-- Pre-requisito: Vault secret 'service_role_key' presente (vedi DEPLOYMENT.md).
-- Vedi DEPLOYMENT.md §"Cron jobs setup" per istruzioni dettagliate.
-- =====================================================================
