-- EL CLASSCO Roblox Script Merkezi
-- Supabase SQL Editor'da bir kez çalıştır.
create table if not exists public.roblox_scripts (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'script' check (kind in ('script','tool')),
  title text not null check (char_length(title) between 1 and 120),
  game_name text,
  description text not null check (char_length(description) between 1 and 2000),
  code text,
  tool_name text,
  tool_url text,
  tags text[] not null default '{}',
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint roblox_scripts_kind_fields check (
    (kind='script' and code is not null and char_length(code) <= 20000)
    or (kind='tool' and (tool_url is null or tool_url ~ '^https://'))
  )
);
alter table public.roblox_scripts enable row level security;
drop policy if exists "public read published Roblox resources" on public.roblox_scripts;
create policy "public read published Roblox resources"
  on public.roblox_scripts for select to anon, authenticated
  using (is_published = true or public.is_admin());
drop policy if exists "admins manage Roblox resources" on public.roblox_scripts;
create policy "admins manage Roblox resources"
  on public.roblox_scripts for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
grant select on public.roblox_scripts to anon, authenticated;
grant insert, update, delete on public.roblox_scripts to authenticated;

insert into public.roblox_scripts (kind,title,game_name,description,code,tags,is_published)
select 'script','Sprint sistemi (Roblox Studio)','Genel / Kendi deneyimin','Kendi deneyiminde StarterPlayer > StarterPlayerScripts içine LocalScript olarak ekle. Shift basılıyken oyuncunun yürüme hızını artırır.', $code$
local UserInputService = game:GetService("UserInputService")
local Players = game:GetService("Players")
local player = Players.LocalPlayer
local normalSpeed = 16
local sprintSpeed = 24

local function setSpeed(speed)
  local character = player.Character or player.CharacterAdded:Wait()
  local humanoid = character:WaitForChild("Humanoid")
  humanoid.WalkSpeed = speed
end

UserInputService.InputBegan:Connect(function(input, processed)
  if processed then return end
  if input.KeyCode == Enum.KeyCode.LeftShift then setSpeed(sprintSpeed) end
end)

UserInputService.InputEnded:Connect(function(input)
  if input.KeyCode == Enum.KeyCode.LeftShift then setSpeed(normalSpeed) end
end)

player.CharacterAdded:Connect(function()
  task.wait(0.2)
  setSpeed(normalSpeed)
end)
$code$, array['movement','sprint','LocalScript','StarterPlayerScripts'], true
where not exists (select 1 from public.roblox_scripts where title='Sprint sistemi (Roblox Studio)');

insert into public.roblox_scripts (kind,title,game_name,description,code,tags,is_published)
select 'script','Basit checkpoint sistemi','Obby / Kendi deneyimin','Kendi obby deneyiminde Workspace içine Checkpoint adlı Part koy ve bu Scripti Part içine ekle. Oyuncu dokununca yeniden doğma noktası olur.', $code$
local checkpoint = script.Parent
checkpoint.Touched:Connect(function(hit)
  local character = hit.Parent
  local humanoid = character and character:FindFirstChildOfClass("Humanoid")
  if not humanoid then return end
  local player = game:GetService("Players"):GetPlayerFromCharacter(character)
  if player then
    player.RespawnLocation = checkpoint
  end
end)
$code$, array['obby','checkpoint','Script','Workspace'], true
where not exists (select 1 from public.roblox_scripts where title='Basit checkpoint sistemi');

insert into public.roblox_scripts (kind,title,game_name,description,tool_name,tool_url,tags,is_published)
select 'tool','Roblox Creator Hub','Tüm Roblox deneyimleri','Resmî geliştirme dokümantasyonu, Studio rehberleri ve API referansları.','Creator Hub','https://create.roblox.com/docs',array['resmi','dokümantasyon','geliştirme'],true
where not exists (select 1 from public.roblox_scripts where title='Roblox Creator Hub');

insert into public.roblox_scripts (kind,title,game_name,description,tool_name,tool_url,tags,is_published)
select 'tool','Roblox Studio','Tüm Roblox deneyimleri','Kendi Roblox oyunlarını oluşturmak, test etmek ve LuaU scriptlerini çalıştırmak için resmî geliştirme ortamı.','Roblox Studio','https://create.roblox.com/',array['resmi','studio','geliştirme'],true
where not exists (select 1 from public.roblox_scripts where title='Roblox Studio');
