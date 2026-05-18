-- =============================================================
-- Persistent comments on barber posts, with per-comment likes.
-- Until now these lived only in `useState` in Feed.tsx and reset
-- on every reload (see SEED_COMMENTS).
--
-- Delete authorization matches the UX: the comment author can
-- delete their own comment, AND the owner of the post can delete
-- any comment on their post (matches Instagram/Facebook).
--
-- `comments.likes_count` and `posts.comments_count` are maintained
-- by triggers so the Feed list can render counts without an
-- aggregate query per post.
-- =============================================================

-- ------------------------------------------------------------
-- COMMENTS
-- ------------------------------------------------------------
create table if not exists comments (
  id          uuid primary key default uuid_generate_v4(),
  post_id     uuid not null references posts(id) on delete cascade,
  author_id   uuid not null references profiles(id) on delete cascade,
  content     text not null check (length(content) > 0 and length(content) <= 500),
  likes_count int  not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists comments_post_id_created_at on comments (post_id, created_at);
create index if not exists comments_author_id on comments (author_id);

alter table comments enable row level security;

drop policy if exists "comments_select" on comments;
create policy "comments_select" on comments
  for select using (true);

drop policy if exists "comments_insert" on comments;
create policy "comments_insert" on comments
  for insert with check (author_id = auth.uid());

drop policy if exists "comments_delete" on comments;
create policy "comments_delete" on comments
  for delete using (
    author_id = auth.uid()
    or exists (
      select 1 from posts p
      join barbers b on b.id = p.barber_id
      where p.id = comments.post_id
        and b.profile_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- COMMENT_LIKES (anyone authenticated can like)
-- ------------------------------------------------------------
create table if not exists comment_likes (
  user_id    uuid not null references profiles(id) on delete cascade,
  comment_id uuid not null references comments(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, comment_id)
);

create index if not exists comment_likes_comment_id on comment_likes (comment_id);

alter table comment_likes enable row level security;

drop policy if exists "comment_likes_select" on comment_likes;
create policy "comment_likes_select" on comment_likes
  for select using (true);

drop policy if exists "comment_likes_insert" on comment_likes;
create policy "comment_likes_insert" on comment_likes
  for insert with check (user_id = auth.uid());

drop policy if exists "comment_likes_delete" on comment_likes;
create policy "comment_likes_delete" on comment_likes
  for delete using (user_id = auth.uid());

-- ------------------------------------------------------------
-- Counter triggers
-- ------------------------------------------------------------
alter table posts add column if not exists comments_count int not null default 0;

create or replace function bump_post_comments() returns trigger language plpgsql as $$
begin
  if (tg_op = 'INSERT') then
    update posts set comments_count = comments_count + 1 where id = new.post_id;
  elsif (tg_op = 'DELETE') then
    update posts set comments_count = greatest(comments_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;

drop trigger if exists comments_count_bump on comments;
create trigger comments_count_bump
  after insert or delete on comments
  for each row execute procedure bump_post_comments();

create or replace function bump_comment_likes() returns trigger language plpgsql as $$
begin
  if (tg_op = 'INSERT') then
    update comments set likes_count = likes_count + 1 where id = new.comment_id;
  elsif (tg_op = 'DELETE') then
    update comments set likes_count = greatest(likes_count - 1, 0) where id = old.comment_id;
  end if;
  return null;
end;
$$;

drop trigger if exists comment_likes_count_bump on comment_likes;
create trigger comment_likes_count_bump
  after insert or delete on comment_likes
  for each row execute procedure bump_comment_likes();
