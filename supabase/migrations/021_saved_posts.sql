-- =============================================================
-- Persist the bookmark (ti-bookmark) toggle on Feed posts. Until
-- now this lived only in client state and was lost on every reload.
-- Modeled on the `likes` table from 001_initial_schema (same shape
-- minus the counter trigger — we don't show a "saves" count anywhere).
--
-- post_id is intentionally NOT a foreign key: posts can come from
-- either the `posts` table (barber posts) or `user_posts` (client
-- posts). Cross-table FK isn't worth the complexity; orphan rows
-- (where the underlying post has been deleted) are simply invisible
-- because the Feed filter is `feed.posts.filter(p => savedIds.has(p.id))`.
-- =============================================================

create table if not exists saved_posts (
  user_id    uuid not null references profiles(id) on delete cascade,
  post_id    uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create index if not exists saved_posts_user_id on saved_posts (user_id);

alter table saved_posts enable row level security;

create policy "saved_posts_select" on saved_posts
  for select using (user_id = auth.uid());

create policy "saved_posts_insert" on saved_posts
  for insert with check (user_id = auth.uid());

create policy "saved_posts_delete" on saved_posts
  for delete using (user_id = auth.uid());
