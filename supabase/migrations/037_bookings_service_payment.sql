-- Aggiungi servizio scelto e stato pagamento alle prenotazioni.
-- service_id è nullable per compatibilità con prenotazioni esistenti e con
-- barbieri che non hanno ancora configurato il catalogo servizi.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS service_id               UUID REFERENCES services(id),
  ADD COLUMN IF NOT EXISTS payment_status           TEXT NOT NULL DEFAULT 'pending_cash'
    CHECK (payment_status IN ('pending_cash', 'pending_online', 'paid', 'refunded')),
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
