# Supabase migrácie aplikované — 3. október 2026

Migrácie boli aplikované na existujúci Rootie Supabase Cloud projekt `infzbcbstyxamxlotqdo`, vetva `main`, cez prihlásený SQL Editor. Každá migrácia prebehla v samostatnej transakcii a do `supabase_migrations.schema_migrations` sa spolu s commitom uložila jej verzia, názov a presné SQL zo zdrojového súboru.

## Aplikované migrácie

| Verzia | Súbor | Výsledok |
| --- | --- | --- |
| 20260210143000 | `threads_order_delivered_at.sql` | Aplikovaná |
| 20260210150000 | `listing_reserved_status.sql` | Aplikovaná a samostatne commitnutá pred použitím `reserved` |
| 20260210152000 | `listing_lifecycle_reserved.sql` | Aplikovaná; existujúce doručené objednávky zosúladené so stavom `sold` |
| 20261002120000 | `backend_integrity.sql` | Aplikovaná; nové RPC a ochrany aktívne |
| 20261003080000 | `profile_derived_stats_backfill.sql` | Aplikovaná; opravené zastarané štatistiky dvoch profilov |

Pred aplikovaním mala história 17 migrácií. Finálna história obsahuje aj všetkých päť vyššie uvedených verzií. SHA-256 SQL uloženého pri každej novej migrácii sa zhoduje s príslušným lokálnym súborom.

## Overenie na Supabase Cloud

- Hodnota `reserved`, stĺpec doručenia a osem nových kontrolných triggerov sú dostupné.
- Priame zápisy do `orders` sú pre bežných používateľov zablokované; zmeny používajú autorizované RPC.
- Anonymný aj prihlásený používateľ nemajú verejné právo čítať stĺpec `profiles.phone`. Vlastnícke RPC bolo overené cez reálne prihlásenie testovacieho účtu.
- Anonymný používateľ nemôže meniť dohodu. Bežný používateľ nemôže spustiť finalizáciu aukcií; právo má `service_role`.
- Počet nekonzistentných stavov objednávok/inzerátov: **0**.
- Počet profilov s nesprávnymi odvodenými štatistikami: **0**.
- Pôvodné počty zostali zachované: **7 inzerátov, 3 objednávky, 11 konverzácií**. Kontrola pred migráciou nenašla duplicitné kontextové dvojice konverzácií.

[Cloudový smoke test](../scripts/verify-cloud-integrity.sql) overil prijatie ponuky, rezerváciu, opakované prijatie, adresu, odoslanie, doručenie, opakované doručenie, recenziu, odmietnutie nízkeho príhozu a finalizáciu aukcie vrátane opakovania. Celý test používa subtransakciu, ktorá sa vráti späť; skúšobné inzeráty, ponuky, správy, recenzie aj objednávky neostali uložené. Aj prípadné dočasné zmeny existujúcich ukončených aukcií sa rollbackli.

## Kontroly aplikácie

- `npm test`: **141 testov prešlo**, z toho **25 PostgreSQL testov** vrátane novej opravy historických štatistík a kontroly rollback skriptu.
- Verejné Playwright testy proti lokálnej produkčnej aplikácii po zmene cloudových oprávnení: **10 prešlo**.
- Cielený ESLint zmeneného databázového testu: bez chýb a varovaní.
- `npx tsc --noEmit` a `git diff --check`: úspešné.
- API testy potvrdili odmietnutie verejného čítania telefónu, funkčné vlastnícke RPC, dostupné RPC dohody s odmietnutím neexistujúcej konverzácie a odmietnutie aukčného cronu pre bežného používateľa.

SQL Editor zostal otvorený s tabuľkou desiatich úspešných kontrol. Snímka a strojový záznam sú v ignorovanom priečinku `.playwright-mcp/`: `rootie-migrations-applied-2026-10-03.png` a `rootie-migration-verification-2026-10-03.json`.

Použité boli existujúce `SUPABASE_URL`, `SUPABASE_ANON_KEY` a `SUPABASE_SERVICE_ROLE_KEY` na kontrolu API a existujúce prihlásenie používateľa do SQL Editora. Neboli pridané nové tajomstvá ani exportované prihlasovacie tokeny.

Táto úloha aplikovala databázové migrácie. Nasadenie aplikačného kódu na Vercel neprebehlo; nasadená aplikácia musí používať aktuálne akcie s RPC, pretože priame zápisy do objednávok sú po migrácii zakázané. Reálne doručenie SMS a pravidelné spúšťanie produkčného cron plánovača neboli súčasťou tejto kontroly.
