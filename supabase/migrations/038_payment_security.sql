-- =============================================================
-- Payment security hardening — chiude i finding F001/F002/F004/F007 (Sess 1)
-- e F001 (Sess 2) descritti in AUDIT_BACKEND_REPORT.md / AUDIT_APP_REPORT.md.
--
-- Cambiamenti:
--   1. Estende il CHECK su bookings.payment_status con 'failed'.
--      'pending_online' resta semantica "PaymentIntent creato, attesa webhook"
--      (riusato invece di introdurre 'awaiting_payment').
--   2. Estende il trigger bookings_prevent_immutable_change per pinnare
--      payment_status e stripe_payment_intent_id contro UPDATE diretti dal
--      client (PostgREST anon/authenticated). Solo service_role può mutarli
--      → l'unica strada per transitare a 'paid' è il webhook Stripe.
--   3. Aggiunge tre function SECURITY DEFINER (mark_booking_paid,
--      mark_booking_payment_failed, mark_booking_refunded) che il webhook
--      invoca per le transizioni di stato. Idempotenti: Stripe può
--      ritrasmettere lo stesso evento.
--   4. Indice partial su stripe_payment_intent_id per i lookup del webhook.
--   5. pg_cron job opzionale (ogni 5 min) per cancellare le booking abbandonate
--      in 'pending_online' più vecchie di 15 min (slot non resta bloccato).
--      Se pg_cron non è abilitato sul progetto, l'estensione viene saltata
--      con un NOTICE e si dovrà usare la scheduled edge function fallback
--      (vedi DEPLOYMENT.md §"Cleanup pagamenti abbandonati").
-- =============================================================

-- ── 1. CHECK constraint: aggiungi 'failed' ──────────────────────────────────
-- ADD COLUMN (mig. 037) genera il constraint con nome system-generated
-- bookings_payment_status_check. Lo droppo e ricreo con i 5 valori.
DO $body$
DECLARE cname text;
BEGIN
  SELECT conname INTO cname
    FROM pg_constraint
   WHERE conrelid = 'public.bookings'::regclass
     AND contype = 'c'
     AND pg_get_constraintdef(oid) ILIKE '%payment_status%';
  IF cname IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.bookings DROP CONSTRAINT ' || quote_ident(cname);
  END IF;
END;
$body$;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_payment_status_check
  CHECK (payment_status IN ('pending_cash', 'pending_online', 'paid', 'refunded', 'failed'));

-- ── 1b. INSERT policy: vincola payment_status iniziale e stripe_payment_intent_id ─
-- La policy bookings_insert in mig. 026 controlla solo client_id e accepting_bookings.
-- Senza questo restringimento, un client poteva INSERT con payment_status='paid'
-- direttamente (estensione di F002 sul percorso INSERT, complementare a F007 su UPDATE).
-- Il trigger sotto pinna payment_status / stripe_payment_intent_id su UPDATE; questa
-- policy chiude la stessa class di attacchi sul path INSERT.
-- service_role bypassa RLS quindi webhook/PI-edge-function non sono toccati.
DROP POLICY IF EXISTS "bookings_insert" ON public.bookings;

CREATE POLICY "bookings_insert" ON public.bookings
  FOR INSERT
  WITH CHECK (
    client_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM barbers
       WHERE barbers.id = bookings.barber_id
         AND barbers.accepting_bookings = true
    )
    -- Nuovo: solo stati iniziali ammessi (no self-promotion a 'paid' via INSERT)
    AND payment_status IN ('pending_cash', 'pending_online')
    -- Nuovo: l'edge function PI è l'unica strada per scrivere stripe_payment_intent_id
    AND stripe_payment_intent_id IS NULL
  );

-- ── 2. Trigger esteso: pinna payment_status + stripe_payment_intent_id ──────
-- Single trigger BEFORE UPDATE (vincolo: niente nuovi). Eccezione per service_role.
CREATE OR REPLACE FUNCTION public.bookings_prevent_immutable_change()
RETURNS trigger LANGUAGE plpgsql AS $func$
DECLARE
  caller_role text := coalesce(auth.role(), 'anon');
BEGIN
  -- Colonne identificative: immutabili per tutti, anche service_role.
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

  -- Campi pagamento: solo service_role può mutarli (webhook + edge function PI).
  -- Chiude F007: prima un client/barbiere poteva fare PATCH via PostgREST e
  -- auto-promuovere payment_status='paid'. Ora la transizione è enforced solo
  -- via SECURITY DEFINER functions sotto, che girano in service_role.
  IF caller_role <> 'service_role' THEN
    IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
      RAISE EXCEPTION 'payment_status can only be modified by service_role'
        USING ERRCODE = '42501';
    END IF;
    IF NEW.stripe_payment_intent_id IS DISTINCT FROM OLD.stripe_payment_intent_id THEN
      RAISE EXCEPTION 'stripe_payment_intent_id can only be modified by service_role'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$func$;

-- Il trigger esisteva già (mig. 016) ed era già BEFORE UPDATE; CREATE OR REPLACE
-- sopra ha solo riscritto la function. Niente DROP/CREATE del trigger.

-- ── 3. SECURITY DEFINER function: mark_booking_paid ─────────────────────────
-- Chiamata dal webhook su payment_intent.succeeded. Idempotente.
CREATE OR REPLACE FUNCTION public.mark_booking_paid(
  p_booking_id        uuid,
  p_payment_intent_id text
)
RETURNS bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
DECLARE
  existing bookings;
  updated  bookings;
BEGIN
  -- Defense-in-depth: la GRANT sotto già limita EXECUTE a service_role, ma
  -- ricontrollo runtime per coprire eventuali percorsi futuri.
  IF coalesce(auth.role(), 'anon') <> 'service_role' THEN
    RAISE EXCEPTION 'mark_booking_paid can only be invoked by service_role'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO existing FROM bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'booking % not found', p_booking_id USING ERRCODE = 'P0002';
  END IF;

  -- Idempotency: già pagata con lo stesso intent → no-op.
  IF existing.payment_status = 'paid'
     AND existing.stripe_payment_intent_id IS NOT DISTINCT FROM p_payment_intent_id THEN
    RETURN existing;
  END IF;

  -- Inconsistenza: già pagata con un intent diverso → errore (data integrity).
  IF existing.payment_status = 'paid'
     AND existing.stripe_payment_intent_id IS DISTINCT FROM p_payment_intent_id THEN
    RAISE EXCEPTION 'booking % already paid with a different payment intent', p_booking_id
      USING ERRCODE = 'P0003';
  END IF;

  -- Refunded → non riportare a paid.
  IF existing.payment_status = 'refunded' THEN
    RETURN existing;
  END IF;

  UPDATE bookings
     SET payment_status           = 'paid',
         stripe_payment_intent_id = p_payment_intent_id
   WHERE id = p_booking_id
   RETURNING * INTO updated;

  RETURN updated;
END;
$func$;

REVOKE EXECUTE ON FUNCTION public.mark_booking_paid(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.mark_booking_paid(uuid, text) TO service_role;

-- ── 3b. mark_booking_payment_failed ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.mark_booking_payment_failed(
  p_booking_id        uuid,
  p_payment_intent_id text
)
RETURNS bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
DECLARE
  existing bookings;
  updated  bookings;
BEGIN
  IF coalesce(auth.role(), 'anon') <> 'service_role' THEN
    RAISE EXCEPTION 'mark_booking_payment_failed can only be invoked by service_role'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO existing FROM bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    -- Idempotente: la booking potrebbe essere stata cancellata dal cleanup TTL.
    RETURN NULL;
  END IF;

  -- Race con succeeded già processato → vince paid.
  IF existing.payment_status = 'paid' THEN
    RETURN existing;
  END IF;

  -- Già failed → no-op.
  IF existing.payment_status = 'failed'
     AND existing.stripe_payment_intent_id IS NOT DISTINCT FROM p_payment_intent_id THEN
    RETURN existing;
  END IF;

  UPDATE bookings
     SET payment_status           = 'failed',
         stripe_payment_intent_id = p_payment_intent_id
   WHERE id = p_booking_id
   RETURNING * INTO updated;

  RETURN updated;
END;
$func$;

REVOKE EXECUTE ON FUNCTION public.mark_booking_payment_failed(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.mark_booking_payment_failed(uuid, text) TO service_role;

-- ── 3c. mark_booking_refunded ───────────────────────────────────────────────
-- Lookup per payment_intent_id (l'evento charge.refunded non ha booking_id).
CREATE OR REPLACE FUNCTION public.mark_booking_refunded(
  p_payment_intent_id text
)
RETURNS bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
DECLARE
  existing bookings;
  updated  bookings;
BEGIN
  IF coalesce(auth.role(), 'anon') <> 'service_role' THEN
    RAISE EXCEPTION 'mark_booking_refunded can only be invoked by service_role'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO existing
    FROM bookings
   WHERE stripe_payment_intent_id = p_payment_intent_id
   LIMIT 1;

  IF NOT FOUND THEN
    -- PI sconosciuto (booking già cancellata, oppure refund su PI di test): ignora.
    RETURN NULL;
  END IF;

  -- Idempotency.
  IF existing.payment_status = 'refunded' THEN
    RETURN existing;
  END IF;

  UPDATE bookings
     SET payment_status = 'refunded'
   WHERE id = existing.id
   RETURNING * INTO updated;

  RETURN updated;
END;
$func$;

REVOKE EXECUTE ON FUNCTION public.mark_booking_refunded(text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.mark_booking_refunded(text) TO service_role;

-- ── 4. Indice partial su stripe_payment_intent_id ───────────────────────────
-- Il webhook fa lookup per PI id (charge.refunded). Partial: la maggior parte
-- delle booking (cash) hanno stripe_payment_intent_id NULL.
CREATE INDEX IF NOT EXISTS bookings_stripe_payment_intent_id_idx
  ON public.bookings (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

-- =====================================================================
-- pg_cron schedule MANUALE via Supabase Dashboard
-- =====================================================================
-- Su Supabase il ruolo `postgres` non ha INSERT/UPDATE/DELETE su
-- cron.job (privilegi di supabase_admin). La schedulazione va fatta
-- via Dashboard → Database → Cron Jobs:
--
--   Name:     cleanup-abandoned-online-bookings
--   Schedule: */5 * * * *
--   SQL:      DELETE FROM bookings
--             WHERE payment_status = 'pending_online'
--               AND created_at < now() - interval '15 minutes';
--
-- Vedi DEPLOYMENT.md sezione "Cron jobs setup".
-- =====================================================================
