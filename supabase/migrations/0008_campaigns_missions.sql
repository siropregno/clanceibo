-- Run this once in the Supabase SQL Editor, after 0007_fix_private_schema_usage.sql.
-- Adds the campaign / mission model:
--
--   campaigns       - a named series of missions, with a badge image
--   missions        - one game night, always inside a campaign
--   campaign_titles - the campaign badge a player has been granted
--
-- Design notes, so the constraints below are not mistaken for arbitrary choices:
--
-- * missions.campaign_id is NOT NULL. Every mission belongs to a campaign;
--   there are no loose one-off missions in this model.
--
-- * Attendance is NOT tracked. There is deliberately no per-mission record
--   of who was present. Admins already know who played, and asking them to
--   tick a roster after every night is exactly the mandatory-upkeep this
--   feature is meant to avoid. campaign_titles is the only record kept, and
--   an admin grants it directly to whoever earned it.
--
-- * Writes on all three tables are admin-only. A campaign badge is a record
--   kept BY the clan leadership ABOUT its members, so a player must never be
--   able to grant their own. Reads are public: the roster, profiles and the
--   campaigns page are all visible to anonymous visitors today, and this
--   data follows that.
--
-- * private.is_admin() (not public.is_admin, dropped in 0006) is the admin
--   check, matching every policy written since 0006.

-- ── campaigns ──────────────────────────────────────────────────────────

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descripcion text,
  badge_url text,
  badge_path text,
  fecha_inicio date,
  fecha_fin date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- badge_url is the image shown on a player's profile once they are granted
-- this campaign, alongside the aptitude hexagons. Nullable: a campaign can
-- be created before its artwork exists. badge_path is the Storage object
-- path, kept so the file can be removed when the campaign is deleted -
-- getPublicUrl() is not reversible into a path.

drop trigger if exists trg_campaigns_set_updated_at on public.campaigns;
create trigger trg_campaigns_set_updated_at
  before update on public.campaigns
  for each row execute function public.set_updated_at();

-- ── missions ───────────────────────────────────────────────────────────

create table if not exists public.missions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  titulo text not null,
  fecha date not null,
  descripcion text,
  mapa text,
  imagen_url text,
  imagen_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Deleting a campaign deletes its missions and, via the cascade on
-- campaign_titles below, the badges granted for it. That is intended: a
-- campaign is the top of this tree and removing it removes the branch.

create index if not exists missions_campaign_id_idx
  on public.missions (campaign_id);

create index if not exists missions_fecha_idx
  on public.missions (fecha desc);

drop trigger if exists trg_missions_set_updated_at on public.missions;
create trigger trg_missions_set_updated_at
  before update on public.missions
  for each row execute function public.set_updated_at();

-- ── campaign_titles ────────────────────────────────────────────────────

create table if not exists public.campaign_titles (
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  granted_at timestamptz not null default now(),
  primary key (campaign_id, player_id)
);

-- The composite primary key is the uniqueness guarantee: a player cannot be
-- granted the same campaign badge twice, so the profile can render this
-- straight without dedup.

create index if not exists campaign_titles_player_id_idx
  on public.campaign_titles (player_id);

-- ── RLS: public read, admin write ──────────────────────────────────────

alter table public.campaigns enable row level security;
alter table public.missions enable row level security;
alter table public.campaign_titles enable row level security;

-- Reads. Anonymous visitors see the campaigns page and player profiles, so
-- all three tables are readable by anon and authenticated alike, matching
-- players_select_public and screenshots_select_public.

drop policy if exists "campaigns_select_public" on public.campaigns;
create policy "campaigns_select_public"
  on public.campaigns for select to anon, authenticated using (true);

drop policy if exists "missions_select_public" on public.missions;
create policy "missions_select_public"
  on public.missions for select to anon, authenticated using (true);

drop policy if exists "campaign_titles_select_public" on public.campaign_titles;
create policy "campaign_titles_select_public"
  on public.campaign_titles for select to anon, authenticated using (true);

-- Writes. Admin-only on every table, every verb. Written as one policy per
-- (table, verb) rather than `for all` so the intent is greppable and a
-- future change to one verb cannot silently widen the others.
--
-- UPDATE needs both using and with check: `using` decides which rows the
-- statement may target, `with check` validates the resulting row. Omitting
-- the latter would let an admin-authored UPDATE produce a row that no
-- longer passes the policy.

drop policy if exists "campaigns_admin_insert" on public.campaigns;
create policy "campaigns_admin_insert"
  on public.campaigns for insert to authenticated
  with check (private.is_admin(auth.uid()));

drop policy if exists "campaigns_admin_update" on public.campaigns;
create policy "campaigns_admin_update"
  on public.campaigns for update to authenticated
  using (private.is_admin(auth.uid()))
  with check (private.is_admin(auth.uid()));

drop policy if exists "campaigns_admin_delete" on public.campaigns;
create policy "campaigns_admin_delete"
  on public.campaigns for delete to authenticated
  using (private.is_admin(auth.uid()));

drop policy if exists "missions_admin_insert" on public.missions;
create policy "missions_admin_insert"
  on public.missions for insert to authenticated
  with check (private.is_admin(auth.uid()));

drop policy if exists "missions_admin_update" on public.missions;
create policy "missions_admin_update"
  on public.missions for update to authenticated
  using (private.is_admin(auth.uid()))
  with check (private.is_admin(auth.uid()));

drop policy if exists "missions_admin_delete" on public.missions;
create policy "missions_admin_delete"
  on public.missions for delete to authenticated
  using (private.is_admin(auth.uid()));

drop policy if exists "campaign_titles_admin_insert" on public.campaign_titles;
create policy "campaign_titles_admin_insert"
  on public.campaign_titles for insert to authenticated
  with check (private.is_admin(auth.uid()));

drop policy if exists "campaign_titles_admin_delete" on public.campaign_titles;
create policy "campaign_titles_admin_delete"
  on public.campaign_titles for delete to authenticated
  using (private.is_admin(auth.uid()));

-- No UPDATE policy on campaign_titles: (campaign_id, player_id) is the
-- whole table apart from a timestamp, and both columns are the primary key.
-- Moving a badge to a different player is a delete plus an insert, not an
-- update, so UPDATE is default-denied.

-- ── Storage bucket for campaign badges and mission covers ──────────────
-- Public bucket, same as avatars and screenshots: the client only ever
-- builds URLs with getPublicUrl(), which is a pure string builder and does
-- not consult RLS.
--
-- Deliberately NO select policy on storage.objects, matching the drops in
-- 0006. A public bucket serves its objects without checking RLS, and adding
-- a select policy would only enable storage.from('campaigns').list(),
-- letting anyone enumerate every uploaded file including orphans.
--
-- Writes are admin-gated. This differs from avatars/screenshots, which use
-- the owner-writes-their-own-folder pattern ((storage.foldername(name))[1]
-- = auth.uid()::text). That pattern does not apply here: these images
-- belong to a campaign or mission, not to a player, so the folder is the
-- campaign/mission id and the check is on the writer's admin flag.

insert into storage.buckets (id, name, public)
values ('campaigns', 'campaigns', true)
on conflict (id) do nothing;

drop policy if exists "campaigns_bucket_admin_write" on storage.objects;
create policy "campaigns_bucket_admin_write"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'campaigns' and private.is_admin(auth.uid()));

drop policy if exists "campaigns_bucket_admin_update" on storage.objects;
create policy "campaigns_bucket_admin_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'campaigns' and private.is_admin(auth.uid()))
  with check (bucket_id = 'campaigns' and private.is_admin(auth.uid()));

-- UPDATE is needed here (unlike on the attendance tables) because uploads
-- use upsert: true when an admin replaces a badge, and an upsert that hits
-- an existing object is an UPDATE on storage.objects.

drop policy if exists "campaigns_bucket_admin_delete" on storage.objects;
create policy "campaigns_bucket_admin_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'campaigns' and private.is_admin(auth.uid()));

-- ── Verify (optional, run manually) ────────────────────────────────────
-- 1. RLS is on for all three tables. Expect three rows, all rowsecurity = t:
--
--    select relname, relrowsecurity from pg_class
--    where relname in ('campaigns','missions','campaign_titles');
--
-- 2. A non-admin cannot grant themselves a badge. Signed in as a normal
--    member, this must fail with a row-level security violation:
--
--    insert into public.campaign_titles (campaign_id, player_id)
--    values ('<some-campaign-id>', auth.uid());
--
-- 3. A non-admin cannot create a campaign or a mission. Same expectation:
--
--    insert into public.campaigns (titulo) values ('test');
--
-- 4. Reads work anonymously. With the anon key and no session, the
--    campaigns page must still list campaigns and their missions.
