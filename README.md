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

If your terminal does not find `npm`, use the local helper (works with bundled Node too):

```bash
./scripts/dev-local.sh
```

It restarts only this project's Next.js process on port `3000`. If another project uses the port, it stops with an explanation instead of terminating that project.

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Database (Supabase)

**Napojenie na Supabase Cloud (online):** postup je v [docs/supabase-cloud.md](docs/supabase-cloud.md) — vytvorenie projektu, API kľúče do `.env.local`, aplikovanie migrácií.

The current schema and security rules live in `supabase/migrations/`. Apply all migrations in filename order using [the migration guide](docs/supabase-cloud.md). The older Phase 1.0 files in `db/` are a historical baseline; applying only those files does not create the current order, chat, privacy, and auction rules:

`db/schema.sql` and `db/rls.sql` document the initial schema. The optional `db/seed.sql` fills plant taxa and is idempotent.

The migration `20260210150000_listing_reserved_status.sql` adds an enum value and must commit before `20260210152000_listing_lifecycle_reserved.sql`. Run each migration separately; do not combine all SQL into one transaction.

Env: set `SUPABASE_URL` and `SUPABASE_ANON_KEY` (and `NEXT_PUBLIC_*` for client). Create a profile row when a user signs up (e.g. trigger or app logic). To use the moderation panel at `/admin/reports`, set `profiles.is_moderator = true` for the desired user (e.g. in Supabase Table Editor or SQL).

### Aukcie: automatické ukončenie

Keď aukcii uplynie čas (`auction_ends_at`), vyhráva najvyšší prihodzovač. Aby bol stav rovnaký ako po „Potvrdiť dohodu“, treba volať **cron endpoint** každú 1–2 minúty:

- **Endpoint:** `GET` alebo `POST` `/api/cron/finalize-auctions`
- **Auth:** hlavička `Authorization: Bearer <CRON_SECRET>` alebo `x-cron-secret: <CRON_SECRET>`
- **Env:** `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` (service role obchádza RLS)

Cron endpoint pre každú skončenú aukciu atomicky vytvorí alebo nájde konverzáciu s výhercom, uloží dohodnutú cenu a objednávku a nastaví inzerát na `reserved`. Výherca môže zadať adresu, predajca potvrdiť odoslanie a kupujúci doručenie; až doručenie nastaví inzerát na `sold`. Aukcia bez ponúk skončí ako `expired`. Opakované spustenie nevytvorí druhú dohodu. Vyžaduje migráciu `20261002120000_backend_integrity.sql`.

Príklad (cron-job.org, Vercel Cron, alebo systémový cron):  
`curl -H "Authorization: Bearer $CRON_SECRET" https://tvoja-domena.com/api/cron/finalize-auctions`

### Overenie telefónu (badge)

- **Kde:** Nastavenia účtu `/me/settings` — sekcia „Telefón a overenie“.
- **Údaje:** Číslo a preferencia „Zobrazovať telefón na inzerátoch“ sa ukladajú do `profiles.phone` a `profiles.show_phone_on_listing`. Badge „Overené“ sa odvodzuje z potvrdeného, zhodného čísla v Supabase Auth. Zmena čísla overenie zruší. Súkromné číslo sa nevracia vo verejných dotazoch na profil; zobrazenie na inzeráte vyžaduje výslovný súhlas a overenie.
- **SMS / OTP:** Ak je zapnuté overenie cez Supabase Auth:
  - Nastavte `NEXT_PUBLIC_PHONE_VERIFICATION_ENABLED=true`.
  - V Supabase Dashboard: **Authentication → Providers → Phone** zapnite a nakonfigurujte SMS poskytovateľa (Twilio, MessageBird, Vonage alebo TextLocal) podľa [Supabase Phone Auth](https://supabase.com/docs/guides/auth/phone-login).
  - Používateľ v `/me/settings` zadá číslo, stlačí „Odoslať overovací kód“, zadá OTP a po úspešnom overení sa `phone_verified` synchronizuje z Auth do `profiles`.
- **Stub (bez SMS):** Pri `NEXT_PUBLIC_PHONE_VERIFICATION_ENABLED=false` sa v UI zobrazí text, že overenie vyžaduje nastavenie SMS poskytovateľa; používateľ môže uložiť číslo a preferenciu, badge a logika sú pripravené na neskoršie zapnutie.

### Testy

- **Unit a databázové testy:** `npm test` — validácia, koncepty, presmerovania, telefóny a chat; PGlite spustí všetky migrácie v izolovanom PostgreSQL a overí oprávnenia, objednávky, recenzie aj ukončenie aukcií. Testy sa nepripájajú na Supabase Cloud.
- **Verejné E2E:** `PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run test:e2e -- e2e/public.spec.ts` — mobilné stránky, filtre, presmerovania, chybové stavy a ochrana API. Vyžaduje spustenú aplikáciu.
- **E2E smoke a chat:** `npm run test:e2e` — vytvára inzeráty, požiadavky a správy v nakonfigurovanej databáze. Spúšťajte proti testovaciemu Supabase projektu s aplikovanými migráciami a testovacími účtami (`npm run seed:users`). Voliteľné env: `PLAYWRIGHT_BASE_URL`, `E2E_PREDAJCA_EMAIL`, `E2E_PREDAJCA_PASSWORD`, atď.

Výsledky poslednej kontroly a zostávajúce kroky pre Supabase Cloud sú v [zázname overenia](docs/verification-2026-10-02.md).

Migrácie boli následne aplikované na Supabase Cloud; výsledky a stav sú v [zázname z 3. októbra 2026](docs/migrations-applied-2026-10-03.md).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
