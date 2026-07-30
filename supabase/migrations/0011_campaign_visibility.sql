-- Run this once in the Supabase SQL Editor, after 0010_campaign_order.sql.
-- Lets an admin hide a campaign from the public site without deleting it.
--
--   campaigns.visible  - boolean, default true
--
-- Why this exists: a campaign gets written up before it is played, or is
-- retired, or is being edited across several sessions. Today the only way to
-- keep it off the public site is to not create it yet, or to delete it - and
-- deleting cascades to its missions AND to every badge granted for it (0008),
-- which is a destructive answer to a temporary question. `visible` is the
-- non-destructive one: the row, its missions and its granted badges all stay
-- intact, they just stop being served.
--
-- ── Hidden means hidden, and the database is what enforces it ──────────
--
-- The gate is RLS, not a `.eq('visible', true)` in the client. Filtering in
-- the frontend would leave the row reachable by anyone who talks to PostgREST
-- directly with the anon key - which is public, it ships in the bundle. A
-- campaign an admin hid because it is half-written should not be readable by
-- typing a URL into curl. So anon/authenticated non-admins simply cannot
-- select the row, and /campanas/<id> for a hidden campaign returns no rows,
-- which the detail page already renders as "Campaña no encontrada".
--
-- This also decides the badge question. campaign_titles rows for a hidden
-- campaign survive, but the embedded campaigns(*) that PlayerProfile reads
-- comes back NULL for a non-admin, and fetchPlayerCampaigns already drops
-- rows with no embedded campaign (that .filter(Boolean) was written for the
-- FK-cascade case and covers this one exactly). So hiding a campaign also
-- hides its badge from every profile, with no client change. Un-hiding puts
-- every badge back, because nothing was deleted.
--
-- ── Why the gate is repeated on missions and campaign_titles ──────────
--
-- RLS is evaluated per table, not per query. `campaigns(*)` embedded on a
-- campaign_titles select, or `missions(*)` embedded on a campaigns select,
-- each check the policies of the table they read. Gating only `campaigns`
-- would hide the campaign row while still serving its missions to anyone who
-- asked for `missions?select=*` - the mission titles and descriptions are the
-- content being hidden, so that would defeat the point. Each policy therefore
-- carries the same condition, resolved through the campaign it belongs to,
-- and states that condition in full rather than inheriting it (see the note
-- above those two policies).

alter table public.campaigns
  add column if not exists visible boolean not null default true;

-- Default true, NOT NULL: every existing campaign stays exactly as visible as
-- it is today, and a campaign created by the admin form (which does not send
-- the column on insert) is public by default. Hiding is the deliberate act;
-- a forgotten field must never silently take a campaign off the site.

-- ── Reads: public sees visible campaigns, admins see everything ────────
-- Replaces the three *_select_public policies from 0008. Same name kept for
-- each: this is the same policy slot (who may read this table), and adding a
-- second policy instead would OR with the old one, which permits everything -
-- exactly the failure this migration is meant to prevent.

drop policy if exists "campaigns_select_public" on public.campaigns;
create policy "campaigns_select_public"
  on public.campaigns for select to anon, authenticated
  using (visible or private.is_admin(auth.uid()));

-- private.is_admin(NULL) returns false for an anonymous visitor (it coalesces
-- a no-rows lookup to false, see 0006), so the admin branch is simply never
-- true for anon. No separate anon case is needed.

drop policy if exists "missions_select_public" on public.missions;
create policy "missions_select_public"
  on public.missions for select to anon, authenticated
  using (exists (
    select 1 from public.campaigns c
    where c.id = missions.campaign_id
      and (c.visible or private.is_admin(auth.uid()))
  ));

drop policy if exists "campaign_titles_select_public" on public.campaign_titles;
create policy "campaign_titles_select_public"
  on public.campaign_titles for select to anon, authenticated
  using (exists (
    select 1 from public.campaigns c
    where c.id = campaign_titles.campaign_id
      and (c.visible or private.is_admin(auth.uid()))
  ));

-- Those two subqueries spell out `c.visible or is_admin(...)` rather than
-- leaning on campaigns_select_public to filter public.campaigns for them.
-- A policy expression is not a plain user query: a subquery inside it reads
-- the referenced table with the RLS of the policy's context, not reliably
-- with the caller's own. Depending on that nesting would make the gate on
-- missions correct only as a side effect of a rule written on another table -
-- and if it resolved the other way, missions of a hidden campaign would be
-- served to anyone. The condition is duplicated on purpose: three explicit
-- gates that are individually true beat one clever gate that is true only if
-- Postgres evaluates nested policies the way the author assumed.
--
-- The admin branch has to be repeated for the same reason. Without it an
-- admin would stop seeing the missions of a campaign the moment they hid it,
-- in the very panel where they hid it.
--
-- Writes are untouched: campaigns_admin_update from 0008 already allows an
-- admin to update any column of any campaign, so toggling `visible` needs no
-- new policy.

-- ── Index ─────────────────────────────────────────────────────────────
-- The public list is `where visible order by orden, created_at`, with the
-- `where` supplied by RLS rather than the client - the planner sees it the
-- same way either route. Partial index on the visible rows only: hidden
-- campaigns are the rare case and never appear in this query, so they do not
-- belong in the index that serves it.
--
-- campaigns_orden_idx from 0010 stays: it still serves the admin panel, which
-- reads every row regardless of visibility.

create index if not exists campaigns_visible_orden_idx
  on public.campaigns (orden asc, created_at desc)
  where visible;

-- ── Verify (optional, run manually) ────────────────────────────────────
-- 1. The column exists, not null, defaults to true, and nothing was hidden
--    by applying this. Expect one row (true, 0):
--
--    select bool_and(visible) as all_visible,
--           count(*) filter (where not visible) as hidden
--    from public.campaigns;
--
-- 2. Hide one campaign and confirm the gate holds. As an admin:
--
--    update public.campaigns set visible = false where titulo = '<titulo>';
--
--    Then, with the anon key and NO session (curl or a logged-out browser):
--
--    select id, titulo from public.campaigns;              -- hidden one absent
--    select count(*) from public.missions
--      where campaign_id = '<hidden-id>';                  -- 0
--    select count(*) from public.campaign_titles
--      where campaign_id = '<hidden-id>';                  -- 0
--
--    Still signed in as an admin, all three must return the rows.
--
-- 3. Nothing was destroyed. As an admin, the missions and grants are intact:
--
--    select (select count(*) from public.missions where campaign_id = '<hidden-id>') as misiones,
--           (select count(*) from public.campaign_titles where campaign_id = '<hidden-id>') as insignias;
--
--    Re-show it and the same numbers must be visible to anon again:
--
--    update public.campaigns set visible = true where id = '<hidden-id>';
--
-- 4. End-to-end: hide a campaign in the admin panel. It disappears from
--    /campanas, its /campanas/<id> shows "Campaña no encontrada" in a private
--    window, and its badge disappears from the profiles that had it. Un-hide
--    it and all three come back.
