-- Run this once in the Supabase SQL Editor, after 0008_campaigns_missions.sql.
-- Two changes to the campaign model:
--
--   1. Drops the date columns  - campaigns.fecha_inicio, campaigns.fecha_fin,
--                                missions.fecha
--   2. Adds campaigns.autor    - who wrote/ran the campaign, free text
--
-- Dates were not carrying their weight in the UI, and filling three of them
-- per campaign was upkeep for something nobody read. They can come back
-- later as a new migration if that changes.
--
-- This is a DESTRUCTIVE change: the values in those columns are gone once
-- this runs, and `drop column` cannot be undone by a later `add column`.
-- 0008 is already applied in production, so this is written as a forward
-- migration rather than an edit to 0008 - that file is a record of what was
-- actually run, and rewriting it would leave the repo describing a schema
-- the database never had.

-- ── Ordering has to be replaced before the columns go ──────────────────
-- Two orderings depended on these columns:
--
--   * The campaign list ordered by fecha_inicio desc (newest campaign
--     first). Now ordered by created_at desc, which is the closest honest
--     substitute: the order campaigns were added.
--
--   * Missions within a campaign sorted by fecha ascending (oldest first,
--     so a campaign read chronologically). Now sorted by created_at
--     ascending, i.e. the order the admin entered them - which for a
--     campaign written up after the fact is the same chronological order.
--
-- Both orderings live in src/lib/campaigns.js, not in the database, so no
-- index or view here depends on them. The indexes below are the only
-- database objects that do.

-- missions_fecha_idx exists solely to serve the old date ordering. Dropping
-- the column would drop the index implicitly, but doing it explicitly keeps
-- this migration self-documenting.
drop index if exists public.missions_fecha_idx;

-- Ordering by created_at instead. Without these, both orderings fall back to
-- a sequential scan plus sort on every page load.
create index if not exists missions_created_at_idx
  on public.missions (created_at);

create index if not exists campaigns_created_at_idx
  on public.campaigns (created_at desc);

-- ── Drop the columns ───────────────────────────────────────────────────
-- No `cascade`: if anything unexpected still references these (a view, a
-- constraint, a policy added outside this repo), this errors out loudly
-- instead of silently deleting it.

alter table public.campaigns
  drop column if exists fecha_inicio,
  drop column if exists fecha_fin;

alter table public.missions
  drop column if exists fecha;

-- ── Add the campaign author ────────────────────────────────────────────
-- Free text, not a reference to players.id. The author of a campaign is
-- often not a registered member of the site (a guest game master, a group
-- credit like "Comando 601", someone who left), and forcing it through a
-- foreign key would make those cases unrepresentable. Nullable for the same
-- reason a badge is: a campaign can exist before its author is decided.

alter table public.campaigns
  add column if not exists autor text;

-- ── Verify (optional, run manually) ────────────────────────────────────
-- 1. The columns are gone. Expect 0 rows:
--
--    select table_name, column_name
--    from information_schema.columns
--    where table_schema = 'public'
--      and (table_name, column_name) in
--          (values ('campaigns','fecha_inicio'), ('campaigns','fecha_fin'),
--                  ('missions','fecha'));
--
-- 2. The new indexes exist. Expect two rows:
--
--    select indexname from pg_indexes
--    where schemaname = 'public'
--      and indexname in ('missions_created_at_idx', 'campaigns_created_at_idx');
--
-- 3. autor exists and is nullable. Expect one row, is_nullable = YES:
--
--    select column_name, data_type, is_nullable
--    from information_schema.columns
--    where table_schema = 'public' and table_name = 'campaigns'
--      and column_name = 'autor';
--
-- 4. End-to-end: /campanas still lists campaigns, and opening one still
--    lists its missions in the order they were created.
