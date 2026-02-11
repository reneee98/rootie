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

### Manuálny test chatu (správy medzi predajcom a kupujúcim)

1. Prihlás sa ako **Predajca**, vytvor inzerát (napr. „Chat test“), odhlás sa.
2. Prihlás sa ako **Kupujúci**, otvor ten inzerát, klikni **Napísať predajcovi**, odošli správu (napr. „Chcem kúpiť“).
3. Odhlás sa, prihlás sa ako **Predajca**, choď do **Správy** (/inbox) – mal by si vidieť konverzáciu a správu od kupujúceho. Otvor ju a odpovedz.
4. Odhlás sa, prihlás sa ako **Kupujúci**, otvor **Správy** – mal by si vidieť odpoveď predajcu. Obe strany tak vidia navzájom svoje správy.

### E2E test chatu

```bash
npm run seed:users   # ak ešte nemáš test účty
# Spusti dev server v inom termináli: npm run dev
CI=1 PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test e2e/chat.spec.ts
```
