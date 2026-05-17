-- =============================================================
-- Fix: bookings UPDATE policy was missing WITH CHECK.
-- The previous "bookings_cancel" policy allowed any UPDATE the
-- caller could see (USING only), which let a client self-confirm
-- their own booking (status -> 'confirmed') or reassign it to a
-- different barber/slot. This migration splits the policy by role
-- with WITH CHECK that restricts the allowed new status, and adds
-- a BEFORE UPDATE trigger that pins client_id/barber_id/date/
-- time_slot as immutable (RLS policies cannot reference OLD).
-- =============================================================

drop policy if exists "bookings_cancel" on bookings;

-- Client: own row, and only allowed transition is -> 'cancelled'.
create policy "bookings_client_update" on bookings
  for update
  using  (client_id = auth.uid())
  with check (
    client_id = auth.uid()
    and status = 'cancelled'
  );

-- Barber: own row, allowed new status in ('confirmed','cancelled','done').
create policy "bookings_barber_update" on bookings
  for update
  using  (barber_id = (select id from barbers where profile_id = auth.uid()))
  with check (
    barber_id = (select id from barbers where profile_id = auth.uid())
    and status in ('confirmed', 'cancelled', 'done')
  );

-- Pin identifying columns: a booking cannot be reassigned or moved.
create or replace function bookings_prevent_immutable_change()
returns trigger language plpgsql as $$
begin
  if new.client_id is distinct from old.client_id then
    raise exception 'client_id is immutable';
  end if;
  if new.barber_id is distinct from old.barber_id then
    raise exception 'barber_id is immutable';
  end if;
  if new.date is distinct from old.date then
    raise exception 'date is immutable';
  end if;
  if new.time_slot is distinct from old.time_slot then
    raise exception 'time_slot is immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_immutable on bookings;
create trigger bookings_immutable
  before update on bookings
  for each row execute procedure bookings_prevent_immutable_change();
