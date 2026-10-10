-- EL CLASSCO: Ek Roblox Studio örnekleri
-- Supabase SQL Editor'da çalıştır. Tekrar çalıştırılabilir; aynı başlıkları çoğaltmaz.
-- Bu örnekler yalnızca kendi Roblox Studio deneyimini geliştirmek içindir.

insert into public.roblox_scripts (kind,title,game_name,description,code,tags,is_published)
select 'script','Coins lider tablosu (leaderstats)','Genel / Kendi deneyimin',
'ServerScriptService içine normal Script olarak ekle. Oyuncular katıldığında Coins adlı bir lider tablosu değeri oluşturur.',
$code$
local Players = game:GetService("Players")

Players.PlayerAdded:Connect(function(player)
    local leaderstats = Instance.new("Folder")
    leaderstats.Name = "leaderstats"
    leaderstats.Parent = player

    local coins = Instance.new("IntValue")
    coins.Name = "Coins"
    coins.Value = 0
    coins.Parent = leaderstats
end)
$code$, array['leaderstats','coins','ServerScriptService','Script'], true
where not exists (select 1 from public.roblox_scripts where title='Coins lider tablosu (leaderstats)');

insert into public.roblox_scripts (kind,title,game_name,description,code,tags,is_published)
select 'script','Coin toplama parçası','Genel / Kendi deneyimin',
'Workspace içine bir Part koy ve içine normal Script ekle. Oyuncu parçaya dokununca Coins değeri 1 artar; kısa bekleme aynı dokunuşun tekrarlanmasını önler. Coins lider tablosu örneğiyle birlikte kullan.',
$code$
local Players = game:GetService("Players")
local pickup = script.Parent
local available = true

pickup.Touched:Connect(function(hit)
    if not available then return end

    local character = hit:FindFirstAncestorOfClass("Model")
    local player = character and Players:GetPlayerFromCharacter(character)
    if not player then return end

    local leaderstats = player:FindFirstChild("leaderstats")
    local coins = leaderstats and leaderstats:FindFirstChild("Coins")
    if not coins then return end

    available = false
    coins.Value += 1
    task.wait(1)
    available = true
end)
$code$, array['coins','pickup','Workspace','Script'], true
where not exists (select 1 from public.roblox_scripts where title='Coin toplama parçası');

insert into public.roblox_scripts (kind,title,game_name,description,code,tags,is_published)
select 'script','Basit dokunma teleportu','Obby / Kendi deneyimin',
'Workspace içine bir Part koyup içine Script ekle. Oyuncu parçaya dokunduğunda karakteri hedef konuma taşır. targetPosition değerini haritana göre değiştir.',
$code$
local Players = game:GetService("Players")
local pad = script.Parent
local targetPosition = Vector3.new(0, 10, 0)
local debounce = {}

pad.Touched:Connect(function(hit)
    local character = hit:FindFirstAncestorOfClass("Model")
    local player = character and Players:GetPlayerFromCharacter(character)
    if not player or debounce[player] then return end

    local root = character:FindFirstChild("HumanoidRootPart")
    if not root then return end

    debounce[player] = true
    root.CFrame = CFrame.new(targetPosition)
    task.wait(1)
    debounce[player] = nil
end)

Players.PlayerRemoving:Connect(function(player)
    debounce[player] = nil
end)
$code$, array['obby','teleport','Workspace','Script'], true
where not exists (select 1 from public.roblox_scripts where title='Basit dokunma teleportu');
