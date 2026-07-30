-- Run this once in the Supabase SQL Editor, after 0006_harden_security_warnings.sql.
-- Fixes a bug introduced by 0006: saving your own profile failed with
-- "permission denied for schema private".
--
-- Cause: calling private.is_admin() requires TWO privileges, not one -
-- EXECUTE on the function AND USAGE on the schema containing it. 0006
-- granted the first but its `revoke all on schema private from anon,
-- authenticated` stripped the second, so every reference to
-- private.is_admin() inside an RLS policy or trigger threw before the
-- function body ever ran. players_update_self_or_admin evaluates that
-- call on every UPDATE, which is why a plain profile save broke.
--
-- The revoke was cargo-culted from the usual "lock down a private schema"
-- advice, which applies when clients never touch the schema at all. Here
-- they must: RLS policy expressions are evaluated with the privileges of
-- the *invoking* role (anon or authenticated), not the policy author's.
--
-- Granting USAGE does NOT undo what 0006 accomplished. The linter warnings
-- were about PostgREST exposing these functions as /rest/v1/rpc/ endpoints,
-- and that exposure is controlled by which schemas are listed in
-- PostgREST's `db-schemas` config - NOT by schema USAGE. `private` is not
-- in that list, so the functions stay unreachable over HTTP whether or not
-- USAGE is granted. Verification for that claim is at the bottom.

grant usage on schema private to anon, authenticated;

-- Re-assert EXECUTE. 0006 already granted this and nothing revoked it, so
-- this is a no-op on a database where 0006 applied cleanly. It's here so
-- this file is self-contained if 0006 was partially applied.
grant execute on function private.is_admin(uuid) to anon, authenticated;

-- Default-deny anything ELSE that later lands in `private`. USAGE only
-- lets a role look inside the schema; it grants nothing on the objects
-- within. Tables added here later are still unreadable, and future
-- functions are not executable unless explicitly granted - so this stays
-- narrow rather than reopening the schema wholesale.
alter default privileges in schema private
  revoke execute on functions from anon, authenticated;

-- ── Verify (optional, run manually) ────────────────────────────────────
-- 1. The functions are gone from the exposed API. Expect 0 rows:
--
--    select p.proname
--    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public'
--      and p.proname in ('is_admin', 'handle_new_user');
--
-- 2. The private ones exist and are callable. Expect true/false, not an error:
--
--    select private.is_admin(id) from public.players limit 1;
--
-- 3. End-to-end: sign in on the live site and save a profile edit. That
--    one action exercises both players_update_self_or_admin and the
--    protect_admin_fields trigger, which are the two paths 0006 broke.
