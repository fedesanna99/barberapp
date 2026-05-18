-- =============================================================
-- Reviews & rating system
--
-- Rules:
--  • A client can leave at most ONE review per barber (uniq index).
--  • A client can only review if they have at least one booking
--    with status='done' against that barber (enforced via RLS).
--  • Author may edit/delete their own review (RLS).
--  • Anyone can read reviews (RLS).
--  • barbers.rating + barbers.reviews_count are kept in sync by
--    triggers so we don't have to aggregate at query time.
-- =============================================================

-- ------------------------------------------------------------
-- REVIEWS
-- ------------------------------------------------------------
create table if not exists reviews (
  id          uuid primary key default uuid_generate_v4(),
  barber_id   uuid not null references barbers(id)  on delete cascade,
  client_id   uuid not null references profiles(id) on delete cascade,
  rating      int  not null check (rating between 1 and 5),
  comment     text          check (comment is null or length(comment) <= 500),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (barber_id, client_id)
);

create index if not exists reviews_barber_id_created_at on reviews (barber_id, created_at desc);
create index if not exists reviews_client_id            on reviews (client_id);

alter table reviews enable row level security;

-- Public read
drop policy if exists "reviews_select" on reviews;
create policy "reviews_select" on reviews
  for select using (true);

-- A client can insert only their own review AND only if they have
-- at least one completed booking with this barber.
drop policy if exists "reviews_insert" on reviews;
create policy "reviews_insert" on reviews
  for insert with check (
    client_id = auth.uid()
    and exists (
      select 1 from bookings
      where bookings.client_id = auth.uid()
        and bookings.barber_id = reviews.barber_id
        and bookings.status    = 'done'
    )
  );

-- Author may edit their own review
drop policy if exists "reviews_update" on reviews;
create policy "reviews_update" on reviews
  for update using (client_id = auth.uid())
  with check (client_id = auth.uid());

-- Author may delete their own review
drop policy if exists "reviews_delete" on reviews;
create policy "reviews_delete" on reviews
  for delete using (client_id = auth.uid());

-- ------------------------------------------------------------
-- Keep barbers.rating + barbers.reviews_count in sync
-- ------------------------------------------------------------
alter table barbers add column if not exists reviews_count int not null default 0;

create or replace function recompute_barber_rating(target_barber uuid)
returns void language sql as $$
  update barbers b
     set rating        = coalesce((select avg(rating)::float8 from reviews where barber_id = target_barber), 0),
         reviews_count = (select count(*) from reviews where barber_id = target_barber)
   where b.id = target_barber;
$$;

create or replace function handle_review_change()
returns trigger language plpgsql security definer as $$
begin
  if (tg_op = 'INSERT') then
    perform recompute_barber_rating(new.barber_id);
  elsif (tg_op = 'UPDATE') then
    -- rating may have changed (or barber_id, defensively)
    perform recompute_barber_rating(new.barber_id);
    if old.barber_id is distinct from new.barber_id then
      perform recompute_barber_rating(old.barber_id);
    end if;
    new.updated_at = now();
  elsif (tg_op = 'DELETE') then
    perform recompute_barber_rating(old.barber_id);
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists on_review_change on reviews;
create trigger on_review_change
  after insert or update or delete on reviews
  for each row execute procedure handle_review_change();

-- updated_at touch on plain UPDATE (the AFTER trigger above ran too late
-- for column assignment; use a BEFORE trigger so the column reflects it).
create or replace function touch_review_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_review_touch on reviews;
create trigger on_review_touch
  before update on reviews
  for each row execute procedure touch_review_updated_at();
