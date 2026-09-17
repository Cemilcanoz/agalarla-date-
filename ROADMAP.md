# Agalarla Date — Geliştirme Planı

## Ürün kapsamı

Üç kişilik ekip için önerilen ilk sürüm: güvenli, kişilik odaklı eşleşme ve sohbet MVP'si. İlk sürüm tek bir platformda ve tek bir şehir/ülke pilotunda doğrulanmalı.

## Ekip paylaşımı

- **Kişi 1 — Ürün/Frontend:** onboarding, profil düzenleme, keşfet ve tasarım sistemi.
- **Kişi 2 — Backend:** auth, profil, tercih, beğeni/eşleşme, mesaj API'leri ve veritabanı.
- **Kişi 3 — Güvenlik/Platform/QA:** medya yükleme, moderasyon, bildirim, analitik, test ve deployment.

Her özellik için bir sorumlu, bir reviewer ve kabul kriterleri issue içinde yazılmalı.

## Aşamalar

### Aşama 0 — 2–3 gün: Karar ve temel kurulum

- Hedef kullanıcı ve pilot bölgeyi netleştir.
- Figma wireframe: onboarding, keşfet, profil, eşleşme, sohbet, raporla.
- Teknoloji kararını yazılı hale getir.
- `main` koruması, issue şablonu, PR şablonu, environment değişkenleri ve CI kurulumu.
- KVKK/GDPR veri haritası: yaş, konum, fotoğraf, mesaj ve rapor kayıtları.

### Aşama 1 — 1. hafta: Hesap ve profil

- Auth ve 18+ kontrolü.
- Profil CRUD, fotoğraf sıralama, prompt ve ilgi alanları.
- Yaş/mesafe/niyet tercihleri.
- Fotoğraf boyut/adet/doğrulama kontrolleri.

### Aşama 2 — 2. hafta: Keşfet ve eşleşme

- Tercihlere göre aday listeleme.
- Beğen/geç işlemleri ve tekrar işlem idempotency'si.
- Karşılıklı beğeniyle match oluşturma.
- Belirli fotoğraf/prompt'a yorum ekleme.
- Temel analitik event'leri.

### Aşama 3 — 3. hafta: Sohbet ve güvenlik

- Match odaklı mesajlaşma.
- Açılış sorusu önerileri; otomatik mesaj gönderilmez.
- Engelle, raporla, match kaldır.
- Moderasyon kuyruğu ve admin görünümü.
- Hesap silme, veri silme/indirme ve gizlilik metinleri.

### Aşama 4 — 4. hafta: Pilot ve kalite

- Push/e-posta bildirimleri.
- Buluşma planı: yer/zaman notu ve güvendiği kişiye paylaşım.
- Crash/error logging, rate limit, spam koruması.
- E2E test, erişilebilirlik ve mobil responsive kontrol.
- 10–20 kişilik kapalı pilot; haftalık geri bildirim görüşmeleri.

## İlk GitHub issue listesi

- `#1` Product brief and acceptance criteria
- `#2` Choose stack and document architecture
- `#3` Initialize app shell and CI
- `#4` Implement auth and 18+ gate
- `#5` Implement profile and media upload
- `#6` Implement preferences and discovery feed
- `#7` Implement likes, comments and matches
- `#8` Implement match chat
- `#9` Implement block/report/moderation flow
- `#10` Add analytics events and privacy controls
- `#11` Add notifications and date plan
- `#12` Run closed pilot and prioritize feedback

## Yayına çıkış kabul kriterleri

- Kullanıcı profilini tamamlayıp tercihlerini kaydedebiliyor.
- İki kullanıcı karşılıklı beğenince tek bir match oluşuyor.
- Yalnızca match olmuş kullanıcılar mesajlaşabiliyor.
- Kullanıcı her profili engelleyip raporlayabiliyor.
- Raporlar güvenli biçimde admin kuyruğuna düşüyor.
- Hesap silme, medya silme ve temel kişisel veri silme akışı çalışıyor.
- Kritik akışlar otomatik testlerle korunuyor.

## Takım çalışma kuralları

- Feature branch → PR → code review → CI → merge.
- Bir PR tek bir iş akışına odaklanmalı.
- Secret, gerçek kullanıcı fotoğrafı veya mesajı repoya konulmamalı.
- Her hafta: 30 dakika demo, 30 dakika metrik/geri bildirim değerlendirmesi.
- Yeni özellik ancak bir kullanıcı problemi ve ölçülebilir başarı metriğiyle açılmalı.
