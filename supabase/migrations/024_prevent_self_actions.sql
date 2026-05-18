-- =============================================================
-- Prevent barbers from booking themselves or reviewing themselves.
--
-- Both rules are enforced at the DB layer so the UI guards
-- below are belt-and-suspenders, not the only line of defence.
-- =============================================================

-- ------------------------------------------------------------
-- BOOKINGS: client_id must NOT be the barber's own profile_id
-- ------------------------------------------------------------
create or replace function check_no_self_booking()
returns trigger language plpgsql as $$
begin
  if exists (
    select 1 from barbers
    where id = new.barber_id
      and profile_id = new.client_id
  ) then
    raise exception 'A barber cannot book themselves'
      using errcode = '23514';   -- check_violation
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_no_self on bookings;
create trigger bookings_no_self
  before insert or update on bookings
  for each row execute procedure check_no_self_booking();

-- ------------------------------------------------------------
-- REVIEWS: same rule — barber can't review themselves
-- Implemented as a trigger AND folded into the INSERT RLS so
-- the user gets a sensible error before the write reaches the
-- table.
-- ------------------------------------------------------------
create or replace function check_no_self_review()
returns trigger language plpgsql as $$
begin
  if exists (
    select 1 from barbers
    where id = new.barber_id
      and profile_id = new.client_id
  ) then
    raise exception 'A barber cannot review themselves'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists reviews_no_self on reviews;
create trigger reviews_no_self
  before insert or update on reviews
  for each row execute procedure check_no_self_review();

-- Tighten the existing INSERT RLS to also forbid self-reviews up-front.
-- (Trigger above is the real guarantee; this makes the error friendlier.)
drop policy if exists "reviews_insert" on reviews;
create policy "reviews_insert" on reviews
  for insert with check (
    client_id = auth.uid()
    and not exists (
      select 1 from barbers
      where id = reviews.barber_id
        and profile_id = auth.uid()
    )
    and exists (
      select 1 from bookings
      where bookings.client_id = auth.uid()
        and bookings.barber_id = reviews.barber_id
        and bookings.status    = 'done'
    )
  );
