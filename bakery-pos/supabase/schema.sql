-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)

create table if not exists app_state (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Insert the initial empty row so the app always has something to load
insert into app_state (id, data)
values ('bakery_main', '{}'::jsonb)
on conflict (id) do nothing;

-- Allow public read/write (the app has no login — lock this down later if needed)
alter table app_state enable row level security;

create policy "allow all" on app_state
  for all using (true) with check (true);
