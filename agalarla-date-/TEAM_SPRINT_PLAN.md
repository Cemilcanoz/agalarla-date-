# Üç Kişilik Agentic Engineering Sprint Planı

## Amaç

Üç geliştiricinin aynı ürünü paralel geliştirmesi, birbirini beklemeden ilerlemesi ve her sprint sonunda çalışan bir dikey dilim teslim etmesi. AI agent'lar hızlandırıcıdır; ürün, güvenlik ve merge sorumluluğu insanlardadır.

Sprint süresi bir haftadır. Sprint 0 yalnızca 2–3 gün sürer. Toplam ilk pilot süresi yaklaşık 5,5 haftadır.

## Roller ve nedenleri

| Kişi | Ana rol | Sahip olduğu alanlar | Neden |
| --- | --- | --- | --- |
| Kişi 1 | Ürün ve istemci | Kullanıcı akışları, mobil/web arayüzü, erişilebilirlik, istemci durumları | Kullanıcı deneyiminin tek elde tutarlı kalmasını sağlar |
| Kişi 2 | Backend ve realtime | API, veritabanı, eşleştirme kuyruğu, sunucu sayacı, arkadaşlık ve mesajlaşma | Süre ve oturum kuralları güvenilir bir sunucu otoritesi gerektirir |
| Kişi 3 | WebRTC, güvenlik ve kalite | Ses/video, izinler, engelle/raporla, moderasyon, CI ve E2E test | Medya ve güvenlik uygulamanın en riskli, uzmanlık isteyen bölümüdür |

Bu ayrım sahipliği gösterir; silolar oluşturmaz. Her PR başka bir kişi tarafından incelenir ve her sprintte ortak entegrasyon yapılır.

## İnceleme düzeni

- Kişi 1'in PR'larını Kişi 3 inceler.
- Kişi 2'nin PR'larını Kişi 1 inceler.
- Kişi 3'ün PR'larını Kişi 2 inceler.
- Güvenlik, veri silme, kimlik doğrulama ve video izni değişikliklerinde iki reviewer gerekir.
- Sprint entegrasyon sorumlusu dönüşümlüdür: Sprint 1 Kişi 1, Sprint 2 Kişi 2, Sprint 3 Kişi 3; sonra döngü tekrar eder.

## Sprint 0 — Sözleşmeler ve temel kurulum

**Hedef:** Kod yazılmadan önce kullanıcı akışı, API sınırları ve güvenlik kararlarının netleşmesi.

### Kişi 1 — Ürün ve istemci

- Onboarding, kuyruk, sesli görüşme, 30 saniye arkadaşlık ve 120 saniye video ekranlarını wireframe olarak hazırlar.
- Her ekran için loading, empty, permission denied, reconnect ve error durumlarını tanımlar.
- Ortak UI token'larını ve istemci klasör yapısını kurar.

**Neden:** Backend ve WebRTC aynı durum isimlerini kullanabilsin; sonradan ekran-akış uyuşmazlığı oluşmasın.

### Kişi 2 — Backend ve realtime

- Sistem mimarisi ADR'sini, veri modelini ve API/WebSocket olay sözleşmesini hazırlar.
- Oturum durum makinesini ve sunucu kontrollü sayaç kurallarını tanımlar.
- Yerel geliştirme ortamı ve örnek environment dosyasını kurar.

**Neden:** Üç kişinin paralel çalışabilmesi için stabil bir sözleşme gerekir.

### Kişi 3 — WebRTC, güvenlik ve kalite

- WebRTC sağlayıcısı için küçük bir teknik deneme yapar; gecikme, maliyet ve mobil uyumluluğu kaydeder.
- Tehdit modeli çıkarır: sahte yaş, spam, kamera izni, taciz, tekrar eşleşme ve veri saklama.
- CI üzerinde lint, unit test ve secret scanning temelini kurar.

**Neden:** En pahalı teknik ve güvenlik riskleri geliştirme başlamadan görülür.

### Sprint çıkış kriteri

- Wireframe, API olayları, durum makinesi ve veri modeli ekipçe onaylanmış.
- Uygulama ve testler yerelde tek komutla çalışıyor.
- Ana branch korumalı; doğrudan push yerine PR akışı kullanılıyor.

## Sprint 1 — Hesap, profil ve rastgele eşleşme kuyruğu

**Hedef:** İki test kullanıcısı kayıt olup tercihleriyle kuyruğa girebilsin.

| Kişi | Görevler | Teslim |
| --- | --- | --- |
| Kişi 1 | Auth/onboarding ekranları, kısa profil, tercih ve kuyruk UI | Gerçek API'ye bağlanmış istemci akışı |
| Kişi 2 | Auth, profil, tercih, block hariç tutma ve eşleştirme kuyruğu API'leri | Testli backend dikey dilimi |
| Kişi 3 | Yaş kapısı, topluluk kuralları, izin hazırlığı, E2E test altyapısı | Kayıt→kuyruk smoke testi |

### Sprint çıkış kriteri

- İki kullanıcı tercihleri uygunsa aynı oturum kimliğini alıyor.
- Engellenmiş kullanıcılar aday havuzuna girmiyor.
- Auth ve kuyruk akışı otomatik testte geçiyor.

## Sprint 2 — Sesli görüşme ve güvenilir sayaç

**Hedef:** Rastgele eşleşen iki kullanıcı sesli konuşabilsin ve süre yalnızca ikisi de bağlıyken ilerlesin.

| Kişi | Görevler | Teslim |
| --- | --- | --- |
| Kişi 1 | Görüşme ekranı, sayaç, bağlantı/yeniden bağlanma, sessize alma ve geç düğmeleri | Tüm oturum durumlarını gösteren UI |
| Kişi 2 | Session service, heartbeat, sunucu sayacı, reconnect ve bitiş nedenleri | Manipüle edilemeyen süre servisi |
| Kişi 3 | WebRTC ses bağlantısı, mikrofon izinleri, cihaz seçimi ve bağlantı kalite logları | İki cihaz arasında çalışan ses |

### Entegrasyon sırası

1. Kişi 2 sahte olaylarla session API'sini yayınlar.
2. Kişi 1 bu sözleşmeye karşı UI'ı tamamlar.
3. Kişi 3 medya bağlantısını aynı session kimliğine bağlar.
4. Ekip birlikte bağlantı kesilmesi ve yeniden bağlanmayı test eder.

### Sprint çıkış kriteri

- İki cihaz arasında sesli görüşme çalışıyor.
- İstemci saati değiştirilince sayaç etkilenmiyor.
- Taraflardan biri çıkınca sayaç duruyor ve oturum kapanıyor.

## Sprint 3 — 30 saniye arkadaşlık ve kalıcı mesajlaşma

**Hedef:** Arkadaşlık özelliği doğru anda açılsın; yalnızca karşılıklı istekte kalıcı iletişim kurulsun.

| Kişi | Görevler | Teslim |
| --- | --- | --- |
| Kişi 1 | Kilitli/açık arkadaşlık UI'ı, istek durumu ve arkadaş sohbet ekranı | 30 saniyelik kullanıcı akışı |
| Kişi 2 | Yapılandırılabilir eşik, friend request, mutual friendship ve mesaj API'leri | Yetki kontrollü arkadaşlık servisi |
| Kişi 3 | Engelle/raporla, tekrar eşleşmeyi önleme ve moderasyon kuyruğu | Güvenlik dikey dilimi ve E2E testleri |

### Sprint çıkış kriteri

- 30 saniyeden önce backend arkadaşlık isteğini reddediyor.
- Karşılıklı istek oluşmadan kalıcı mesaj gönderilemiyor.
- Engellenen kullanıcılar yeniden eşleşmiyor.
- Rapor, ilgili oturum kimliğiyle moderasyon kuyruğuna düşüyor.

## Sprint 4 — 120 saniye görüntülü görüşme

**Hedef:** Video özelliği yalnızca süre eşiği ve iki tarafın açık onayıyla başlasın.

| Kişi | Görevler | Teslim |
| --- | --- | --- |
| Kişi 1 | Video isteği, kabul/ret, kamera önizleme ve izin hata ekranları | Onay odaklı video UX'i |
| Kişi 2 | Video unlock olayı, iki taraflı consent state ve uzaktan eşik yapılandırması | Yetkili video durum makinesi |
| Kişi 3 | WebRTC video geçişi, kamera değiştirme, düşük bağlantı kalitesi ve güvenli kapatma | Ses→video→ses geçişi |

### Sprint çıkış kriteri

- 120 saniyeden önce video isteği reddediliyor.
- Tek tarafın kabulü kamerayı açmıyor.
- Ret halinde sesli görüşme kesilmeden devam ediyor.
- Kamera izni reddi ve cihaz bulunamaması kullanıcıya açıkça gösteriliyor.

## Sprint 5 — Sertleştirme ve kapalı pilot

**Hedef:** 20–50 kullanıcıyla güvenli ve ölçülebilir pilot.

| Kişi | Görevler | Teslim |
| --- | --- | --- |
| Kişi 1 | Erişilebilirlik, metinler, analytics ekran olayları ve UX düzeltmeleri | Pilot kalitesinde istemci |
| Kişi 2 | Rate limit, kuyruk performansı, metrikler, veri silme ve yük testi | Operasyonel backend |
| Kişi 3 | Güvenlik testi, moderasyon runbook'u, E2E cihaz matrisi ve sürüm kontrol listesi | Pilot güvenlik/QA raporu |

### Sprint çıkış kriteri

- Kritik E2E akışları CI'da geçiyor.
- Crash/error takibi ve temel dashboard çalışıyor.
- Raporlara müdahale sorumlusu ve hedef süresi belirlenmiş.
- Pilot geri bildirim formu hazır.
- 30/120 saniye eşikleri kod deploy etmeden değiştirilebiliyor.

## Her görev için agentic engineering döngüsü

Her üç kişi de aşağıdaki döngüyü uygular:

1. **Issue'u bağlam paketi haline getir:** Amaç, kullanıcı hikâyesi, kapsam dışı maddeler, kabul kriterleri, ilgili sözleşmeler ve test komutları yazılır.
2. **Agent'a önce inceleme yaptır:** İlgili dosyaları, mevcut kalıpları ve riskleri bulmasını iste; ilk adımda kod yazdırma.
3. **Kısa planı insan onaylar:** Değişecek dosyalar, veri akışı, migration ve test yaklaşımı kontrol edilir.
4. **Küçük dikey dilim uygulat:** UI+API+test mümkün olduğunca tek kullanıcı davranışını tamamlar; dev PR üretilmez.
5. **Agent doğrulama yapar:** Unit/integration/E2E testleri, lint, type-check ve diff incelemesi çalıştırılır.
6. **İnsan kritik kararları inceler:** Auth, izin, veri saklama, SQL migration, rate limit ve medya davranışı özellikle kontrol edilir.
7. **PR kanıtla açılır:** Ekran görüntüsü, test çıktısı, bilinen risk ve rollback notu eklenir.
8. **Reviewer agent + insan incelemesi:** Reviewer kendi agent'ına issue ve diff'i verip hata/güvenlik/eksik test taraması yaptırır; merge kararını insan verir.
9. **Merge sonrası doğrulama:** Staging smoke testi yapılır ve issue kabul kriterleri tek tek işaretlenir.

## Standart agent görev metni

```text
Bu issue üzerinde çalış. Önce repoyu ve ilgili sözleşmeleri incele; henüz kod yazma.
Amaç, kapsam dışı maddeler ve kabul kriterlerine göre kısa bir uygulama planı çıkar.
Mevcut mimari kalıpları koru, güvenlik ve veri gizliliği risklerini belirt.
Plan onaylandıktan sonra küçük bir dikey dilim uygula.
Testleri, lint ve type-check'i çalıştır; başarısız sonuçları gizleme.
Sonunda değişen dosyaları, doğrulama kanıtlarını, riskleri ve geri alma yolunu özetle.
```

## Branch ve dosya sahipliği

- Branch biçimi: `sprint-<no>/<kisi>-<kisa-gorev>`; örnek: `sprint-2/kisi2-session-timer`.
- Aynı dosyada paralel büyük değişiklik yapılmaz; önce interface/contract PR'ı merge edilir.
- Veritabanı migration sırasını Kişi 2 yönetir.
- CI, güvenlik ve deployment dosyalarında Kişi 3 reviewer olmak zorundadır.
- Ortak UI bileşenleri ve route yapısında Kişi 1 reviewer olmak zorundadır.
- Her PR mümkünse 400 satırın altında tutulur; büyük işler birden fazla dikey dilime bölünür.

## Definition of Ready

Bir görev sprint'e alınmadan önce:

- Kullanıcı problemi ve beklenen sonuç yazılmış.
- Kabul kriterleri test edilebilir.
- API/event bağımlılıkları belli.
- Kapsam dışı maddeler yazılmış.
- Sorumlu ve reviewer atanmış.

## Definition of Done

Bir görev tamamlanmış sayılmak için:

- Kod, test ve gerekli migration tamamlanmış.
- Lint, type-check ve ilgili otomatik testler geçiyor.
- Güvenlik/gizlilik etkisi değerlendirilmiş.
- Log ve analytics olayları eklenmiş; kişisel veri loglanmıyor.
- PR başka bir kişi tarafından onaylanmış.
- Staging üzerinde kabul kriterleri doğrulanmış.
- İlgili dokümantasyon güncellenmiş.

## Takım ritmi

- **Pazartesi:** 45 dakika sprint planlama; issue'lar ve sözleşmeler kesinleştirilir.
- **Her gün:** 15 dakika; dün, bugün, engel ve değişen sözleşme paylaşılır.
- **Çarşamba:** 30 dakika entegrasyon kontrolü; bekleyen interface uyuşmazlıkları çözülür.
- **Cuma:** çalışan ürün demosu, metrik/test sonuçları, retrospektif ve sonraki sprint riskleri.

Sprint başarısı yazılan kod miktarıyla değil, çalışan ve test edilmiş kullanıcı davranışıyla ölçülür.
