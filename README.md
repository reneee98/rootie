This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Database (Supabase)

**Napojenie na Supabase Cloud (online):** postup je v [docs/supabase-cloud.md](docs/supabase-cloud.md) — vytvorenie projektu, API kľúče do `.env.local`, aplikovanie migrácií.

Phase 1.0 schema, RLS, and seed live in `db/`. Apply them in order (e.g. in Supabase SQL Editor or via Docker/init scripts):

1. **Schema** — `db/schema.sql` (tables, indexes, triggers: deal confirmations, review ratings).
2. **RLS** — `db/rls.sql` (row-level security and policies, including `thread_deal_confirmations`).
3. **Seed** — `db/seed.sql` (plant taxa; idempotent).

With **Docker**: run your Postgres (or Supabase) container and execute the three files in order against the database (e.g. `psql` or init script).

Alternatively, use **Supabase Migrations**: put each file in `supabase/migrations/` with a timestamp prefix and run `supabase db push` (or apply via Dashboard).

Env: set `SUPABASE_URL` and `SUPABASE_ANON_KEY` (and `NEXT_PUBLIC_*` for client). Create a profile row when a user signs up (e.g. trigger or app logic). To use the moderation panel at `/admin/reports`, set `profiles.is_moderator = true` for the desired user (e.g. in Supabase Table Editor or SQL).

### Aukcie: automatické ukončenie

Keď aukcii uplynie čas (`auction_ends_at`), vyhráva najvyšší prihodzovač. Aby bol stav rovnaký ako po „Potvrdiť dohodu“, treba volať **cron endpoint** každú 1–2 minúty:

- **Endpoint:** `GET` alebo `POST` `/api/cron/finalize-auctions`
- **Auth:** hlavička `Authorization: Bearer <CRON_SECRET>` alebo `x-cron-secret: <CRON_SECRET>`
- **Env:** `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` (service role obchádza RLS)

Cron endpoint pre každú skončenú aukciu: nastaví listing na `sold` (alebo `expired`, ak nebol žiaden bid), vytvorí alebo nájde thread medzi predajcom a výhercom, nastaví `deal_confirmed_at` a vloží potvrdenia dohody pre oboch. Výherca potom v chate uvidí „Dohoda potvrdená“ a tlačidlo „Objednávka doručená“.

Príklad (cron-job.org, Vercel Cron, alebo systémový cron):  
`curl -H "Authorization: Bearer $CRON_SECRET" https://tvoja-domena.com/api/cron/finalize-auctions`

### Overenie telefónu (badge)

- **Kde:** Nastavenia účtu `/me` — sekcia „Telefón a overenie“.
- **Dátum:** Číslo a preferencia „Zobrazovať telefón na inzerátoch“ sa ukladajú do `profiles.phone` a `profiles.show_phone_on_listing`. Badge „Overené“ sa zobrazuje podľa `profiles.phone_verified` (profil, karta predajcu, hlavička chatu).
- **SMS / OTP:** Ak je zapnuté overenie cez Supabase Auth:
  - Nastavte `NEXT_PUBLIC_PHONE_VERIFICATION_ENABLED=true`.
  - V Supabase Dashboard: **Authentication → Providers → Phone** zapnite a nakonfigurujte SMS poskytovateľa (Twilio, MessageBird, Vonage alebo TextLocal) podľa [Supabase Phone Auth](https://supabase.com/docs/guides/auth/phone-login).
  - Používateľ v `/me` zadá číslo, stlačí „Odoslať overovací kód“, zadá OTP a po úspešnom overení sa `phone_verified` synchronizuje z Auth do `profiles`.
- **Stub (bez SMS):** Pri `NEXT_PUBLIC_PHONE_VERIFICATION_ENABLED=false` sa v UI zobrazí text, že overenie vyžaduje nastavenie SMS poskytovateľa; používateľ môže uložiť číslo a preferenciu, badge a logika sú pripravené na neskoršie zapnutie.

### Testy

- **Unit testy (Vitest):** `npm run test` — overenie aukčných ponúk (`lib/bid-validation`), pravidlá jednoznačnosti threadov (`lib/thread-keys`), logika eligibility pre recenzie (`lib/review-eligibility-logic`).
- **E2E smoke (Playwright):** `npm run test:e2e` — jeden priebeh: prihlásenie (predajca) → vytvorenie inzerátu → prihlásenie (kupujúci) → otvorenie inzerátu a štart chatu → odoslanie správy → vytvorenie wanted → prihlásenie (druhý) → poslanie ponuky na wanted. Vyžaduje bežiaci backend a seednutých test userov (`npm run seed:users`). Voliteľné env: `PLAYWRIGHT_BASE_URL`, `E2E_PREDAJCA_EMAIL`, `E2E_PREDAJCA_PASSWORD`, atď.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
