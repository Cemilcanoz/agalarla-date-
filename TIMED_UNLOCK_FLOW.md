# Rastgele Sohbet ve Zamanla Açılan Özellikler

## Temel deneyim

Kullanıcılar tercihlerine göre rastgele eşleştirilir. Görüşme ilerledikçe yeni özellikler açılır; hiçbir aşamada kullanıcı görüşmeye devam etmeye zorlanmaz.

| Aktif oturum süresi | Açılan özellik | Koşul |
| --- | --- | --- |
| 0 saniye | Sesli sohbet, kısa profil ve ilgi alanları | İki kullanıcı da eşleşme kuyruğunda |
| 30 saniye | Arkadaşlık isteği gönderme | Sayaç sunucu tarafından doğrulanmış |
| 120 saniye | Görüntülü görüşme isteği | İki tarafın ayrı ayrı onayı gerekir |
| Oturum sonu | Kalıcı sohbet | İki taraf da arkadaşlık isteğini kabul etmiş olmalı |

Bu değerler kod içine sabitlenmemeli. Yönetim paneli veya uzaktan yapılandırma ile değiştirilebilmeli ve A/B testine uygun tutulmalı.

## Örnek kullanıcı akışı

1. Kullanıcı “Rastgele eşleş” düğmesine basar.
2. Sistem yaş, dil, mesafe ve tercih uyumuna göre uygun bir kullanıcı bulur.
3. Sesli görüşme başlar; kullanıcılar takma ad, yaş aralığı ve ortak ilgi alanlarını görür.
4. Her iki kullanıcı bağlıyken sunucu aktif süreyi sayar.
5. 30. saniyede “Arkadaşlık isteği gönder” özelliği açılır.
6. 120. saniyede “Görüntülü görüşme iste” özelliği açılır.
7. Karşı taraf kabul ederse kamera açılır; kabul etmezse sesli sohbet devam eder.
8. Kullanıcılardan biri istediği an geçebilir, engelleyebilir veya raporlayabilir.
9. Oturum sonunda karşılıklı arkadaşlık varsa kalıcı sohbet oluşur; yoksa kullanıcılar yeniden kuyruğa döner.

## Sayaç kuralları

- Sayaç istemciden değil sunucudan yönetilir.
- Yalnızca iki taraf da bağlıyken ilerler.
- Bağlantı kesilince durur; kısa süre içinde yeniden bağlanılırsa kaldığı yerden devam eder.
- Arka planda açık bırakmayı azaltmak için düzenli bağlantı heartbeat'i gerekir.
- Aynı iki kullanıcının tekrar eşleşmesi durumunda süre birleştirilmez; yeni oturum başlar.
- “30 saniye” ve “120 saniye” eşikleri analitik sonucuna göre değiştirilebilir.

## Güvenlik kuralları

- Geç, engelle ve raporla düğmeleri ilk saniyeden itibaren erişilebilir olmalı.
- Video hiçbir zaman otomatik açılmamalı; iki taraflı açık onay gerekir.
- Kamera ve mikrofon izinleri yalnızca ihtiyaç anında istenmeli.
- Görüşmeler varsayılan olarak kaydedilmemeli.
- 18+ kontrolü ve topluluk kurallarını kabul etme zorunlu olmalı.
- Rapor edilen oturuma kullanıcı kimlikleri, zaman damgaları ve teknik olay kayıtları bağlanmalı; içerik saklama politikası ayrıca tanımlanmalı.
- Engellenen kullanıcılar tekrar eşleştirilmemeli.
- Hızlı geçme, spam, otomasyon ve seri rapor alma durumları rate limit/risk puanı ile ele alınmalı.

## Durum modeli

```text
QUEUED
  -> CONNECTING
  -> AUDIO_ACTIVE
  -> FRIEND_REQUEST_UNLOCKED (30 sn)
  -> VIDEO_REQUEST_UNLOCKED (120 sn)
  -> VIDEO_ACTIVE (iki taraf onaylarsa)
  -> ENDED
  -> FRIENDS (karşılıklı istek varsa)
```

`BLOCKED` ve `REPORTED` durumları akışın her aşamasından erişilebilir olmalıdır.

## Veri modeli taslağı

- `random_sessions`: kullanıcılar, durum, başlangıç/bitiş, aktif saniye, bitiş nedeni.
- `session_participants`: bağlantı durumu, onaylar, arkadaşlık isteği zamanı.
- `feature_unlocks`: özellik, eşik, açılma zamanı, yapılandırma sürümü.
- `friendships`: gönderen, alan, durum, karşılıklı eşleşme zamanı.
- `reports`: raporlayan, raporlanan, oturum, kategori, moderasyon durumu.
- `blocks`: engelleyen, engellenen, oluşturulma zamanı.

## Ölçülecek olaylar

- `queue_joined`, `session_started`, `session_ended`
- `friend_unlock_reached`, `friend_request_sent`, `friendship_created`
- `video_unlock_reached`, `video_requested`, `video_accepted`, `video_declined`
- `skip_clicked`, `block_created`, `report_submitted`

Ana ürün metrikleri: 30 ve 120 saniyeye ulaşma oranı, karşılıklı arkadaşlık oranı, video kabul oranı, oturum başına rapor oranı ve 7 günlük geri dönüş oranı.

## Kabul kriterleri

- Sayaç sayfa yenileme veya istemci saatini değiştirme ile ilerletilemiyor.
- Arkadaşlık düğmesi 30 saniyeden önce kullanılamıyor.
- Video isteği 120 saniyeden önce gönderilemiyor.
- Video yalnızca iki kullanıcının onayıyla başlıyor.
- Engelleme sonrasında aynı kullanıcılar yeniden eşleşmiyor.
- Oturum biterken karşılıklı arkadaşlık yoksa kalıcı mesajlaşma açılmıyor.
