-- Catalogo servizi per barbiere.
-- Ogni barbiere può definire più servizi (nome, prezzo, durata).
-- I clienti vedono solo i servizi attivi al momento della prenotazione.

CREATE TABLE IF NOT EXISTS services (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id        UUID NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
  name             TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  price            NUMERIC(7,2) NOT NULL CHECK (price >= 0),
  duration_minutes INT  NOT NULL DEFAULT 30 CHECK (duration_minutes BETWEEN 5 AND 480),
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Chiunque può leggere i servizi (necessario per il flusso di prenotazione)
DROP POLICY IF EXISTS "services_public_read" ON services;
CREATE POLICY "services_public_read" ON services
  FOR SELECT USING (true);

-- Solo il barbiere proprietario può creare/modificare/eliminare i propri servizi
DROP POLICY IF EXISTS "services_barber_write" ON services;
CREATE POLICY "services_barber_write" ON services
  FOR ALL
  USING  (barber_id IN (SELECT id FROM barbers WHERE profile_id = auth.uid()))
  WITH CHECK (barber_id IN (SELECT id FROM barbers WHERE profile_id = auth.uid()));
