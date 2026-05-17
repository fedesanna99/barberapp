-- =============================================================
-- Fix: signing up with role='barber' did not create a barbers row.
-- Register.tsx passes { full_name, role } in raw_user_meta_data,
-- but the original handle_new_user trigger ignored role and only
-- inserted profiles. handle_new_barber (in 001) flips
-- profiles.role to 'barber' on INSERT into barbers — but nothing
-- ever inserted into barbers. Result: a "barber" signup stayed as
-- role='client' forever.
--
-- This migration extends handle_new_user to also insert a barbers
-- row when metadata.role = 'barber'. The handle_new_barber trigger
-- then flips profiles.role automatically.
-- =============================================================

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  metadata_role text;
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'avatar_url'
  );

  metadata_role := new.raw_user_meta_data->>'role';
  if metadata_role = 'barber' then
    insert into public.barbers (profile_id) values (new.id);
  end if;

  return new;
end;
$$;
