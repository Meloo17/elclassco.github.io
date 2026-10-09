-- EL CLASSCO: secure public game reviews and ratings
-- Run supabase-schema.sql first (public.is_admin() is used below).
create table if not exists public.game_reviews (
  id uuid primary key default gen_random_uuid(),
  game_name text not null check (char_length(btrim(game_name)) between 1 and 120),
  visitor_id uuid not null,
  nickname text not null check (char_length(btrim(nickname)) between 2 and 24),
  rating smallint not null check (rating between 1 and 5),
  comment text not null check (char_length(btrim(comment)) between 1 and 500),
  created_at timestamptz not null default now(),
  unique (game_name, visitor_id)
);
create index if not exists game_reviews_game_created_idx on public.game_reviews(game_name, created_at desc);
create index if not exists game_reviews_created_idx on public.game_reviews(created_at desc);
alter table public.game_reviews enable row level security;
drop policy if exists "public can read game reviews" on public.game_reviews;
create policy "public can read game reviews" on public.game_reviews for select to anon, authenticated using (true);
drop policy if exists "admins can delete game reviews" on public.game_reviews;
create policy "admins can delete game reviews" on public.game_reviews for delete to authenticated using (public.is_admin());
grant select on public.game_reviews to anon, authenticated;
grant delete on public.game_reviews to authenticated;
create or replace function public.submit_game_review(
  p_game_name text, p_nickname text, p_rating integer, p_comment text, p_visitor_id uuid
) returns uuid language plpgsql security definer set search_path = public
as $$
declare new_id uuid;
begin
  if p_game_name is null or char_length(btrim(p_game_name)) not between 1 and 120 then raise exception 'Oyun adı geçersiz.'; end if;
  if p_nickname is null or char_length(btrim(p_nickname)) not between 2 and 24 then raise exception 'Takma ad 2-24 karakter olmalı.'; end if;
  if p_rating is null or p_rating not between 1 and 5 then raise exception 'Puan 1-5 arasında olmalı.'; end if;
  if p_comment is null or char_length(btrim(p_comment)) not between 1 and 500 then raise exception 'Yorum 1-500 karakter olmalı.'; end if;
  if p_visitor_id is null then raise exception 'Ziyaretçi kimliği gerekli.'; end if;
  perform pg_advisory_xact_lock(hashtext(p_visitor_id::text));
  if exists (select 1 from public.game_reviews where visitor_id=p_visitor_id and created_at > now() - interval '20 seconds') then
    raise exception 'Çok hızlı yorum gönderiyorsun. 20 saniye sonra tekrar dene.';
  end if;
  insert into public.game_reviews(game_name,visitor_id,nickname,rating,comment)
  values(btrim(p_game_name),p_visitor_id,btrim(p_nickname),p_rating,btrim(p_comment))
  on conflict(game_name,visitor_id) do update
    set nickname=excluded.nickname,rating=excluded.rating,comment=excluded.comment,created_at=now()
  returning id into new_id;
  return new_id;
end;
$$;
revoke all on function public.submit_game_review(text,text,integer,text,uuid) from public;
grant execute on function public.submit_game_review(text,text,integer,text,uuid) to anon, authenticated;
do $$ begin alter publication supabase_realtime add table public.game_reviews; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.games; exception when duplicate_object then null; end $$;
