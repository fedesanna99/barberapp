-- =============================================================
-- Fix: comment counters were silently no-op due to RLS.
--
-- The bump_post_comments / bump_comment_likes functions from
-- migration 022 ran with the caller's privileges. The caller is
-- the authenticated user inserting/deleting a comment or a
-- comment_like — they have no UPDATE policy on `comments` or
-- `posts`, so the trigger's UPDATE silently affected 0 rows
-- (RLS filters them out without raising an error).
--
-- Net effect users saw: liking a comment briefly bumped the
-- counter optimistically in the UI, but on the next fetch the
-- DB value was still the original (0 for likes_count, stale for
-- comments_count). Heart colour was preserved (comment_likes row
-- exists), only the *count* was lost — exactly what
-- migration 001's handle_like_change avoided by using
-- `security definer`.
--
-- Fix: recreate both functions with `security definer`, matching
-- the existing pattern on posts.likes_count.
-- =============================================================

create or replace function bump_post_comments()
returns trigger language plpgsql security definer as $$
begin
  if (tg_op = 'INSERT') then
    update posts set comments_count = comments_count + 1 where id = new.post_id;
  elsif (tg_op = 'DELETE') then
    update posts set comments_count = greatest(comments_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;

create or replace function bump_comment_likes()
returns trigger language plpgsql security definer as $$
begin
  if (tg_op = 'INSERT') then
    update comments set likes_count = likes_count + 1 where id = new.comment_id;
  elsif (tg_op = 'DELETE') then
    update comments set likes_count = greatest(likes_count - 1, 0) where id = old.comment_id;
  end if;
  return null;
end;
$$;

-- Backfill counters that may have drifted while the functions were
-- broken. Safe to run anytime — recomputes from the source-of-truth
-- tables. Anyone touched between migration 022 and this fix had
-- their counters stuck at the initial default.
update comments c
   set likes_count = coalesce(sub.cnt, 0)
  from (select comment_id, count(*) as cnt from comment_likes group by comment_id) sub
 where sub.comment_id = c.id;

update comments c
   set likes_count = 0
 where not exists (select 1 from comment_likes l where l.comment_id = c.id);

update posts p
   set comments_count = coalesce(sub.cnt, 0)
  from (select post_id, count(*) as cnt from comments group by post_id) sub
 where sub.post_id = p.id;

update posts p
   set comments_count = 0
 where not exists (select 1 from comments c where c.post_id = p.id);
