-- Run this entire script once in the Supabase SQL Editor for project
-- pufnvhxumrdyuxkljwro. It sets up the players table, the auto-signup
-- trigger, the admin-elevation helper, and all RLS policies.

create extension if not exists pgcrypto;

create table if not exists public.players (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  rol_favorito text,
  miembro_desde date not null default current_date,
  apt_tirador boolean not null default false,
  apt_medico boolean not null default false,
  apt_mortero boolean not null default false,
  is_admin boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_players_set_updated_at on public.players;
create trigger trg_players_set_updated_at
  before update on public.players
  for each row execute function public.set_updated_at();

-- SECURITY DEFINER: bypasses RLS internally, avoiding infinite recursion
-- from a policy on players subquerying players itself.
create or replace function public.is_admin(uid uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select coalesce((select p.is_admin from public.players p where p.id = uid), false);
$$;
grant execute on function public.is_admin(uuid) to anon, authenticated;

-- Defense in depth: clamp admin-only columns on any UPDATE by a non-admin,
-- regardless of what the client actually sent (covers direct API calls too).
create or replace function public.protect_admin_fields()
returns trigger language plpgsql set search_path = public as $$
begin
  if not public.is_admin(auth.uid()) then
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

drop trigger if exists trg_players_protect_admin_fields on public.players;
create trigger trg_players_protect_admin_fields
  before update on public.players
  for each row execute function public.protect_admin_fields();

-- Only path players rows get created: fires when someone signs up.
create or replace function public.handle_new_user()
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

drop trigger if exists trg_auth_user_created on auth.users;
create trigger trg_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.players enable row level security;

create policy "players_select_public"
  on public.players for select to anon, authenticated using (true);

create policy "players_update_self_or_admin"
  on public.players for update to authenticated
  using (auth.uid() = id or public.is_admin(auth.uid()))
  with check (auth.uid() = id or public.is_admin(auth.uid()));

-- No INSERT policy: handle_new_user() is SECURITY DEFINER and bypasses RLS;
-- any other INSERT attempt is denied by RLS's implicit default-deny.
-- No DELETE policy: "Eliminar" in the admin panel is a soft is_active=false
-- UPDATE instead of a real DELETE (see plan doc for why).

-- ── Bootstrapping the first admin ──────────────────────────────────────
-- After deploying, sign up as siropregno14@gmail.com through /ingresar on
-- the live site, then run this once:
--
-- update public.players set is_admin = true
-- where id = (select id from auth.users where email = 'siropregno14@gmail.com');
