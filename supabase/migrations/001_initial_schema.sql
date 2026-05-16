-- =============================================================
-- CutBook – initial schema
-- Run in order in the Supabase SQL editor (or via supabase db push)
-- =============================================================

-- ------------------------------------------------------------
-- Extensions
-- ------------------------------------------------------------
create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------
-- PROFILES
-- One row per authenticated user, created automatically by trigger.
-- ------------------------------------------------------------
create table if not exists profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  role         text not null default 'client' check (role in ('client', 'barber')),
  display_name text,
  avatar_url   text,
  bio          text,
  lat          double precision,
  lng          double precision,
  created_at   timestamptz not null default now()
);

-- Auto-create a profile when a new user signs up
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ------------------------------------------------------------
-- BARBERS
-- 1-to-1 extension of profiles for users who are barbers.
-- ------------------------------------------------------------
create table if not exists barbers (
  id              uuid primary key default uuid_generate_v4(),
  profile_id      uuid not null unique references profiles(id) on delete cascade,
  shop_name       text,
  city            text,
  specialties     text,
  rating          double precision not null default 0,
  followers_count int not null default 0,
  created_at      timestamptz not null default now()
);

-- When a barbers row is inserted, flip the profile role to 'barber'
create or replace function handle_new_barber()
returns trigger language plpgsql security definer as $$
begin
  update public.profiles set role = 'barber' where id = new.profile_id;
  return new;
end;
$$;

drop trigger if exists on_barber_created on barbers;
create trigger on_barber_created
  after insert on barbers
  for each row execute procedure handle_new_barber();

-- ------------------------------------------------------------
-- POSTS
-- Photos published by barbers.
-- ------------------------------------------------------------
create table if not exists posts (
  id          uuid primary key default uuid_generate_v4(),
  barber_id   uuid not null references barbers(id) on delete cascade,
  image_url   text not null,
  caption     text,
  likes_count int not null default 0,
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- FOLLOWS
-- Clients follow barbers.
-- ------------------------------------------------------------
create table if not exists follows (
  follower_id uuid not null references profiles(id) on delete cascade,
  barber_id   uuid not null references barbers(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, barber_id)
);

-- Keep barbers.followers_count in sync
create or replace function handle_follow_change()
returns trigger language plpgsql security definer as $$
begin
  if (tg_op = 'INSERT') then
    update barbers set followers_count = followers_count + 1 where id = new.barber_id;
  elsif (tg_op = 'DELETE') then
    update barbers set followers_count = followers_count - 1 where id = old.barber_id;
  end if;
  return null;
end;
$$;

drop trigger if exists on_follow_change on follows;
create trigger on_follow_change
  after insert or delete on follows
  for each row execute procedure handle_follow_change();

-- ------------------------------------------------------------
-- LIKES
-- Users like posts.
-- ------------------------------------------------------------
create table if not exists likes (
  user_id    uuid not null references profiles(id) on delete cascade,
  post_id    uuid not null references posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

-- Keep posts.likes_count in sync
create or replace function handle_like_change()
returns trigger language plpgsql security definer as $$
begin
  if (tg_op = 'INSERT') then
    update posts set likes_count = likes_count + 1 where id = new.post_id;
  elsif (tg_op = 'DELETE') then
    update posts set likes_count = likes_count - 1 where id = old.post_id;
  end if;
  return null;
end;
$$;

drop trigger if exists on_like_change on likes;
create trigger on_like_change
  after insert or delete on likes
  for each row execute procedure handle_like_change();

-- ------------------------------------------------------------
-- AVAILABILITY
-- Weekly recurring time windows a barber is open.
-- day_of_week: 0 = Sunday … 6 = Saturday
-- ------------------------------------------------------------
create table if not exists availability (
  id          uuid primary key default uuid_generate_v4(),
  barber_id   uuid not null references barbers(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6),
  start_time  time not null,
  end_time    time not null,
  check (end_time > start_time),
  unique (barber_id, day_of_week)
);

-- ------------------------------------------------------------
-- BOOKINGS
-- A client books a specific slot with a barber.
-- status: pending → confirmed → done | cancelled
-- ------------------------------------------------------------
create table if not exists bookings (
  id         uuid primary key default uuid_generate_v4(),
  client_id  uuid not null references profiles(id) on delete cascade,
  barber_id  uuid not null references barbers(id) on delete cascade,
  date       date not null,
  time_slot  time not null,
  status     text not null default 'pending'
               check (status in ('pending', 'confirmed', 'done', 'cancelled')),
  created_at timestamptz not null default now(),
  unique (barber_id, date, time_slot, status)
    deferrable initially deferred
);

-- Prevent double-booking at DB level
create unique index if not exists bookings_no_double
  on bookings (barber_id, date, time_slot)
  where status not in ('cancelled');

-- ------------------------------------------------------------
-- INDEXES
-- ------------------------------------------------------------
create index if not exists posts_barber_id_created_at on posts (barber_id, created_at desc);
create index if not exists bookings_client_id          on bookings (client_id);
create index if not exists bookings_barber_id_date     on bookings (barber_id, date);
create index if not exists follows_barber_id           on follows (barber_id);

-- ------------------------------------------------------------
-- ROW-LEVEL SECURITY
-- ------------------------------------------------------------
alter table profiles    enable row level security;
alter table barbers     enable row level security;
alter table posts       enable row level security;
alter table follows     enable row level security;
alter table likes       enable row level security;
alter table availability enable row level security;
alter table bookings    enable row level security;

-- PROFILES
create policy "profiles_select" on profiles
  for select using (true);

create policy "profiles_update" on profiles
  for update using (id = auth.uid());

-- BARBERS
create policy "barbers_select" on barbers
  for select using (true);

create policy "barbers_insert" on barbers
  for insert with check (profile_id = auth.uid());

create policy "barbers_update" on barbers
  for update using (profile_id = auth.uid());

-- POSTS: anyone can read, only the owning barber can write
create policy "posts_select" on posts
  for select using (true);

create policy "posts_insert" on posts
  for insert with check (
    barber_id = (select id from barbers where profile_id = auth.uid())
  );

create policy "posts_update" on posts
  for update using (
    barber_id = (select id from barbers where profile_id = auth.uid())
  );

create policy "posts_delete" on posts
  for delete using (
    barber_id = (select id from barbers where profile_id = auth.uid())
  );

-- FOLLOWS
create policy "follows_select" on follows
  for select using (true);

create policy "follows_insert" on follows
  for insert with check (follower_id = auth.uid());

create policy "follows_delete" on follows
  for delete using (follower_id = auth.uid());

-- LIKES
create policy "likes_select" on likes
  for select using (true);

create policy "likes_insert" on likes
  for insert with check (user_id = auth.uid());

create policy "likes_delete" on likes
  for delete using (user_id = auth.uid());

-- AVAILABILITY: public read, owning barber manages
create policy "availability_select" on availability
  for select using (true);

create policy "availability_write" on availability
  for all using (
    barber_id = (select id from barbers where profile_id = auth.uid())
  );

-- BOOKINGS: clients see own rows, barbers see incoming
create policy "bookings_client_select" on bookings
  for select using (client_id = auth.uid());

create policy "bookings_barber_select" on bookings
  for select using (
    barber_id = (select id from barbers where profile_id = auth.uid())
  );

create policy "bookings_insert" on bookings
  for insert with check (client_id = auth.uid());

create policy "bookings_cancel" on bookings
  for update using (
    client_id = auth.uid()
    or barber_id = (select id from barbers where profile_id = auth.uid())
  );
