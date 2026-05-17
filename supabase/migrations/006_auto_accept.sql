alter table barbers
  add column if not exists auto_accept boolean not null default false;
