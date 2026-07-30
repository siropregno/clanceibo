-- Run this once in the Supabase SQL Editor, after 0005_new_aptitudes.sql.
-- Clears the Supabase database linter security warnings:
--
--   0025_public_bucket_allows_listing        (avatars, screenshots)
--   0028_anon_security_definer_function_executable        (is_admin, handle_new_user)
--   0029_authenticated_security_definer_function_executable (is_admin, handle_new_user)
--
-- Nothing here changes application behaviour. See the notes on each section
-- for why each change is safe given how src/ actually calls Supabase.

-- ── 1. Stop the public buckets from being listable ─────────────────────
-- The SELECT policies on storage.objects were never needed. A *public*
-- bucket serves objects over /storage/v1/object/public/<bucket>/<path>
-- without consulting RLS at all, and the client only ever builds those URLs
-- with getPublicUrl() - a pure string builder that makes no network call
-- (see avatarupload.jsx:44 and screenshotupload.jsx:29). What the policies
-- DID enable is storage.from(b).list(), letting anyone enumerate every
-- file in both buckets - i.e. the full set of member avatars and
-- screenshots, including any orphaned uploads no longer referenced by a
-- players / player_screenshots row.
--
-- Grepped for .list( and createSignedUrl across src/ before dropping these:
-- there are no callers, so removing read access costs the app nothing.

drop policy if exists "avatars_public_read" on storage.objects;
drop policy if exists "screenshots_bucket_public_read" on storage.objects;

-- ── 2. Get the SECURITY DEFINER helpers out of the exposed API ─────────
-- PostgREST exposes every function in the `public` schema as an RPC
-- endpoint, so public.is_admin() and public.handle_new_user() were both
-- reachable at /rest/v1/rpc/... by anon and authenticated alike.
--
-- Neither is meant to be called by a client (grepped src/ for .rpc(): no
-- callers at all). They exist purely as internals:
--   * is_admin()          - called by RLS policies and protect_admin_fields()
--   * handle_new_user()   - AFTER INSERT trigger on auth.users
--
-- The fix is to move them into a private schema that PostgREST does not
-- expose, rather than REVOKE EXECUTE on the public versions. REVOKE would
-- have broken the app: an RLS policy's expression is evaluated with the
-- privileges of the *invoking* role, so revoking EXECUTE from
-- `authenticated` would make players_update_self_or_admin throw
-- "permission denied for function is_admin" on every profile save.
-- Relocating keeps EXECUTE intact while removing the HTTP surface.

-- NOTE: the `revoke all on schema private` that was here broke every
-- profile save with "permission denied for schema private" - calling a
-- function needs USAGE on its schema as well as EXECUTE on the function.
-- Fixed in 0007_fix_private_schema_usage.sql; left visible here rather
-- than silently rewritten, since this file was already applied.
create schema if not exists private;
grant usage on schema private to postgres;

-- private.is_admin(): same body as public.is_admin(). Still SECURITY
-- DEFINER - that is load-bearing, not incidental. It lets the function read
-- players.is_admin while bypassing RLS, which is what stops
-- players_update_self_or_admin from recursing into the very table whose
-- policy is being evaluated.
create or replace function private.is_admin(uid uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select coalesce((select p.is_admin from public.players p where p.id = uid), false);
$$;

-- anon needs EXECUTE too: players_select_public is evaluated for anonymous
-- visitors, and admin checks run inside protect_admin_fields() on writes.
grant execute on function private.is_admin(uuid) to anon, authenticated;

create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.players (id, nombre, miembro_desde)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
    current_date
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ── 3. Repoint every caller at the private versions ────────────────────
-- Done before dropping the public ones so there is no window where a
-- signup trigger or an RLS policy references a function that is gone.

drop trigger if exists trg_auth_user_created on auth.users;
create trigger trg_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create or replace function public.protect_admin_fields()
returns trigger language plpgsql set search_path = public as $$
begin
  if auth.uid() is not null and not private.is_admin(auth.uid()) then
    new.miembro_desde            := old.miembro_desde;
    new.apt_tirador              := old.apt_tirador;
    new.apt_medico               := old.apt_medico;
    new.apt_mortero              := old.apt_mortero;
    new.apt_game_master          := old.apt_game_master;
    new.apt_paracaidismo         := old.apt_paracaidismo;
    new.apt_fuerzas_especiales   := old.apt_fuerzas_especiales;
    new.apt_peacekeeper          := old.apt_peacekeeper;
    new.is_admin                 := old.is_admin;
    new.is_active                := old.is_active;
  end if;
  return new;
end;
$$;

-- Policies can't be altered in place to swap the function reference, so
-- they get recreated. Bodies are otherwise identical to 0001/0003.
drop policy if exists "players_update_self_or_admin" on public.players;
create policy "players_update_self_or_admin"
  on public.players for update to authenticated
  using (auth.uid() = id or private.is_admin(auth.uid()))
  with check (auth.uid() = id or private.is_admin(auth.uid()));

drop policy if exists "screenshots_owner_or_admin_insert" on public.player_screenshots;
create policy "screenshots_owner_or_admin_insert"
  on public.player_screenshots for insert
  to authenticated
  with check (player_id = auth.uid() or private.is_admin(auth.uid()));

drop policy if exists "screenshots_owner_or_admin_delete" on public.player_screenshots;
create policy "screenshots_owner_or_admin_delete"
  on public.player_screenshots for delete
  to authenticated
  using (player_id = auth.uid() or private.is_admin(auth.uid()));

-- ── 4. Drop the now-unreferenced public versions ───────────────────────
-- Plain drop, not `cascade`: if anything still points at these, this
-- errors out loudly instead of silently deleting a policy or trigger.

drop function if exists public.handle_new_user();
drop function if exists public.is_admin(uuid);
