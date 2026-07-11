-- Run this once in the Supabase SQL Editor, after 0001_players.sql and
-- 0002_avatars.sql. Adds a per-player screenshot gallery: a table (one row
-- per screenshot) plus a public "screenshots" Storage bucket, following the
-- same owner-writes-their-own-folder pattern as avatars.

create table if not exists public.player_screenshots (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  storage_path text not null,
  image_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists player_screenshots_player_id_idx
  on public.player_screenshots (player_id);

alter table public.player_screenshots enable row level security;

create policy "screenshots_select_public"
  on public.player_screenshots for select
  to anon, authenticated
  using (true);

create policy "screenshots_owner_or_admin_insert"
  on public.player_screenshots for insert
  to authenticated
  with check (player_id = auth.uid() or public.is_admin(auth.uid()));

create policy "screenshots_owner_or_admin_delete"
  on public.player_screenshots for delete
  to authenticated
  using (player_id = auth.uid() or public.is_admin(auth.uid()));

insert into storage.buckets (id, name, public)
values ('screenshots', 'screenshots', true)
on conflict (id) do nothing;

drop policy if exists "screenshots_bucket_public_read" on storage.objects;
create policy "screenshots_bucket_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'screenshots');

drop policy if exists "screenshots_bucket_owner_write" on storage.objects;
create policy "screenshots_bucket_owner_write"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'screenshots' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "screenshots_bucket_owner_delete" on storage.objects;
create policy "screenshots_bucket_owner_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'screenshots' and (storage.foldername(name))[1] = auth.uid()::text);
