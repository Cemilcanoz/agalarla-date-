# Agalarla Date

Üç kişilik ekip tarafından geliştirilen, güvenli ve kişilik odaklı dating app MVP'si.

## Belgeler

- [Ürün araştırması](PRODUCT_RESEARCH.md)
- [Geliştirme planı](ROADMAP.md)
- [Üç kişilik sprint ve agentic engineering planı](TEAM_SPRINT_PLAN.md)
- [Rastgele sohbet ve zamanla açılan özellikler](TIMED_UNLOCK_FLOW.md)
- [İstemci UX sözleşmesi](CLIENT_UX_SPEC.md)
- [Mimari ve realtime sözleşmesi](docs/ARCHITECTURE.md)

## Yerel doğrulama

```bash
npm ci
npm run lint
npm run type-check
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```
