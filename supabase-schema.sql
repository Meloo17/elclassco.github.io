-- EL CLASSCO Supabase schema
-- Run this in Supabase SQL Editor. Review the project before applying.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('user','admin')),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  category text not null check (char_length(category) between 1 and 80),
  download_url text,
  cover_url text,
  system_requirements text,
  description text,
  tags text[] not null default '{}',
  is_cheat boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_requests (
  id uuid primary key default gen_random_uuid(),
  requester_name text not null default 'Anonim' check (char_length(requester_name) between 1 and 80),
  game_name text not null check (char_length(game_name) between 1 and 120),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.game_requests enable row level security;

drop policy if exists "profiles read own or admin" on public.profiles;
create policy "profiles read own or admin" on public.profiles for select to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists "public can read games" on public.games;
create policy "public can read games" on public.games for select to anon, authenticated using (true);

drop policy if exists "admins manage games" on public.games;
create policy "admins manage games" on public.games for all to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public submit game requests" on public.game_requests;
create policy "public submit game requests" on public.game_requests for insert to anon, authenticated
with check (status = 'pending' and char_length(requester_name) between 1 and 80 and char_length(game_name) between 1 and 120);

drop policy if exists "admins read requests" on public.game_requests;
create policy "admins read requests" on public.game_requests for select to authenticated using (public.is_admin());

drop policy if exists "admins update requests" on public.game_requests;
create policy "admins update requests" on public.game_requests for update to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins delete requests" on public.game_requests;
create policy "admins delete requests" on public.game_requests for delete to authenticated using (public.is_admin());

-- IMPORTANT BOOTSTRAP STEPS:
-- 1) Create your own user in Supabase Authentication > Users (keep public signups disabled).
-- 2) Copy that user's UUID and run the statement below after replacing USER_UUID:
--    insert into public.profiles (id, role) values ('USER_UUID', 'admin')
--    on conflict (id) do update set role = 'admin';
-- Do not allow ordinary users to update their own profile role.
-- Never put a Supabase service_role/secret key in any browser file.
