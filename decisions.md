# decisions.md — Rootie Decision Log (v1)

> Format: **YYYY-MM-DD** — **Status** — **Decision** — **Rationale** — **Notes/Consequences**

**2026-02-09 — Accepted — Listing-only marketplace (no payment/shipping)** — Keeps scope lean, reduces liability, speeds MVP — Users negotiate and transact off-platform.

**2026-02-09 — Accepted — Mobile-first as default** — 90%+ usage expected from mobile — All primary flows must be one-hand friendly; wizard-based listing creation.

**2026-02-09 — Accepted — Core selling modes: Fixed + Auction** — Covers mainstream + rare plants dynamics — Auctions MVP = simple bids, no advanced rules.

**2026-02-09 — Accepted — Swap option per listing** — Strong plant community behavior; increases engagement — Swap proposals handled via structured chat messages.

**2026-02-09 — Accepted — Wanted (“Hľadám”) as separate entity** — Creates demand-side liquidity and engagement loop — Offers arrive via chat.

**2026-02-09 — Accepted — Vinted-like internal chat is MUST-HAVE** — Users must reliably connect with each other in-app — Inbox + threads; threads can be listing/wanted/direct.

**2026-02-09 — Accepted — Direct messaging from user profile** — Explicit requirement: must be able to contact the user — Implement thread context_type=direct.

**2026-02-09 — Accepted — Reviews only after conversation threshold** — Prevents fake reviews and abuse — Eligibility via chat activity or deal confirmation.

**2026-02-09 — Accepted — Phone verification badge** — Simple trust signal — Phone hidden by default; badge improves credibility.

**2026-02-09 — Accepted — Reactions on listing detail (FB-like)** — Low-friction engagement; supports trending ranking — One reaction per user per listing.

**2026-02-09 — Accepted — Basic moderation: reporting + removal + bans** — Necessary for safety and brand trust — Add rate limits and abuse flags.

**2026-02-09 — Accepted — Supabase Auth via email + password (no magic-link in scaffold)** — Simplest end-to-end flow for MVP scaffolding and deterministic login/signup UX — Middleware + server helpers enforce protected routes; magic-link can be added later if needed.

**2026-02-09 — Accepted — Auth route guards and session persistence** — Protected routes: `/create`, `/inbox`, `/chat`, `/wanted/create`, `/api/posting`, `/api/reactions`, `/api/messages`. Middleware redirects unauthenticated users to `/login?next=…`; session persisted via Supabase SSR cookies (browser + server clients share cookie store).

**2026-02-09 — Proposed — Tech stack default: Next.js (TS) + Supabase** — Fast MVP, realtime chat, RLS security — Can be revised if needed; keep DB schema explicit.

**2026-02-09 — Accepted — Listing photos: normalized table** — Prefer `listing_photos` (one row per photo, `position` for order) over a JSON array — Easier indexing, future per-photo metadata, and consistent RLS (tied to listing ownership).

**2026-02-09 — Accepted — Review eligibility enforced in app/RPC, not RLS** — RLS allows insert only where `reviewer_id = auth.uid()`; eligibility (conversation threshold or deal_confirmed) is enforced in a server action or Supabase RPC — Keeps policies simple; business rule (message count / deal flag) lives in one place and is testable; RPC can return a clear error when ineligible.

**2026-02-09 — Accepted — Create listing wizard: client-side state + localStorage autosave** — Draft state held in React useState with localStorage persistence — Fast and offline-friendly; avoids server round-trips during drafting. On publish, a single server action validates and inserts listing + photos.

**2026-02-09 — Accepted — Photo upload: direct client → Supabase Storage** — Client uploads to `listing-photos/{userId}/{timestamp}.ext`; server action only stores the public URL in `listing_photos` rows — Avoids server as proxy, faster mobile uploads; orphaned files acceptable for MVP (cleanup later via cron).

**2026-02-09 — Accepted — Plant taxa typeahead: ILIKE on canonical_name** — Simple `ILIKE %term%` query ordered by popularity_score — Sufficient for MVP; synonym search and full-text ranking can be added via RPC later.

**2026-02-09 — Accepted — Auction bid mechanics: server action + Supabase Realtime** — Bids validated server-side (amount >= current + increment, auction active, not own listing); stored in `bids` table. Detail page subscribes to Realtime INSERT events on bids, updating price/count/countdown live — No advanced rules (auto-bid, reserve, anti-sniping) for MVP; race conditions on concurrent bids are acceptable (both valid bids stored, highest wins).

**2026-02-09 — Accepted — bid_count via separate count query, not limit(1)** — Original detail query used `limit(1)` on bids which returned max 1 for count — Split into two parallel queries: one `{ count: "exact", head: true }` for count, one `order + limit(1)` for top bid amount.

**2026-02-09 — Accepted — "Ending soon" feed sort filters out ended auctions** — Added `gt("auction_ends_at", now)` to prevent showing already-ended auctions in the feed — Proper auction expiry (status → expired) will be handled by a future cron job.

**2026-02-09 — Accepted — Wanted (Hľadám): feed + create form + detail + wanted thread** — Feed with region, plant search, intent filters. Create: single-page form with plant typeahead, region/district, budget min/max or negotiable, intent, notes. Detail: sticky CTA "Poslať ponuku" calls getOrCreateWantedThread → redirect to /chat/[threadId]. Thread context_type=wanted, wanted_request_id set — First message / offer card left for chat implementation.

**2026-02-09 — Accepted — Block policy for chat** — If A blocks B: (1) Threads where A and B are participants are hidden from A's inbox (RLS: threads_select excludes threads where blocker_id = auth.uid() and blocked_id = other participant). (2) B cannot send new messages to A (RLS: messages_insert requires that the other participant has not blocked the sender). B's existing messages remain visible; only new sends are rejected. No automatic thread closure or message hiding.

**2026-02-09 — Accepted — Reporting and moderation MVP** — Report actions: listing (detail page), user (profile), thread (chat header). Reason + optional details; target_type enum: listing, user, message, thread. Moderation: /admin/reports guarded by requireModerator(); only moderators can read all reports (RLS: reports_select_own + reports_select_moderator). Actions: mark resolved, remove listing (status=removed), warn user (profiles.warned_at), ban user (profiles.is_banned). Banned users: listings hidden from public, cannot send messages. Moderators can update any profile and any listing (RLS policies).

**2026-02-09 — Accepted — Chat: last_message_at, message_type, thread_reads, realtime** — Threads have last_message_at (trigger on message insert). Messages have message_type (text, offer_price, offer_swap, system) and metadata (amount, listing_id). thread_reads(thread_id, user_id, last_read_at) for unread count. Realtime on messages table for live updates in /chat/[threadId]. Report target_type extended with 'thread' for reporting conversations.

**2026-02-09 — Accepted — Phone verification flow and badge** — (1) Phone capture and “show on listing” opt-in in `/me` settings; `profiles.phone`, `profiles.show_phone_on_listing`; `phone_verified` already in schema. (2) Verification: Supabase Phone Auth (OTP) when `NEXT_PUBLIC_PHONE_VERIFICATION_ENABLED=true` and SMS provider configured in Supabase Dashboard; when false, stub UI (“Overenie telefónu vyžaduje nastavenie SMS poskytovateľa”) and DB/badge logic ready. (3) Badge when verified: profile page, seller card, chat header (existing). (4) Phone hidden by default; on listing detail shown only when seller has `show_phone_on_listing` and `phone_verified`. External config: Supabase Auth → Phone provider (Twilio, MessageBird, Vonage, TextLocal); see README.

**2026-02-09 — Accepted — Mobile-first polish and baseline tests** — (1) Sticky CTAs on listing and wanted detail sit above bottom nav (bottom offset 3.5rem + safe area). (2) 44px min tap targets: photo gallery arrows/dots, listing reactions, save button on feed card; buttons already h-11/size-11. (3) Loading: loading.tsx for app, listing/[id], wanted/[id], inbox (skeleton/placeholder). (4) Images: placeholder (pulse) until onLoad on detail gallery and feed cards. (5) Unit tests (Vitest): bid validation (`lib/bid-validation`), thread uniqueness keys (`lib/thread-keys`), review eligibility logic (`lib/review-eligibility-logic`). (6) E2E smoke (Playwright): create listing → chat from listing → send message → create wanted → send offer as other user; requires seeded test users.

**2026-02-09 — Accepted — Najčastejšie hľadané kategórie namiesto Aukcie/Pevná cena v chipoch** — Na home feede sú filter chipy „Aukcie“ a „Pevná cena“ nahradené quick-search kategóriami rastlín: Monstera, Philodendron, Hoya, Pilea, Sukulenty, Orchidey. Klik na chip nastaví vyhľadávací dotaz (q). Každá kategória má ikonu (Leaf, LeafyGreen, Flower2, Sprout, Flower) a text. Filtre Výmena, Príslušenstvo, Overení ostávajú v druhom riadku chipov. Typ inzerátu (fixed/auction) sa dá zmeniť cez sort alebo budúci filter ak bude potreba.

**2026-02-09 — Accepted — Admin účet a rola s iným zobrazením** — Jeden (alebo viac) účet má rolu administrátora (`profiles.is_moderator = true`). Administrátor má úplne iné zobrazenie: cesty pod `/admin` nepoužívajú hlavný app shell (žiadny feed header, žiadna spodná navigácia). Admin má vlastný layout (AdminShell): header „Administrácia“, odkaz „Späť do aplikácie“ na `/`, navigácia „Nahlásenia“ na `/admin/reports`. Vstup do adminu: z účtu `/me` tlačidlo „Moderácia – nahlásenia“ (viditeľné len pre is_moderator).
