-- Run this once in the Supabase SQL Editor. Fixes a bootstrapping bug in
-- protect_admin_fields() (see 0001_players.sql): the trigger fired on every
-- UPDATE regardless of caller, including raw SQL run directly in the SQL
-- Editor. In that context there's no authenticated request, so auth.uid()
-- is NULL, public.is_admin(NULL) evaluates to false, and the trigger
-- silently clamped is_admin back to its old value - undoing the very
-- bootstrap UPDATE documented at the bottom of 0001_players.sql.
--
-- Fix: only clamp when auth.uid() is present (i.e. the write came through
-- PostgREST with a real JWT). A NULL auth.uid() means the connection is
-- already a direct/superuser SQL Editor session, which bypasses RLS
-- entirely and is inherently trusted - the trigger should mirror that
-- trust boundary instead of fighting it.

create or replace function public.protect_admin_fields()
returns trigger language plpgsql set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin(auth.uid()) then
    new.miembro_desde := old.miembro_desde;
    new.apt_tirador   := old.apt_tirador;
    new.apt_medico    := old.apt_medico;
    new.apt_mortero   := old.apt_mortero;
    new.is_admin      := old.is_admin;
    new.is_active     := old.is_active;
  end if;
  return new;
end;
$$;

-- Now this will actually stick (the old one got silently reverted by the bug above):
update public.players set is_admin = true
where id = (select id from auth.users where email = 'siropregno14@gmail.com');
