-- Run this once in the Supabase SQL Editor. Adds the 4 new admin-granted
-- aptitude flags for the redesigned hexagon badge set (Game master,
-- Paracaidismo, Fuerzas especiales, Peacekeeper). Tirador especial and
-- Medico especialista reuse the existing apt_tirador / apt_medico columns
-- (same concept, refreshed art + label). apt_mortero is left in place but
-- no longer surfaced anywhere in the UI - dropping it is a separate,
-- explicit decision since it's a destructive schema change.

alter table public.players
  add column if not exists apt_game_master boolean not null default false,
  add column if not exists apt_paracaidismo boolean not null default false,
  add column if not exists apt_fuerzas_especiales boolean not null default false,
  add column if not exists apt_peacekeeper boolean not null default false;

-- protect_admin_fields() must clamp these new columns too, or any
-- authenticated user could grant themselves these aptitudes directly via a
-- raw PostgREST PATCH request (the UI never exposes this, but RLS/triggers
-- are the actual security boundary per this project's model).
create or replace function public.protect_admin_fields()
returns trigger language plpgsql set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin(auth.uid()) then
    new.miembro_desde          := old.miembro_desde;
    new.apt_tirador             := old.apt_tirador;
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
