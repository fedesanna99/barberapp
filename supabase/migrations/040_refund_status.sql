-- =============================================================
-- Migration 040 — refund_status enum su bookings (PR-tris)
--
-- Traccia esito del refund Stripe per ogni cancellazione/decline.
-- Necessario per la UI:
--   - alert sticky "rimborso in elaborazione manuale" su MyAppointments
--     quando Stripe refund fallisce (refund_status='failed_pending_manual')
--   - clearing automatico dopo che supporto risolve a mano
--     (refund_status='resolved_manually')
--
-- L'edge function refund-booking (mig. 040 step 3) ora popola questo
-- campo invece di ritornare 500 su Stripe error.
-- =============================================================

BEGIN;

-- ── 1. Enum refund_status ───────────────────────────────────────────────────
CREATE TYPE public.refund_status_enum AS ENUM (
  'none',                    -- default: no refund expected (cash, oltre window, non ancora richiesto)
  'succeeded',               -- refund Stripe completato
  'failed_pending_manual',   -- refund Stripe fallito, supporto manuale necessario
  'resolved_manually'        -- supporto ha completato refund manualmente, alert risolto
);

-- ── 2. Colonna su bookings (NOT NULL DEFAULT 'none') ────────────────────────
ALTER TABLE public.bookings
  ADD COLUMN refund_status public.refund_status_enum NOT NULL DEFAULT 'none';

-- ── 3. Backfill per booking già refunded ────────────────────────────────────
-- Storico: payment_status='refunded' → refund già successo (PR-bis mark_booking_refunded).
UPDATE public.bookings
   SET refund_status = 'succeeded'
 WHERE payment_status = 'refunded';

-- ── 4. Estendi trigger immutable (CREATE OR REPLACE in-place) ───────────────
-- bookings_prevent_immutable_change()
-- Pinning list (non-service_role):
--   payment_status              (mig. 038)
--   stripe_payment_intent_id    (mig. 038)
--   cancellation_window_hours   (mig. 039)
--   refund_status               (mig. 040)
-- Pattern: ogni nuova migration che aggiunge una colonna immutable
-- estende QUESTA function via CREATE OR REPLACE, NON crea trigger nuovi.
-- Il trigger 'bookings_immutable' (BEFORE UPDATE) esistente esegue
-- automaticamente la versione aggiornata.
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

  IF caller_role <> 'service_role' THEN
    IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
      RAISE EXCEPTION 'payment_status can only be modified by service_role'
        USING ERRCODE = '42501';
    END IF;
    IF NEW.stripe_payment_intent_id IS DISTINCT FROM OLD.stripe_payment_intent_id THEN
      RAISE EXCEPTION 'stripe_payment_intent_id can only be modified by service_role'
        USING ERRCODE = '42501';
    END IF;
    -- Mig. 039: anti-cheat su cancellation_window_hours.
    IF NEW.cancellation_window_hours IS DISTINCT FROM OLD.cancellation_window_hours THEN
      RAISE EXCEPTION 'cancellation_window_hours is immutable after booking (anti-cheat)'
        USING ERRCODE = '42501';
    END IF;
    -- Mig. 040: refund_status è scritto esclusivamente dall'edge function
    -- refund-booking (service_role). Il client non può alterarlo per simulare
    -- un refund risolto o per saltare lo stato "failed_pending_manual".
    IF NEW.refund_status IS DISTINCT FROM OLD.refund_status THEN
      RAISE EXCEPTION 'refund_status can only be modified by service_role'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$func$;

-- ── 5. Defense-in-depth: REVOKE UPDATE granulare sulla colonna ──────────────
-- Mig. 038/039 si affidano SOLO al trigger per pinnare le colonne sensibili.
-- Su Postgres però authenticated/anon hanno UPDATE grant default su tutta
-- la tabella, quindi il trigger è l'unico boundary. Per refund_status
-- aggiungiamo anche la REVOKE granulare come secondo strato: anche se il
-- trigger fosse droppato, il grant a livello colonna blocca comunque.
REVOKE UPDATE (refund_status) ON public.bookings FROM authenticated, anon;

-- ── 6. Index partial per query alert sticky ────────────────────────────────
-- Query frequente: SELECT * FROM bookings WHERE client_id=? AND refund_status='failed_pending_manual'
-- Partial: la maggior parte delle booking ha refund_status='none', niente
-- senso indicizzarle. Solo le righe in stato failed_pending_manual.
CREATE INDEX IF NOT EXISTS idx_bookings_refund_status_failed
  ON public.bookings (client_id, refund_status)
  WHERE refund_status = 'failed_pending_manual';

-- ── 7. RLS note ─────────────────────────────────────────────────────────────
-- Non serve nuova policy: il SELECT su bookings è già coperto da
-- bookings_client_select (client_id = auth.uid()) e bookings_barber_select
-- (barber_id = ...). Cliente legge il proprio refund_status come parte del
-- record bookings. Service_role bypassa RLS.

COMMIT;
