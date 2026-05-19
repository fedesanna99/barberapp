-- =============================================================
-- Distingue 'declined' (barbiere rifiuta) da 'cancelled' (cliente annulla)
-- =============================================================
-- Prima di questa migration entrambi collassavano in 'cancelled' →
-- impossibile capire chi ha rifiutato cosa nei log / analytics.
--
-- Cambia:
--   • CHECK constraint su bookings.status: aggiunge 'declined'
--   • RLS bookings_barber_update WITH CHECK: ammette 'declined' tra
--     gli status nuovi consentiti (insieme a confirmed/cancelled/done
--     che restano per backward-compat)
--   • La view booking_slots (migration 032) filtra già su status IN
--     ('pending','confirmed') quindi 'declined' libera lo slot
--     correttamente — nessuna modifica lì.
-- =============================================================

alter table bookings drop constraint if exists bookings_status_check;
alter table bookings add constraint bookings_status_check
  check (status in ('pending', 'confirmed', 'done', 'cancelled', 'declined'));

drop policy if exists "bookings_barber_update" on bookings;
create policy "bookings_barber_update" on bookings
  for update
  using  (barber_id = (select id from barbers where profile_id = auth.uid()))
  with check (
    barber_id = (select id from barbers where profile_id = auth.uid())
    and status in ('confirmed', 'cancelled', 'done', 'declined')
  );
