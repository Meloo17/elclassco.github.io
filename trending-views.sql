-- EL CLASSCO: shared trend views (run once in Supabase SQL Editor)
-- The browser can call these functions but cannot read or modify the raw view table.
create table if not exists public.game_views (
  game_id uuid not null references public.games(id) on delete cascade,
  visitor_id text not null check (char_length(visitor_id) between 8 and 100),
  viewed_at timestamptz not null default now(),
  primary key (game_id, visitor_id)
);

alter table public.game_views enable row level security;
revoke all on table public.game_views from anon, authenticated;

create or replace function public.record_game_view(p_game_id uuid, p_visitor_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_game_id is null or p_visitor_id is null or char_length(p_visitor_id) < 8 or char_length(p_visitor_id) > 100 then
    return;
  end if;
  if not exists (select 1 from public.games where id = p_game_id) then
    return;
  end if;
  insert into public.game_views(game_id, visitor_id, viewed_at)
  values (p_game_id, p_visitor_id, now())
  on conflict (game_id, visitor_id) do update
    set viewed_at = excluded.viewed_at
    where public.game_views.viewed_at < now() - interval '24 hours';
end;
$$;

create or replace function public.get_trending_games()
returns table(game_id uuid, game_name text, category text, cover_url text, view_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select g.id, g.name, g.category, g.cover_url, count(v.game_id)::bigint as view_count
  from public.games g
  join public.game_views v on v.game_id = g.id
  where v.viewed_at >= now() - interval '30 days'
  group by g.id, g.name, g.category, g.cover_url
  order by view_count desc, g.name asc
  limit 12;
$$;

revoke all on function public.record_game_view(uuid, text) from public;
revoke all on function public.get_trending_games() from public;
grant execute on function public.record_game_view(uuid, text) to anon, authenticated;
grant execute on function public.get_trending_games() to anon, authenticated;
