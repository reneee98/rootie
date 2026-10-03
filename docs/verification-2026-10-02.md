# Kontrola a opravy Rootie — 2. október 2026

Kontrola zahŕňala existujúci checkout, verejné stránky, prihlásenie, osobné sekcie, chat, tvorbu inzerátov a požiadaviek, ponuky, aukcie, objednávky, recenzie, databázové oprávnenia a závislosti. Pôvodné rozpracované úpravy rozhrania boli zachované.

## Opravené oblasti

- Feed zobrazuje celú stránku výsledkov a umožňuje stránkovanie. Filtre a vyhľadávanie zachovávajú kraj aj dotaz; zmena filtra resetuje stránku. Vyhľadávanie v Hľadám zostáva na `/wanted`.
- Karty používajú skutočné hodnotenia, aukčné ceny a počty; chýbajúce fotografie majú viditeľný fallback. Detail zobrazuje poznámky, výmenu, reakcie a overenie. Uloženie, reakcie a prihodenie majú správne pending stavy a chyby.
- Fotografie majú kontrolu typu, veľkosti, počtu a vlastníctva. Počas nahrávania sa nedá publikovať neúplný koncept. Koncepty sú oddelené podľa používateľa; prenos starého konceptu kontroluje vlastníctvo fotografií.
- Auth odmieta externé návratové URL, správne spracúva callback a obnovené cookies. Chybové pokusy a odhlásenie nezostávajú zablokované. Chránené stránky zachovávajú návratovú cestu.
- Chat spája optimistické, realtime, polling a serverové správy bez duplicít. Stránkovanie používa dvojicu času a ID a zachováva mikrosekundy PostgreSQL. Prázdna schránka zachytí prvú konverzáciu; prílohy, protiponuky, blokovanie a hlásenia zobrazujú chyby.
- Osobné počty nepadajú na chýbajúcej enum hodnote v staršej cloudovej schéme. Telefón sa overuje podľa zhodného potvrdeného čísla v Auth; súkromné čísla chráni databázová migrácia.
- Databáza kontroluje minimálne prihodenie, koniec aukcie, vlastné ponuky, blokovanie, účastníkov konverzácie, oprávnenia objednávky a doručenie pred recenziou. Používateľ si nemôže nastaviť moderátorskú rolu, falošné hodnotenia alebo počty predajov.
- Prijatie ponuky a ukončenie aukcie ukladajú objednávku, stav inzerátu a správu v jednej transakcii. Opakovanie nevytvára duplicitné potvrdenia. Aukcia s výhercom prechádza na rezerváciu a pokračuje adresou, odoslaním a doručením.
- Next.js, Vitest a zraniteľné tranzitívne balíky boli aktualizované. npm a pnpm lockfile sú zosúladené. Lokálny štartovací skript ukončuje iba proces tohto projektu.
- Globálna 404 a chybová stránka sú po slovensky a umožňujú návrat alebo opakovanie.

## Overenie

Finálne overenie prebehlo po čistej inštalácii závislostí:

| Kontrola | Výsledok |
| --- | --- |
| `npm ci` | Úspešná čistá inštalácia; 0 známych zraniteľností |
| `npm run lint` | Bez chýb a varovaní |
| `npm test` | 139 úspešných testov v 15 súboroch |
| Databázová časť testov | 23 úspešných PostgreSQL testov s migráciami, RLS a rollbackom |
| `npm run build` | Úspešný produkčný build vrátane TypeScript kontroly |
| `CI=1 PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run test:e2e -- e2e/public.spec.ts` | 10 úspešných testov proti `next start` |
| `npm audit --audit-level=low` | 0 známych zraniteľností |
| `git diff --check` | Bez chýb |

Databázové testy spúšťajú všetky SQL migrácie v izolovanom PGlite PostgreSQL s rolami a RLS; nepoužívajú živé cloudové údaje.

Verejné Playwright testy kontrolujú mobilné stránky, vyhľadávanie, filtre, návrat po prihlásení, odmietnutie externej URL, ochranu API a cron endpointu, chybu prihlásenia, slovenskú 404 a zablokovaný localStorage. Manuálna kontrola zahŕňala mobil 390 × 844 aj desktop 1440 px a prihlásené osobné sekcie/chat: `/me`, `/me/listings`, `/me/auctions`, `/me/settings`, `/me/shipping`, `/saved`, `/inbox` a existujúcu konverzáciu. Stránky sa načítali s HTTP 200, bez vodorovného pretečenia a bez JavaScript výnimiek. Chat API vrátilo 200 pre platný čas/ID cursor a 400 pre neplatný čas.

Lokálny produkčný náhľad beží na `http://localhost:3000`. Finálne snímky sú v ignorovanom priečinku `.playwright-mcp/`: `rootie-home-mobile-final.png` a `rootie-home-desktop-final.png`.

## Supabase Cloud a nasadenie

**Aktualizácia 3. októbra 2026: migrácie sú aplikované na Supabase Cloud a overené.** Podrobnosti, doplnkový prepočet profilov a výsledky cloudového rollback testu sú v [zázname aplikovania migrácií](migrations-applied-2026-10-03.md).

Pri pôvodnej kontrole 2. októbra cloud nepodporoval stav `reserved` a nové RPC. K dispozícii boli aplikačné API kľúče, nie prístup na vykonanie SQL migrácií. Vtedy migrácie ani nasadenie aplikácie neboli vykonané.

Pôvodný plán aplikovania podľa [postupu migrácií](supabase-cloud.md) bol:

1. Samostatne commitnúť `20260210150000_listing_reserved_status.sql` pred použitím hodnoty `reserved`.
2. Doplniť chýbajúce februárové migrácie v časovom poradí.
3. Aplikovať `20261002120000_backend_integrity.sql` pre nové RPC, oprávnenia a atomicitu.
4. Reštartovať/nasadiť aplikáciu a na testovacom projekte overiť celý obchodný priebeh.

Čítacia kontrola existujúcich cloudových konverzácií našla 11 konverzácií a 0 duplicitných kontextových dvojíc. Kontrolu treba zopakovať bezprostredne pred migráciou, keďže medzičasom môžu pribudnúť údaje.

Úplné smoke/chat E2E scenáre boli prispôsobené novému rozhraniu, ale proti živému Supabase neboli spustené: vytvárajú inzeráty, požiadavky a správy. Kritické databázové zmeny pokrývajú izolované integračné testy; celý obchodný priebeh v prehliadači treba overiť po aplikovaní migrácií na testovacom projekte. SMS poskytovateľ nebol nakonfigurovaný, takže doručenie reálneho OTP nebolo overené.
