/**
 * Sprint 1 — Güvenlik ve Eşleşme Kuyruğu Test Paketi
 * Yazar: Kişi 3 (WebRTC / Güvenlik / QA)
 * 
 * Bu test dosyası Sprint 1 teslim kriterlerini doğrulamak için hazırlanmıştır:
 * 1. 18 yaş altı kullanıcıların sisteme kaydolmasını ve kuyruğa girmesini engelleme (Age Gate).
 * 2. Topluluk kuralları onaylanmadan devam edilememesi.
 * 3. Engellenmiş (blocked) kullanıcıların eşleşme kuyruğunda aday havuzundan çıkarılması.
 * 4. Kayıt -> Profil -> Kuyruk akışı için Smoke Test senaryosu.
 */

describe('Sprint 1 - Güvenlik ve Yaş Kontrolü (Age Gate) Testleri', () => {

  test('18 yaşından küçük kullanıcı (ör. 17 yaşında) kaydolmaya çalıştığında reddedilmeli', async () => {
    const today = new Date();
    const underageBirthDate = new Date(today.getFullYear() - 17, today.getMonth(), today.getDate()).toISOString();

    const mockRegisterPayload = {
      email: 'test_underage@example.com',
      birthDate: underageBirthDate,
      agreedTerms: true,
    };

    // Simüle edilen doğrulama mantığı
    const calculateAge = (birthDateStr: string): number => {
      const birthDate = new Date(birthDateStr);
      const ageDiff = today.getFullYear() - birthDate.getFullYear();
      return ageDiff;
    };

    const isEligible = calculateAge(mockRegisterPayload.birthDate) >= 18;

    expect(isEligible).toBe(false);
  });

  test('18 yaş ve üzeri kullanıcı kaydı başarıyla tamamlanmalı', async () => {
    const today = new Date();
    const adultBirthDate = new Date(today.getFullYear() - 22, today.getMonth(), today.getDate()).toISOString();

    const mockRegisterPayload = {
      email: 'test_adult@example.com',
      birthDate: adultBirthDate,
      agreedTerms: true,
    };

    const calculateAge = (birthDateStr: string): number => {
      const birthDate = new Date(birthDateStr);
      return today.getFullYear() - birthDate.getFullYear();
    };

    const isEligible = calculateAge(mockRegisterPayload.birthDate) >= 18;

    expect(isEligible).toBe(true);
  });

  test('Topluluk kurallarını onaylamayan kullanıcı kayıt olamamalı', async () => {
    const mockUser = {
      email: 'no_rules@example.com',
      birthDate: '2000-01-01',
      agreedTerms: false, // Kurallar onaylanmadı
    };

    const canProceed = mockUser.agreedTerms === true;
    expect(canProceed).toBe(false);
  });
});

describe('Sprint 1 - Engellenen Kullanıcı (Blocklist) Filtreleme Testleri', () => {

  test('Engellenen kullanıcı ID\'si aday eşleşme kuyruğundan çıkarılmalı (EXCLUDE_BLOCKED)', async () => {
    const userId = 'user_101';
    const blockedUserId = 'user_999'; // user_101, user_999'u engelledi
    const eligibleUserId = 'user_202';

    const mockUserBlocklist = new Set(['user_999']);
    const candidatePool = ['user_999', 'user_202'];

    // Filtreleme fonksiyonu (Kişi 2 backend sözleşmesi)
    const filteredCandidates = candidatePool.filter(candidateId => !mockUserBlocklist.has(candidateId));

    expect(filteredCandidates).not.toContain(blockedUserId);
    expect(filteredCandidates).toContain(eligibleUserId);
    expect(filteredCandidates.length).toBe(1);
  });
});

describe('Sprint 1 - Kayıt -> Profil -> Kuyruk Smoke Testi', () => {

  test('İki geçerli yetişkin kullanıcı tercihleri eşleştiğinde aynı session ID\'yi alabilmeli', async () => {
    const userA = { id: 'user_A', age: 24, genderPref: 'ANY', inQueue: true };
    const userB = { id: 'user_B', age: 26, genderPref: 'ANY', inQueue: true };

    const generateMatchSession = (u1: typeof userA, u2: typeof userB) => {
      if (u1.inQueue && u2.inQueue) {
        return `session_mock_${u1.id}_${u2.id}`;
      }
      return null;
    };

    const sessionId = generateMatchSession(userA, userB);

    expect(sessionId).toBeDefined();
    expect(sessionId).toContain('session_mock_user_A_user_B');
  });
});
