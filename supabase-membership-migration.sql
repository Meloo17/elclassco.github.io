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

-- Keep the current hand-curated links, but move their values into the database
-- before removing them from the public page source. Existing DB values win.
update public.games as g
set download_url = case g.name
  when 'Battlefield 1' then 'https://pixeldrain.com/u/vofoyM4i'
  when 'Battlefield 5' then 'https://gofile.io/d/D7gmvc'
  when 'BeamNG.drive' then 'https://drive.usercontent.google.com/download?id=1cQkmx46H5tMu7-9gRIUmCUVdGKl7og53&authuser=0'
  when 'Cyberpunk 2077' then 'https://gofile.io/d/1EMT54'
  when 'Euro Truck Simulator 2' then 'https://megaup.net/9b7c4b29ca80e82f4fb4c2f636ecbd95/Euro.Truck.Simulator.2.v1.60.1.0s.rar'
  when 'Grand Theft Auto V' then 'https://transfer.it/t/qXwxErwn1LaY'
  when 'God of War' then 'https://gofile.io/d/OUbvV2'
  when 'Grand Theft Auto: San Andreas' then 'https://transfer.it/t/DfEDqj51VTwR'
  when 'eFootball PES 2021' then 'https://drive.usercontent.google.com/download?id=1OoQsdHG_9MO8_LPdzFsxm2V4kGdrjlWk&export=download&authuser=0'
  when 'Red Dead Redemption 2' then 'https://gofile.io/d/pdRrzq'
  when 'Spider-Man 3' then 'https://bowfile.com/6sqi#popup1'
  when 'Watch Dogs 2' then 'https://gofile.io/d/wW77bP'
  when 'WWE 2K24' then 'https://datanodes.to/download'
  when 'Assetto Corsa' then 'https://www.mediafire.com/file/ojyxik0g3nrcb35/Assetto+Corsa.7z/file'
  when 'Hello Neighbor 2' then 'https://gofile.io/d/BX8NB5'
  when 'İblis 3' then 'https://www.mediafire.com/file/yzuuuwb7w8yekiy/iblis+3+(bkbtb+-+berkant).zip/file'
  when 'God of War Ragnarök' then 'https://gofile.io/d/4LbYNU'
  when 'Hitman: World of Assassination' then 'https://gofile.io/d/opbggB'
  when 'Outlast 2' then 'https://pixeldrain.com/u/UPTajG2H'
  when 'Outlast' then 'https://gofile.io/d/o8N8Kw'
  when 'PAYDAY 2' then 'https://gofile.io/d/tLhrfYoP'
  when 'PAYDAY 3' then 'https://gofile.io/d/q9Gfiv'
  when 'The Baby in Yellow' then 'https://megaup.net/d7dc240914ae60c6e68cc8d204de32f9/The.Baby.In.Yellow.v2025.11.22.rar'
  else g.download_url
end
where (g.download_url is null or btrim(g.download_url) = '')
  and g.name in (
    'Battlefield 1','Battlefield 5','BeamNG.drive','Cyberpunk 2077',
    'Euro Truck Simulator 2','Grand Theft Auto V','God of War',
    'Grand Theft Auto: San Andreas','eFootball PES 2021','Red Dead Redemption 2',
    'Spider-Man 3','Watch Dogs 2','WWE 2K24','Assetto Corsa','Hello Neighbor 2',
    'İblis 3','God of War Ragnarök','Hitman: World of Assassination',
    'Outlast 2','Outlast','PAYDAY 2','PAYDAY 3','The Baby in Yellow'
  );

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
