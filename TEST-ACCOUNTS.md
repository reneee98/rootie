# Testovacie účty (lokálny vývoj)

**Dôležité:** Po každom `supabase db reset` sa auth používatelia zmažú. Vždy znova spusti:

```bash
npm run seed:users
```

(alebo `node scripts/seed-test-users.mjs` pri bežiacom Supabase)

Ak chceš mať v appke **inzeráty s fotkami** (20+ listingu), po seede userov spusti:

```bash
npm run seed:listings
```

(`node scripts/seed-listings.mjs`) — vyžaduje existujúcich test userov. Fotky sú z Picsum Photos (reálne obrázky).

Potom môžeš použiť tieto prihlasovacie údaje:

| Účet            | Email                    | Heslo   |
|-----------------|--------------------------|---------|
| Test Predajca    | `predajca@test.rootie.sk` | `test1234` |
| Test Kupujúci    | `kupujuci@test.rootie.sk` | `test1234` |
| Druhý Kupujúci   | `druhy@test.rootie.sk`    | `test1234` |

**Prihlásenie:** [http://localhost:3000/login](http://localhost:3000/login)

- **Predajca** — vhodný na vytváranie inzerátov, aukcie, úpravu profilu.
- **Kupujúci** — na testovanie ponúk na aukciách, správ, uložení.
- **Druhý Kupujúci** — na testovanie viacerých účastníkov (napr. súťaž o aukciu).

Heslo je rovnaké pre všetky účty kvôli jednoduchosti v dev prostredí. **Nikdy nepoužívaj tieto heslá v produkcii.**
