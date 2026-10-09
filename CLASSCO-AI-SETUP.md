# CLASSCO AI — kurulum rehberi

Bu sistem EL CLASSCO GitHub Pages sitesine gerçek AI destekli müşteri hizmetleri ekler. Ziyaretçilerden hesap açmaları istenmez.

## Dosyalar
- `classco-ai.js`: Sitedeki sohbet arayüzü. API anahtarı içermez.
- `cloudflare-worker/classco-ai-worker.js`: Güvenli sunucu tarafı API köprüsü.
- `cloudflare-worker/wrangler.jsonc`: Worker yapılandırması.

## 1. OpenAI API anahtarı
1. OpenAI API hesabında bir API anahtarı oluştur.
2. Anahtarı GitHub'a, HTML'ye veya istemci JavaScript'ine yazma.
3. API kullanımının ücretli olabileceğini ve kullanım limitlerini kontrol et.

## 2. Cloudflare Worker oluştur
1. Cloudflare hesabında Workers & Pages bölümünü aç.
2. Create application / Create Worker ile `el-classco-ai` isimli Worker oluştur.
3. Worker kod düzenleyicisinde `cloudflare-worker/classco-ai-worker.js` dosyasının içeriğini ana Worker kodu olarak yapıştır ve Deploy et.
4. Worker > Settings > Variables and Secrets > Add bölümüne gir.
5. Tür olarak Secret seç; isim alanına `OPENAI_API_KEY`, değer alanına API anahtarını yaz. Düz metin variable olarak ekleme.
6. Worker'ı yeniden Deploy et.

Cloudflare rehberi: https://developers.cloudflare.com/workers/configuration/secrets/

## 3. Sitedeki endpoint'i bağla
1. Deploy sonrası Worker URL'sini kopyala; örneğin `https://el-classco-ai.ornek-hesap.workers.dev`.
2. GitHub'da `classco-ai.js` dosyasını aç.
3. Üstteki `API_ENDPOINT` değerini gerçek Worker URL'inle değiştir. URL'nin sonuna `/chat` ekleme.
4. Commit changes yap.

## 4. Kontrol
- Worker URL'sini tarayıcıda aç. JSON'da `"service":"EL CLASSCO AI"` ve `"status":"ready"` görünmeli.
- Siteyi açıp Ctrl+F5 yap.
- Sağ alttaki CLASSCO AI düğmesine basıp “İndirme bağlantısı açılmıyor” yaz.
- API anahtarının sayfa kaynak kodunda bulunmadığını doğrula.

## Güvenlik notları
- CORS yalnızca tarayıcı kaynaklarını kısıtlar; tek başına kötüye kullanımı önlemez.
- Kod her Worker isolate'ında basit bir dakika başına mesaj sınırı uygular. Kalıcı ve daha güçlü sınır için Cloudflare tarafında ayrıca rate-limiting kuralı ekle.
- OpenAI hesabında harcama limiti/bütçe uyarısı ayarla. Ücretsiz kullanım garantisi yoktur.
- Asistan gerçek destek bileti açmaz ve EL CLASSCO veritabanını otomatik okuyamaz; doğrulayamadığı konularda bunu açıkça söylemelidir.
- Özel alan adı kullanırsan Worker kodundaki `ALLOWED_ORIGINS` listesine kendi origin'ini ekle.
