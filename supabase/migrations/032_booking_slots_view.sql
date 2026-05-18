-- =============================================================
-- Hardening prod — chiude RLS leak su bookings_availability_select
-- =============================================================
-- Problema: migration 007 esponeva l'intera riga bookings (incluso
-- client_id e created_at) a qualunque utente autenticato, per
-- permettere la generazione della slot grid in BookingSheet.
-- Espone metadata sensibile (chi prenota da chi, quando).
--
-- Soluzione: una view `booking_slots` con security_invoker=false che
-- mostra SOLO (barber_id, date, time_slot) per status in
-- (pending, confirmed). Il client legge da lì per la slot grid.
-- Le policy esistenti bookings_client_select / bookings_barber_select
-- continuano a coprire il caso "vedo le mie prenotazioni".
--
-- Trade-off documentato (PROGRESS.md):
--   - Il realtime channel in useAvailability ascolta ancora la tabella
--     bookings filtrata su barber_id. Con la policy permissiva rimossa,
--     RLS blocca la consegna di eventi su prenotazioni di ALTRI clienti
--     per lo stesso barbiere → la grid non si aggiorna live quando un
--     terzo prenota lo stesso slot.
--   - Mitigazioni:
--       * L'exclusion constraint `bookings_no_double` rifiuta il
--         double-booking server-side comunque (vedi 008/009).
--       * La propria prenotazione (client_id = auth.uid()) continua ad
--         arrivare via bookings_client_select.
--       * La grid viene rinfrescata al reopen della sheet.
-- =============================================================

drop policy if exists "bookings_availability_select" on public.bookings;

create or replace view public.booking_slots
  with (security_invoker = false) as
  select barber_id, date, time_slot
  from public.bookings
  where status in ('pending', 'confirmed');

-- Pre-login il booking flow non esiste, ma anon ha bisogno della view
-- se in futuro vogliamo mostrare disponibilità pubblica → grant a entrambi.
grant select on public.booking_slots to anon, authenticated;
