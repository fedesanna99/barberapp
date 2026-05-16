-- Add style label to posts (e.g. "Skin fade + line up")
alter table posts add column if not exists label text;
