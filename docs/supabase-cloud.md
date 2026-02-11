# Napojenie na Supabase Cloud (online)

Tento návod ti pomôže napojiť Rootie na **Supabase Cloud** namiesto lokálneho Supabase.

## 1. Vytvorenie projektu na Supabase

1. Choď na [supabase.com](https://supabase.com) a prihlás sa (alebo založ účet).
2. Klikni **New project**.
3. Vyplň:
   - **Name:** napr. `rootie`
   - **Database Password:** silné heslo (ulož si ho, budeš ho potrebovať pri `supabase link`).
   - **Region:** vyber najbližší (napr. Frankfurt).
4. Klikni **Create new project** a počkaj, kým sa projekt vytvorí.

## 2. Získanie API kľúčov

1. V ľavom menu otvor **Project Settings** (ikona ozubeného kolieska).
2. Choď na **API**.
3. Skopíruj:
   - **Project URL** (napr. `https://abcdefgh.supabase.co`)
   - **anon public** key (pod "Project API keys")
   - **service_role** key (tiež pod "Project API keys" — **nikdy ho nedávaj do frontendu**, len na server / cron)

## 3. Nastavenie premenných v projekte

1. V koreni projektu skopíruj príklad env súboru:
   ```bash
   cp .env.example .env.local
   ```
2. Otvor `.env.local` a doplň hodnoty z Supabase Dashboardu:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://TvojProjektRef.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...   # anon public
   SUPABASE_URL=https://TvojProjektRef.supabase.co
   SUPABASE_ANON_KEY=eyJhbGc...              # to isté ako anon public
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...      # service_role key
   CRON_SECRET=nahodny-retazec-pre-cron
   ```
3. Súbor `.env.local` sa necommituje do gitu (je v `.gitignore`).

## 4. Aplikovanie migrácií (schéma DB)

Máš dve možnosti.

### A) Supabase Dashboard — SQL Editor

1. V Supabase Dashboard otvor **SQL Editor**.
2. Súbory z `supabase/migrations/` spusti **v poradí podľa čísla v názve** (od `20260209100000_schema.sql` po `20260209100014_phone_verification.sql`).
3. Pre každý súbor: otvor ho, skopíruj obsah, vlož do SQL Editora a spusti **Run**.

### B) Supabase CLI (ak máš nainštalovanú)

1. Nainštaluj [Supabase CLI](https://supabase.com/docs/guides/cli) ak ju ešte nemáš.
2. Prihlás sa a napoj projekt:
   ```bash
   supabase login
   supabase link --project-ref TvojProjektRef
   ```
   `TvojProjektRef` je časť URL (napr. z `https://abcdefgh.supabase.co` je ref `abcdefgh`). Heslo k DB zadal pri vytvorení projektu.
3. Push migrácií:
   ```bash
   supabase db push
   ```

## 5. Seed (voliteľné)

- **Rastliny (plant_taxa):** v SQL Editore spusti obsah súboru `db/seed.sql`.
- **Test používatelia:** `npm run seed:users` (ak máš taký script a potrebuješ test účty).

## 6. Storage (fotky inzerátov)

Storage bucket a politiky sú v migrácii `20260209100003_storage_policies.sql`. Ak si migrácie spustil cez Dashboard, skontroluj v **Storage**, či existuje bucket pre listing fotky a či sú politiky aktívne.

## 7. Overenie

1. Spusti appku: `npm run dev`
2. Skús registráciu / prihlásenie — mal by si byť schopný vytvoriť účet a byť presmerovaný do appky.
3. V Supabase Dashboard → **Table Editor** by si mal vidieť záznam v `profiles` po prvom prihlásení (trigger z migrácie vytvorí profil).

## Časté problémy

- **„Missing Supabase server environment variables”** — skontroluj, že v `.env.local` máš vyplnené `NEXT_PUBLIC_SUPABASE_URL` a `NEXT_PUBLIC_SUPABASE_ANON_KEY` (a po reštarte dev servera).
- **Auth nefunguje** — v Supabase **Authentication → URL Configuration** pridaj **Site URL** a **Redirect URLs** (napr. `http://localhost:3000`, prípadne produkčnú doménu).
- **Potvrdzovací e-mail smeruje na localhost** — v **Authentication → [URL Configuration](https://supabase.com/dashboard/project/infzbcbstyxamxlotqdo/auth/url-configuration)** nastav **Site URL** na `https://rootie.vercel.app` a do **Redirect URLs** pridaj `https://rootie.vercel.app/auth/callback`. Alternatíva: spusti `SUPABASE_ACCESS_TOKEN=tvoj_pat node scripts/supabase-set-redirect-url.mjs` (PAT z [Account → Tokens](https://supabase.com/dashboard/account/tokens)).
- **RLS / permission denied** — migrácie musia byť spustené v poradí; RLS je v `20260209100001_rls.sql` a ďalších.

Ak budeš nasadzovať na Vercel, pridaj rovnaké premenné do **Vercel → Project → Settings → Environment Variables** (bez `.env.local`).
