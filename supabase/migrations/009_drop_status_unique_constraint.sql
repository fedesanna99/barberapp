-- Drop the legacy unique constraint on (barber_id, date, time_slot, status).
-- It blocks status transitions (confirm, done, cancel) whenever a stale row
-- with the same status already exists for the same slot (e.g. from test data).
-- The partial index bookings_no_double (migration 008) is the correct guard:
-- only one active (pending|confirmed) booking per slot is allowed.
alter table bookings
  drop constraint if exists "bookings_barber_id_date_time_slot_status_key";

-- Re-create the partial index in case migration 008 was not applied yet.
drop index if exists bookings_no_double;
create unique index bookings_no_double
  on bookings (barber_id, date, time_slot)
  where status in ('pending', 'confirmed');
