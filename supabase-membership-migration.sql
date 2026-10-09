-- EL CLASSCO membership/download access migration
-- Run once in Supabase SQL Editor before publishing the membership UI.
-- Existing public game catalog stays readable; the download_url column becomes
-- available only to authenticated users. Admins remain authenticated and retain access.

begin;

-- Create a normal user profile for every email or Google OAuth signup.
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'user')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute procedure public.handle_new_user_profile();

-- Do not put download URLs into this public migration file.
-- Before rollout, ensure intended direct URLs are stored in public.games.download_url
-- using the existing admin panel while authenticated. The privilege change below
-- then makes that column unreadable to anonymous visitors.
-- Note: URLs committed in older public Git history are already exposed and should
-- be rotated/replaced if they must be access-controlled.
 
-- Remove table-wide SELECT grants, then explicitly grant only public catalog
-- columns to anonymous visitors. Authenticated users (including admins) can
-- also read download_url. Existing RLS policies continue to apply.
revoke select on table public.games from anon, authenticated, public;
grant select (
  id, name, category, cover_url, system_requirements, description,
  tags, is_cheat, created_at, updated_at
) on table public.games to anon;

grant select (
  id, name, category, download_url, cover_url, system_requirements,
  description, tags, is_cheat, created_at, updated_at
) on table public.games to authenticated;

commit;

-- Dashboard steps required outside SQL:
-- 1) Authentication > Providers > Google: enable it and enter Google's OAuth credentials.
-- 2) Authentication > URL Configuration: add https://meloo17.github.io/elclassco.github.io/
--    to Site URL / Redirect URLs (and localhost if you use local testing).
-- 3) Test signup, email confirmation, Google login, and admin login before merging the UI.
