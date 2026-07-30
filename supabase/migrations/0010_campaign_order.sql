-- Run this once in the Supabase SQL Editor, after 0009_drop_campaign_dates.sql.
-- Gives campaigns an explicit, admin-controlled display order.
--
--   campaigns.orden  - integer position, ascending (0 first)
--
-- Until now the campaign list was ordered by created_at desc, i.e. the order
-- campaigns happened to be added. That is not something an admin can change
-- without deleting and re-creating a campaign, and the clan wants the list
-- to read in a chosen order (featured campaign first, chronological by the
-- in-fiction timeline, etc). So the order becomes data.
--
-- Why an integer column and not a linked list / fractional ranking:
--
-- * The number of campaigns is small (tens, not thousands) and only admins
--   reorder, one move at a time. A plain integer with adjacent swaps is
--   exact, needs no rebalancing pass, and is readable straight out of the
--   table. Fractional ranks (0.5, 0.25, ...) exist to avoid renumbering
--   under concurrent writers at scale - a cost this table will never pay,
--   in exchange for float precision drift it would actually suffer from.
--
-- * A swap touches exactly two rows and each is a single-column UPDATE, so
--   it fits the existing campaigns_admin_update policy with no new policy.
--
-- orden is NOT NULL with a default so no code path can produce a row that
-- sorts unpredictably. Deliberately NOT unique: a swap has to pass through
-- an intermediate state where two rows briefly share a value (the client
-- issues two separate UPDATEs, not one atomic statement), and a unique
-- constraint would reject the first of them. Ties are broken deterministically
-- by created_at in the query instead - see src/lib/campaigns.js.

alter table public.campaigns
  add column if not exists orden integer not null default 0;

-- ── Seed the existing rows ─────────────────────────────────────────────
-- Every existing campaign has orden = 0 from the default, which would leave
-- the list ordered entirely by the created_at tiebreaker. Number them in the
-- order they are displayed today (newest first) so applying this migration
-- does not visibly reshuffle the page: the list looks identical afterwards,
-- and only an admin's first drag changes anything.
--
-- The `where orden = 0` guard makes this idempotent-ish: re-running the file
-- after an admin has reordered will not renumber rows they moved off 0. It
-- can still touch a row an admin deliberately placed at 0, which is why this
-- is a one-time migration and not something to re-run casually.

with numbered as (
  select id, (row_number() over (order by created_at desc) - 1) as pos
  from public.campaigns
)
update public.campaigns c
set orden = numbered.pos
from numbered
where c.id = numbered.id
  and c.orden = 0;

-- ── Index ──────────────────────────────────────────────────────────────
-- The list query is `order by orden asc, created_at desc`, so the index
-- carries both columns in exactly that direction. campaigns_created_at_idx
-- from 0009 no longer serves the list query on its own (orden leads), but it
-- is left in place: fetchPlayerCampaigns and any created_at-only lookup
-- still use it, and dropping it would be an unrelated change.

create index if not exists campaigns_orden_idx
  on public.campaigns (orden asc, created_at desc);

-- ── Verify (optional, run manually) ────────────────────────────────────
-- 1. The column exists, is not null, defaults to 0:
--
--    select column_name, data_type, is_nullable, column_default
--    from information_schema.columns
--    where table_schema = 'public' and table_name = 'campaigns'
--      and column_name = 'orden';
--
-- 2. Existing rows are numbered 0..n-1 with no duplicates. Expect one row
--    where dupes = 0 and max_orden = count - 1:
--
--    select count(*) as total,
--           max(orden) as max_orden,
--           count(*) - count(distinct orden) as dupes
--    from public.campaigns;
--
-- 3. The order did not visibly change. These two lists must match:
--
--    select titulo from public.campaigns order by orden asc, created_at desc;
--    select titulo from public.campaigns order by created_at desc;
--
-- 4. End-to-end: in the admin panel, "Subir" on the second campaign moves it
--    to the top, and /campanas shows the same order after a reload.
