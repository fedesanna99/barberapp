-- Storage bucket creation (idempotent)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('posts', 'posts', true)
on conflict (id) do nothing;

-- ── AVATARS ──────────────────────────────────────────────────────────────────
-- Path pattern: {userId}/avatar.jpg

create policy "avatar_select" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatar_insert" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatar_update" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatar_delete" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── POSTS ─────────────────────────────────────────────────────────────────────
-- Barber posts path : {barberId}/{uuid}.jpg
-- User posts path   : users/{userId}/{uuid}.jpg

create policy "posts_obj_select" on storage.objects
  for select using (bucket_id = 'posts');

create policy "posts_obj_insert" on storage.objects
  for insert with check (
    bucket_id = 'posts'
    and auth.role() = 'authenticated'
    and (
      -- user post: users/{userId}/...
      (
        (storage.foldername(name))[1] = 'users'
        and (storage.foldername(name))[2] = auth.uid()::text
      )
      or
      -- barber post: {barberId}/... — verify caller owns that barber row
      (
        (storage.foldername(name))[1] != 'users'
        and exists (
          select 1 from public.barbers
          where id::text = (storage.foldername(name))[1]
            and profile_id = auth.uid()
        )
      )
    )
  );

create policy "posts_obj_delete" on storage.objects
  for delete using (
    bucket_id = 'posts'
    and auth.role() = 'authenticated'
    and (
      (
        (storage.foldername(name))[1] = 'users'
        and (storage.foldername(name))[2] = auth.uid()::text
      )
      or
      (
        (storage.foldername(name))[1] != 'users'
        and exists (
          select 1 from public.barbers
          where id::text = (storage.foldername(name))[1]
            and profile_id = auth.uid()
        )
      )
    )
  );
