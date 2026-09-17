# WebRTC Teknik Araştırması ve Medya Mimarisi (WEBRTC_SPIKE.md)

**Yazar:** Kişi 3 (WebRTC / Güvenlik / QA)  
**Proje:** Agalarla Date / Efsanevi Ev Macerası  
**Tarih:** 2026-09-17  
**Durum:** Onaylandı / Sprint 0 Çıktısı  

---

## 1. Amaç ve Kapsam

Bu doküman, Agalarla Date platformunun sesli ve görüntülü görüşme altyapısı için kullanılacak WebRTC mimarisini, teknik sağlayıcı karşılaştırmalarını, izin yönetimini ve gizlilik kararlarını belirler.

---

## 2. Sağlayıcı Karşılaştırması ve Seçimi

Rastgele eşleşen 1-on-1 kullanıcı görüşmeleri için 3 farklı mimari değerlendirilmiştir:

| Kriter | P2P WebRTC (Mesh / Direct STUN/TURN) | LiveKit (Self-Hosted / Cloud SFU) | Agora / Twilio RTC |
| --- | --- | --- | --- |
| **Mimari** | Doğrudan İstemciden İstemciye (P2P) | Selective Forwarding Unit (SFU) | Üçüncü Parti PaaS SFU |
| **Gecikme** | En Düşük (<100ms) | Düşük (<150ms) | Düşük (<150ms) |
| **Sunucu Maliyeti** | Çok Düşük (Sadece TURN sunucusu masrafı) | Orta (Sunucu / Cloud harcaması) | Yüksek (Dakika başı ödeme) |
| **Mobil Uyumluluk** | Yüksek (Safari/Chrome native WebRTC) | Yüksek (SDK entegrasyonu) | Yüksek |
| **Bant Genişliği** | 1-on-1 için ideal (düşük overhead) | Sunucu üzerinden aktarım | Sunucu üzerinden aktarım |
| **Gizlilik / Veri Ulaşımı** | Sunucuda medya verisi durmaz | Medya sunucudan geçer | Medya 3. taraf buluttan geçer |

### 🎯 Karar: LiveKit Open-Source SFU (veya P2P Fallback ile TURN Integration)

- **Birincil Tercih:** **LiveKit SFU** (Open-Source self-hosted veya LiveKit Cloud ücretsiz katman).
- **Gerekçe:** 1-on-1 görüşmeler için P2P ideal görünse de, mobil operatörlerdeki (NAT / CGNAT) bağlantı engellerini aşmak ve dinamik ses-video geçişlerini, ağ kalitesi metriklerini tek tip yönetebilmek için SFU / Coturn temelli güvenilir bir katman gereklidir.
- **Maliyet ve Limitler:** 
  - LiveKit Cloud başlangıç katmanı (10.000 dakika/ay ücretsiz) pilot çalışma için sıfır maliyet sağlar.
  - İlerleyen aşamada kendi Coturn / LiveKit sunucumuza geçiş yapılabilir.

---

## 3. Akış ve Bağlantı Mimarisi

### 3.1. Sesli Görüşme Nasıl Kurulacak?
1. Eşleşme gerçekleştiğinde Kişi 2'nin **Match/Session Service**'ı `session_id` ve WebRTC katılım token'ını üretir.
2. İstemciler `session_id` ile medya odasına katılır.
3. **Yalnızca Mikrofon Akışı (Audio Track)** başlatılır. Kamera kapalı tutulur.
4. Ağ kalitesi (jitter, packet loss, RTT) anlık izlenir.

### 3.2. Görüntülü Görüşmeye Geçiş (120. Saniye Kuralı)
1. Eşleşmenin ilk 120 saniyesinde video seçeneği pasiftir.
2. Sunucu 120. saniyede `video_unlocked` olayını tetikler.
3. Taraf 1 video isteği gönderir -> Taraf 2'ye onay modalı açılır.
4. **Çift Onay (Dual Consent):** İki taraf da onay verirse, local `navigator.mediaDevices.getUserMedia({ video: true })` çağrılır ve video akışı (Video Track) mevcut görüşmeye eklenir (Renegotiation / Track Publish).
5. Taraflardan biri reddederse veya izin vermezse görüşme **yalnızca sesli** olarak kesintisiz devam eder.

---

## 4. İzin Yönetimi ve Tarayıcı Uyumluluğu

### 4.1. Kademeli İzin Alma (Progressive Permission Request)
- **Kayıt / Eşleşme Öncesi:** Kamera ve mikrofon izni ISTENMEZ.
- **Görüşme Başlangıcı (0. sn):** Yalnızca `microphone` izni istenir.
- **Video Onayı (120. sn+):** Yalnızca `camera` izni istenir.

### 4.2. İzin Reddi Senaryoları (Graceful Fallback)
- **Mikrofon İzni Reddedilirse:** Kullanıcıya *"Mikrofon izni olmadan sesli görüşmeye katılamazsınız"* uyarısı verilir, kullanıcı kuyruktan çıkarılır.
- **Kamera İzni Reddedilirse:** Video geçişi iptal edilir, sesli görüşme **kesintisiz biçimde devam eder**, kullanıcıya bilgilendirme banner'ı gösterilir.

### 4.3. Mobil ve Masaüstü Tarayıcı Uyum Matrisi
- **Safari iOS:** Autoplay kısıtlamaları nedeniyle ses çalma `User Interaction` (tıklama) ile tetiklenen HTML5 Audio Context üzerinden başlatılmalıdır.
- **Chrome / Edge / Firefox (Android & Desktop):** Standard `getUserMedia` ve `RTCPeerConnection` / LiveKit Web SDK desteklenir.

---

## 5. Görüşme Kayıt Politikası (Privacy Policy)

> 🔒 **KESİN KARAR: Görüşmeler Varsayılan Olarak Kesinlikle KAYDEDİLMEZ.**

- **Neden?** 
  - Kişisel Verilerin Korunması Kanunu (KVKK) ve GDPR uyumu.
  - Çocuk ve genç kullanıcıların mahremiyet güvenliği.
  - Sunucu depolama ve bant genişliği maliyetlerini sıfırlama.
- **Teknik Önlem:** Sunucu tarafında (SFU / Coturn) kayıt (recording/egress) modülleri tamamen devre dışı bırakılmıştır. Medya akışları uçtan uca TLS/SRTP ile şifrelenir ve bellekte tamponlanmadan aktarılır.

---

## 6. Bağlantı Kopması ve Yeniden Bağlanma (Reconnection)

1. Bağlantı koptuğunda (ICE Connection State = `disconnected` / `failed`):
   - Arayüzde *"Yeniden bağlanılıyor..."* göstergesi çıkar.
   - İstemci 15 saniye boyunca otomatik ICE Re-check / SFU Reconnect dener.
2. 15 saniye içinde bağlantı kurulamazsa:
   - Oturum sunucu tarafından `ended_reason: connection_lost` ile sonlandırılır.
   - Sayaç durdurulur ve kullanıcılar ana ekrana yönlendirilir.

---

## 7. Özet ve Sonraki Adımlar

- [x] WebRTC Sağlayıcı Kararı: **LiveKit Open-Source / Cloud SFU**
- [x] Kayıt Politikası: **Sıfır Kayıt (No Recording)**
- [x] İzin Yönetimi: **Kademeli İzin (Progressive Permission)**
- [next] `docs/THREAT_MODEL.md` ile güvenlik kurallarını tanımlama.

---

## 8. Uygulanan İstemci Sözleşmesi

İstemci ses bağlantısı `src/media/livekitAudio.ts` üzerinden başlatılır.

- Token endpoint'i: `POST /v1/sessions/:sessionId/media-token`
- Kimlik doğrulama: güvenli HTTP-only oturum çerezi (`credentials: include`)
- Tekrar deneme güvenliği: her istek için `Idempotency-Key`
- Beklenen yanıt: `{ url, token, roomName, expiresAt }`
- Token yalnızca bellekte tutulur; loglanmaz veya kalıcı depolamaya yazılmaz.
- Mikrofon izni token isteğinden hemen önce ve yalnızca görüşme başlatılırken alınır.
- İzin reddedilirse token istenmez ve `MICROPHONE_DENIED` sonucu üretilir.
- LiveKit reconnect olayları istemciye `reconnecting`, `connected` ve `disconnected` olarak aktarılır.

Backend, isteği yapan kullanıcının ilgili session'ın aktif katılımcısı olduğunu doğrulamalı, token'ı
yalnızca o session'a ait room için üretmeli ve kısa süreli tutmalıdır. Bu kontrol istemciden gelen
`roomName` veya kullanıcı kimliğine güvenmemelidir.

### Manuel iki tarayıcı smoke testi

1. Backend'in iki test kullanıcısını aynı `sessionId` ile eşleştirdiğini doğrula.
2. İki ayrı tarayıcı profilinde sesli görüşmeyi başlat.
3. Yalnızca mikrofon izninin istendiğini ve iki tarafın birbirini duyduğunu doğrula.
4. Bir sekmeyi çevrimdışı yap; arayüzün `reconnecting` durumuna geçtiğini doğrula.
5. 15 saniye içinde bağlantıyı geri getir ve sesin devam ettiğini doğrula.
6. 15 saniyeyi aşan kesintide backend'in session'ı `connection_lost` ile bitirdiğini doğrula.
7. Konsol ve ağ loglarında token, ses içeriği veya kişisel veri bulunmadığını kontrol et.
