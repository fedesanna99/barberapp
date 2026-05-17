-- =============================================================
-- Split availability_write (FOR ALL USING only) into separate
-- INSERT / UPDATE / DELETE policies with WITH CHECK. Today the
-- single policy is not exploitable because barber_id wouldn't
-- match auth.uid() for a foreign barber, but FOR ALL + USING
-- without WITH CHECK is fragile: any future schema change that
-- adds a writable field could enable reassignment via UPDATE.
-- Explicit per-op policies + WITH CHECK make the intent obvious.
-- =============================================================

drop policy if exists "availability_write"  on availability;
drop policy if exists "availability_insert" on availability;
drop policy if exists "availability_update" on availability;
drop policy if exists "availability_delete" on availability;

create policy "availability_insert" on availability
  for insert
  with check (
    barber_id = (select id from barbers where profile_id = auth.uid())
  );

create policy "availability_update" on availability
  for update
  using      (barber_id = (select id from barbers where profile_id = auth.uid()))
  with check (barber_id = (select id from barbers where profile_id = auth.uid()));

create policy "availability_delete" on availability
  for delete
  using (
    barber_id = (select id from barbers where profile_id = auth.uid())
  );
