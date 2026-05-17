-- H3: Enable realtime replication on bookings so postgres_changes subscriptions fire.
-- replica identity full is required for UPDATE payloads to include the old row.
alter table bookings replica identity full;
alter publication supabase_realtime add table bookings;
