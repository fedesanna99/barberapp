-- Allow all authenticated users to read all barber rows.
-- Without this, the posts JOIN barbers in the feed filters out other barbers' posts.
drop policy if exists "barbers_select" on barbers;
create policy "barbers_select" on barbers
  for select using (true);
