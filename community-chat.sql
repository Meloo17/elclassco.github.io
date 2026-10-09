-- EL CLASSCO: nickname-only realtime community chat + admin moderation
-- Run once in Supabase SQL Editor after supabase-schema.sql and trending-views.sql.

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  nickname text not null check (char_length(nickname) between 2 and 24),
  message text not null check (char_length(message) between 1 and 400),
  visitor_id text not null check (char_length(visitor_id) between 8 and 100),
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_created_at_idx on public.chat_messages(created_at desc);
create table if not exists public.chat_rate_limits (
  visitor_id text primary key,
  last_sent_at timestamptz not null default now()
);

alter table public.chat_messages enable row level security;
alter table public.chat_rate_limits enable row level security;
revoke all on table public.chat_rate_limits from anon, authenticated;
revoke insert, update, delete on table public.chat_messages from anon, authenticated;
drop policy if exists "public can read chat messages" on public.chat_messages;
create policy "public can read chat messages" on public.chat_messages
  for select to anon, authenticated using (true);
drop policy if exists "admins can delete chat messages" on public.chat_messages;
create policy "admins can delete chat messages" on public.chat_messages
  for delete to authenticated using (public.is_admin());

create or replace function public.send_chat_message(p_nickname text, p_message text, p_visitor_id text)
returns public.chat_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_nickname text := btrim(regexp_replace(coalesce(p_nickname,''), '[[:cntrl:]]', '', 'g'));
  clean_message text := btrim(coalesce(p_message,''));
  result public.chat_messages;
  last_sent timestamptz;
begin
  if char_length(clean_nickname) < 2 or char_length(clean_nickname) > 24 then
    raise exception 'Takma ad 2-24 karakter olmalı.';
  end if;
  if char_length(clean_message) < 1 or char_length(clean_message) > 400 then
    raise exception 'Mesaj 1-400 karakter olmalı.';
  end if;
  if p_visitor_id is null or char_length(p_visitor_id) < 8 or char_length(p_visitor_id) > 100 then
    raise exception 'Sohbet kimliği geçersiz.';
  end if;
  if clean_message ~* '(https?://|www\.)' then
    raise exception 'Sohbette bağlantı paylaşımı kapalı.';
  end if;
  insert into public.chat_rate_limits(visitor_id,last_sent_at)
    values(p_visitor_id, '-infinity'::timestamptz)
    on conflict(visitor_id) do nothing;
  select last_sent_at into last_sent from public.chat_rate_limits where visitor_id=p_visitor_id for update;
  if last_sent > now() - interval '4 seconds' then
    raise exception 'Çok hızlı mesaj gönderiyorsun. Birkaç saniye bekle.';
  end if;
  update public.chat_rate_limits set last_sent_at=now() where visitor_id=p_visitor_id;
  insert into public.chat_messages(nickname,message,visitor_id)
    values(clean_nickname,clean_message,p_visitor_id) returning * into result;
  delete from public.chat_messages where created_at < now() - interval '14 days';
  delete from public.chat_rate_limits where last_sent_at < now() - interval '30 days';
  return result;
end;
$$;

create or replace function public.delete_chat_message(p_message_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Yönetici yetkisi gerekli.';
  end if;
  delete from public.chat_messages where id=p_message_id;
  return found;
end;
$$;

revoke all on function public.send_chat_message(text,text,text) from public;
revoke all on function public.delete_chat_message(uuid) from public;
grant execute on function public.send_chat_message(text,text,text) to anon, authenticated;
grant execute on function public.delete_chat_message(uuid) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.chat_messages;
exception when duplicate_object then null;
end $$;
