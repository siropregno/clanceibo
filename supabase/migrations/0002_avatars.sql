-- Run this once in the Supabase SQL Editor, after 0001_players.sql.
-- Adds a player-editable avatar_url column and a public "avatars" Storage
-- bucket where each player can only write inside their own folder
-- (avatars/{user_id}/...), matching the standard Supabase per-user storage
-- pattern.

alter table public.players add column if not exists avatar_url text;

-- avatar_url is intentionally NOT added to protect_admin_fields()'s clamp
-- list: players manage their own photo the same way they manage nombre and
-- rol_favorito, and admins can still overwrite it since is_admin() bypasses
-- the clamp entirely.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'avatars');

drop policy if exists "avatars_owner_write" on storage.objects;
create policy "avatars_owner_write"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_owner_update" on storage.objects;
create policy "avatars_owner_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_owner_delete" on storage.objects;
create policy "avatars_owner_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
