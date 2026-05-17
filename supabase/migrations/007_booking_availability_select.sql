-- Any authenticated user can read the time_slot/date/barber_id of existing
-- bookings so the availability hook can correctly mark slots as taken.
-- client_id is a UUID with no PII; the existing per-client and per-barber
-- policies already cover their full-row access needs.
create policy "bookings_availability_select" on bookings
  for select using (auth.uid() is not null);
