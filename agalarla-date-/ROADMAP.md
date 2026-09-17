# Agalarla Date — Geliştirme Planı

## Ürün kapsamı

Üç kişilik ekip için ilk sürüm: rastgele sesli eşleşme, konuşma süresine göre özellik açılması, karşılıklı arkadaşlık ve güvenli görüntülü görüşme.

Ayrıntılı akış: [Rastgele sohbet ve zamanla açılan özellikler](TIMED_UNLOCK_FLOW.md)

Görev sahipliği, sprint teslimleri ve agentic çalışma yöntemi: [Üç kişilik agentic engineering sprint planı](TEAM_SPRINT_PLAN.md)

## Ekip paylaşımı

- **Kişi 1 — Ürün/Frontend:** onboarding, eşleşme kuyruğu, görüşme ekranı, sayaç ve izin/onay arayüzleri.
- **Kişi 2 — Backend/Realtime:** kullanıcı, eşleştirme kuyruğu, oturum sayacı, arkadaşlık ve WebSocket servisleri.
- **Kişi 3 — WebRTC/Güvenlik/QA:** ses-video altyapısı, moderasyon, engelle/raporla, analitik, test ve deployment.

## Aşamalar

### Aşama 0 — 2–3 gün: Ürün ve mimari kararları

- Hedef kullanıcı, pilot bölge ve eşleştirme filtrelerini kesinleştir.
- Görüşme ekranı, 30 saniye ve 120 saniye açılma durumlarının wireframe'ini hazırla.
- Mobil/web platformu, backend, veritabanı ve WebRTC sağlayıcısını seç.
- `main` koruması, PR şablonu, CI ve ortam değişkenlerini kur.
- KVKK/GDPR veri haritası ve içerik saklama politikasını yaz.

### Aşama 1 — 1. hafta: Hesap, profil ve kuyruk

- Auth, 18+ kontrolü ve topluluk kuralları onayı.
- Kısa profil: takma ad, fotoğraf, yaş, dil ve ilgi alanları.
- Tercih filtreleri ve rastgele eşleştirme kuyruğu.
- Engellenen veya yakın zamanda görüşülen kullanıcıları hariç tutma.

### Aşama 2 — 2. hafta: Sesli oturum ve güvenilir sayaç

- WebRTC sesli görüşme ve bağlantı durumları.
- Sunucu kontrollü aktif oturum sayacı ve heartbeat.
- Bağlantı kopması/yeniden bağlanma davranışı.
- Geç, oturumu bitir, engelle ve raporla akışları.

### Aşama 3 — 3. hafta: 30 saniye arkadaşlık kilidi

- 30 saniye sonunda arkadaşlık isteği özelliğini aç.
- Tek yönlü istek ve karşılıklı arkadaşlık durumları.
- Karşılıklı arkadaşlık sonrası kalıcı mesajlaşma.
- Sayaç ve arkadaşlık API'leri için entegrasyon testleri.

### Aşama 4 — 4. hafta: 120 saniye video kilidi

- 120 saniye sonunda video isteği özelliğini aç.
- İki taraflı açık onay ve kamera/mikrofon izinleri.
- Ses-video geçişi ve reddetme durumunda sese devam.
- Cihaz, bağlantı kalitesi ve izin hata ekranları.

### Aşama 5 — 5. hafta: Moderasyon ve kapalı pilot

- Moderasyon kuyruğu, rate limit ve risk sinyalleri.
- Temel analitik dashboard'u ve uzaktan eşik ayarı.
- E2E, erişilebilirlik, mobil responsive ve yük testleri.
- 20–50 kişilik kapalı pilot; 30/120 saniye eşiklerini veriye göre değerlendir.

## İlk GitHub issue listesi

- `#1` Define random session product rules and acceptance criteria
- `#2` Choose app stack and WebRTC provider
- `#3` Initialize app shell, CI and environments
- `#4` Implement auth, 18+ gate and short profiles
- `#5` Implement preference-based random matching queue
- `#6` Implement realtime session state and server timer
- `#7` Implement audio call and reconnect flow
- `#8` Unlock friend request at configurable threshold
- `#9` Implement mutual friendship and persistent chat
- `#10` Unlock bilateral video request at configurable threshold
- `#11` Implement skip, block, report and moderation queue
- `#12` Add analytics, remote configuration and pilot dashboard
- `#13` Run closed pilot and tune unlock thresholds

## Yayına çıkış kabul kriterleri

- Uygun iki kullanıcı rastgele eşleşip sesli görüşmeye başlayabiliyor.
- Aktif süre sunucuda sayılıyor ve bağlantı yokken ilerlemiyor.
- Arkadaşlık isteği varsayılan olarak 30 saniyede açılıyor.
- Video isteği varsayılan olarak 120 saniyede açılıyor ve iki tarafın onayını gerektiriyor.
- Kullanıcı ilk saniyeden itibaren geçebiliyor, engelleyebiliyor ve raporlayabiliyor.
- Engellenen kullanıcılar tekrar eşleşmiyor.
- Yalnızca karşılıklı arkadaş olan kullanıcılar kalıcı mesajlaşabiliyor.
- Kritik akışlar otomatik testlerle korunuyor.

## Takım çalışma kuralları

- Feature branch → PR → code review → CI → merge.
- Her özellik için bir sorumlu, bir reviewer ve ölçülebilir kabul kriterleri bulunmalı.
- Secret, gerçek kullanıcı fotoğrafı, ses veya mesaj repoya konulmamalı.
- Her hafta demo ve metrik/geri bildirim değerlendirmesi yapılmalı.
- Sayaç eşikleri kod değişikliği olmadan yapılandırılabilmeli.
