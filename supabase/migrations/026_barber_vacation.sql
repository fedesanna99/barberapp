-- =============================================================
-- Task 1 — Vacanza / disattivazione prenotazioni dalla dashboard
-- =============================================================
-- Aggiunge il flag `accepting_bookings` su `barbers` e aggiorna la
-- policy di INSERT su `bookings` per rifiutare le prenotazioni quando
-- il barbiere è in pausa (oltre al check lato UI).
--
-- Idempotente: usa IF NOT EXISTS / DROP POLICY IF EXISTS.
-- =============================================================

ALTER TABLE barbers
  ADD COLUMN IF NOT EXISTS accepting_bookings boolean NOT NULL DEFAULT true;

-- Sostituisce la vecchia bookings_insert (client_id = auth.uid()) con
-- una versione che richiede ANCHE che il barbiere accetti prenotazioni.
DROP POLICY IF EXISTS "bookings_insert" ON bookings;

CREATE POLICY "bookings_insert" ON bookings
  FOR INSERT
  WITH CHECK (
    client_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM barbers
      WHERE barbers.id = bookings.barber_id
        AND barbers.accepting_bookings = true
    )
  );
