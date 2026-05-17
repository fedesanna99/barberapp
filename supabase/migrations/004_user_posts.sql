-- Client (user) posts: photos users share of their own cuts
create table user_posts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  image_url    text not null,
  caption      text,
  label        text,
  likes_count  integer not null default 0,
  created_at   timestamptz not null default now()
);

create index user_posts_user_id_created_at on user_posts (user_id, created_at desc);

alter table user_posts enable row level security;

create policy "user_posts_select" on user_posts
  for select using (true);

create policy "user_posts_insert" on user_posts
  for insert with check (user_id = auth.uid());

create policy "user_posts_update" on user_posts
  for update using (user_id = auth.uid());

create policy "user_posts_delete" on user_posts
  for delete using (user_id = auth.uid());
