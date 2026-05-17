alter table availability
  add column if not exists break_start time,
  add column if not exists break_end   time;
