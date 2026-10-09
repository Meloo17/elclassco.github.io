-- EL CLASSCO: admin-managed announcements shown on the public homepage
create table if not exists public.site_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 100),
  body text not null check (char_length(btrim(body)) between 1 and 1200),
  is_published boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists site_announcements_created_at_idx on public.site_announcements(created_at desc);
alter table public.site_announcements enable row level security;
drop policy if exists "public can read published announcements" on public.site_announcements;
create policy "public can read published announcements" on public.site_announcements for select to anon, authenticated using (is_published = true or public.is_admin());
drop policy if exists "admins can create announcements" on public.site_announcements;
create policy "admins can create announcements" on public.site_announcements for insert to authenticated with check (public.is_admin());
drop policy if exists "admins can update announcements" on public.site_announcements;
create policy "admins can update announcements" on public.site_announcements for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins can delete announcements" on public.site_announcements;
create policy "admins can delete announcements" on public.site_announcements for delete to authenticated using (public.is_admin());
grant select on public.site_announcements to anon, authenticated;
grant insert, update, delete on public.site_announcements to authenticated;
do $$ begin alter publication supabase_realtime add table public.site_announcements; exception when duplicate_object then null; end $$;
