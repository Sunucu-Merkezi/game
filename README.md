# Sunucu Merkezi

Tarayıcı tabanlı veri merkezi yönetim simülasyonu (tycoon). Sıfırdan başla; sunucu, rack, soğutma, network ve personel yönet; müşteri sözleşmeleri kazan; rakiplerle yarış; 3D veri merkezinde her şeyi elle yerleştir.

## Teknoloji

Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS · Zustand · TanStack Query · Recharts · three.js · Zod · Prisma · Vitest

## Kurulum

```bash
npm install
npm run db:push
npm run dev
```

Uygulama `http://localhost:3000` adresinde açılır. İlk kez kayıt ol; 60.000 ₺ ile başlarsın.

`.env` içeriği (`.env.example` örnek):

```
DATABASE_URL="file:./dev.db"
```

## Komutlar

| Komut | Açıklama |
| --- | --- |
| `npm run dev` | Geliştirme sunucusu |
| `npm run build` / `npm start` | Üretim derlemesi ve sunucu |
| `npm run typecheck` | TypeScript (strict) kontrolü |
| `npm run lint` | ESLint |
| `npm test` | Vitest birim testleri |
| `npm run db:push` | Şemayı veritabanına uygula |

## Mimari

```
src/
  app/              Next.js rotaları: (auth), (game), api/v1
  components/       ui/ (ortak), game/ (oyun sayfaları, 3D), brand
  game-engine/      Arayüzden bağımsız simülasyon motoru (saf TypeScript)
    config/data.ts  Katalog: donanım, şehirler, müşteriler, olaylar, araştırmalar
    derive.ts       Kapasite, güç, sıcaklık, gelir/gider hesapları (durumu değiştirmez)
    simulation.ts   Zaman ilerletme, sözleşmeler, teklifler, rakipler, görevler
    events.ts       Arıza ve saldırı olayları
    actions.ts      Oyuncu eylemleri (tüm kurallar burada doğrulanır)
    layout.ts       Elle yerleştirme kuralları (sunucu ve 3D ortak kullanır)
  modules/          game-service (veritabanı + motor), auth şemaları
  lib/              db, auth, api yardımcıları, rate-limit, format
  hooks/ stores/    TanStack Query kancaları, Zustand arayüz durumu
prisma/schema.prisma
tests/unit/
```

### Oyun motoru ve güvenlik

- Ekonomi ve tüm kritik işlemler **yalnızca sunucuda** hesaplanır. İstemci sadece eylem gönderir; her eylem Zod ile doğrulanır ve motor kuralları tekrar denetler.
- **Zaman:** 1x hızda 1 gerçek saniye = 10 oyun dakikası. Hız 1x/2x/5x/10x.
- **Çevrimdışı ilerleme:** 5 dakikadan uzun süre kapalı kalınca sunucu 1x hızla, en fazla 12 gerçek saat için hesaplar; olaylar personel veya acil servisle çözülür.
- **İdempotent zaman:** her oyun satırında `version` iyimser kilidi vardır; her istek `last` zaman damgasını ilerletir, aynı aralık iki kez işlenmez. Aynı oyuncunun istekleri sıraya girer.
- **Defter:** her ekonomik işlem `LedgerEntry` tablosuna transaction içinde yazılır.
- Şifreler `scrypt` ile hashlenir, oturum jetonu HttpOnly + SameSite=Strict çerezdedir ve veritabanında yalnızca SHA-256 özeti saklanır. API'de rate limit, merkezi hata yönetimi ve `/api/v1` sürümlemesi vardır. Oyuncu verileri `userId` ile izoledir.

### 3D ve elle yerleştirme

Satın alınan rack ve ekipman önce envantere düşer. **3D Veri Merkezi** sayfasında “Yerleştir” modunu aç, ürünü seç, zemine tıkla (R: döndür). Yerleştirilmeyen rack ve ekipman çalışmaz. Jeneratör ve trafo yalnızca bina dışı sahaya konur. “Yürü” modunda içeride gezebilirsin.

## PostgreSQL'e geçiş

1. `prisma/schema.prisma` içinde `provider = "postgresql"` yap.
2. `.env` içinde `DATABASE_URL="postgresql://kullanici:sifre@host:5432/sunucu_merkezi"` ayarla.
3. `npx prisma migrate dev --name init` (üretimde `npx prisma migrate deploy`).

## Dağıtım

```bash
npm ci
npx prisma migrate deploy   # veya db:push
npm run build
npm start
```

`PORT` ortam değişkeniyle port belirlenir. Üretimde HTTPS arkasında çalıştır (oturum çerezi `secure` olur).

## Bilinen sınırlar

- **Redis ve Socket.IO henüz yok.** Rate limit bellek içidir (tek sunucu); `src/lib/rate-limit.ts` aynı imza ile Redis'e taşınabilir. Durum, istemciden her 1,5 saniyede bir sorgulanır.
- Oyun durumu her oyuncu için tek JSON satırıdır; defter ayrı ilişkisel tablodadır.
- Birim testleri motoru ve yerleşim kurallarını kapsar; Playwright uçtan uca testleri henüz yazılmadı.
