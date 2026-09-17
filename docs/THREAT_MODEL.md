# Güvenlik ve Tehdit Modeli (THREAT_MODEL.md)

**Yazar:** Kişi 3 (WebRTC / Güvenlik / QA)  
**Proje:** Agalarla Date  
**Tarih:** 2026-09-17  
**Durum:** Onaylandı / Sprint 0 Çıktısı  

---

## 1. Temel Güvenlik Prensipleri

Sistem tasarlanırken aşağıdaki **değişmez güvenlik kuralları** uygulanmıştır:

1. **Her Zaman Erişilebilir Kontroller:** *"Geç"*, *"Engelle"* ve *"Raporla"* butonları görüşmenin veya akışın her aşamasında ekranda görünür ve tek tıkla çalışabilir olmalıdır.
2. **Çift Onaylı Görüntü (Dual Consent Video):** 120 saniyelik süre barajı aşılsa dahi video kamerası **yalnızca iki taraf da açıkça onay verdiğinde** açılır.
3. **Kayıtsız Medya Akışı (Zero Recording):** Görüntülü ve sesli görüşmeler sunucuda veya istemcide hiçbir şekilde kaydedilmez.
4. **Veri Minimizasyonu ve Gizlilik:** Kullanıcıların hassas kişisel verileri, gerçek isimleri, konum koordinatları veya kamera görüntüleri sunucularda saklanmaz.

---

## 2. Tehdit Matrisi ve Koruma Mekanizmaları

### 2.1. 18 Yaş Altı Kullanıcı Girişi
- **Tehdit:** Reşit olmayan çocukların platformu kullanmaya çalışması.
- **Risk Seviyesi:** Kritik (Yasal ve Etik Risk)
- **Önlem / Kontrol:**
  - Onboarding aşamasında doğum tarihi doğrulaması (Age Gate).
  - 18 yaş altı tespit edilen hesapların anında engellenmesi.
  - Topluluk kuralları onay zorunluluğu.
  - Sprint 1'de otomatik `age_gate.test.ts` ile uç durumların doğrulanması.

### 2.2. Sahte Profil ve Bot Kullanımı
- **Tehdit:** Bot hesapların kuyruğu işgal etmesi veya yanıltıcı profil bilgileri kullanımı.
- **Risk Seviyesi:** Yüksek
- **Önlem / Kontrol:**
  - Eşleşme kuyruğuna girişlerde IP & Cihaz bazlı Rate Limiting (Kişi 2 API servisi).
  - Oturum açma süreçlerinde CAPTCHA / Token doğrulaması.
  - Şüpheli hızlı eşleşme isteklerinde soğuma süresi (Cooldown).

### 2.3. Taciz ve Uygunsuz Görüşme Davranışları
- **Tehdit:** Görüşme sırasında sözel veya görsel taciz, nefret söylemi, spam.
- **Risk Seviyesi:** Kritik
- **Önlem / Kontrol:**
  - Görüşme ekranında her saniye erişilebilir **"Engelle & Raporla"** butonu.
  - Raporlama Kategorileri:
    1. Taciz ve Rahatsız Etme
    2. Sahte Profil / Yanıltıcı Bilgi
    3. Uygunsuz İçerik / Görsel
    4. Spam ve Reklam
    5. Güvenlik Tehdidi
  - Engelleme butonuna tıklandığı an WebRTC medya bağlantısı **milisaniyeler içinde kapatılır**.

### 2.4. Engellenen Kullanıcıların Tekrar Eşleşmesi
- **Tehdit:** Kullanıcının engellediği bir kişiyle gelecekteki rastgele eşleşmelerde tekrar karşılaşması.
- **Risk Seviyesi:** Yüksek
- **Önlem / Kontrol:**
  - Veritabanı ve Redis seviyesinde `user_blocklist` tablosu.
  - Eşleştirme kuyruğu algoritmasında engellenen ve engelleyen ID'lerin adayı elemesi (`EXCLUDE IN (blocked_ids)`).
  - Sprint 1'de `block_queue.test.ts` ile test edilmesi.

### 2.5. Kamera / Mikrofon İzni Reddi Kötüye Kullanımı
- **Tehdit:** Kullanıcının izin vermeyip arayüzde kilitlenmeye (soft-lock) neden olması.
- **Risk Seviyesi:** Orta
- **Önlem / Kontrol:**
  - Mikrofon izni reddedilirse kullanıcı kuyruğa sokulmaz.
  - Kamera izni reddedilirse sesli görüşme **kesintisiz devam eder**. Video isteği otomatik iptal edilir.

### 2.6. Raporların Moderasyon Paneline Aktarılması ve İzlenebilirlik
- **Tehdit:** Şikayet edilen olayların kanıtsız kalması veya takipsizliği.
- **Risk Seviyesi:** Orta
- **Önlem / Kontrol:**
  - Rapor oluşturulduğunda olayın `session_id`, `reporter_id`, `reported_id`, `category` ve `timestamp` verileri tutulur.
  - **Medya içeriği kaydedilmediği için** moderasyon kararları kullanıcı geçmişi, rapor sıklığı ve seans süreleri üzerinden yürütülür.
  - Çatışmalı durumlarda kullanıcı geçici olarak askıya alınır.

---

## 3. Veri Güvenliği ve Gizlilik Mimarisi

```
[İstemci 1] <=== Encrypted WebRTC (SRTP/DTLS) ===> [İstemci 2]
     ||                                                  ||
     || (Sadece Olaylar: Join, Leave, Report, Mute)      ||
     \/                                                  \/
[Signaling / API Server] ---> [Redis Blocklist] ---> [Moderation Queue]
(No Audio/Video Data Saved)
```

- **Veri Saklama Süresi:** Oturum meta verileri (süre, bitiş nedeni, rapor kimliği) haricinde hiçbir ses/video paketi diskte saklanmaz.
- **Kişisel Veri Loglama Yasağı:** Sistem loglarına (Winston/Pino) e-posta, telefon numarası veya IP adresleri açık metin olarak yazılamaz (Anonymized / Salted hash).

---

## 4. Güvenlik Kontrol Listesi (PR & Deployment)

Her Pull Request ve Sürüm öncesinde Kişi 3 tarafından doğrulanacak güvenlik maddeleri:

- [ ] Engelleme işlemi aktif WebRTC medyasını anında kesiyor mu?
- [ ] Engellenen ID'ler eşleşme kuyruğunda filtreleniyor mu?
- [ ] 120 saniyeden önce video isteği backend tarafından reddediliyor mu?
- [ ] Video sadece çift onay ile mi açılıyor?
- [ ] Loglarda kişisel veri (PII) veya medya akış verisi var mı?
- [ ] Rate limit kuralları çalışıyor mu?
