# cursor_rules.md — Rootie (Cursor) Engineering Rules (v1)

## 0) Primary rule
Build ONLY what is defined in `spec.md`. If something is ambiguous:
1) Choose the safest, simplest option aligned with `spec.md`.
2) Record the choice in `decisions.md` as "Proposed" or "Accepted" (do not silently invent product scope).

## 1) Non-negotiables
- **Mobile-first UX** for all screens (feed, detail, create listing wizard, inbox, thread chat).
- **Vinted-like chat is core**:
  - Inbox list + Thread view
  - Thread contexts: `listing`, `wanted`, `direct`
  - Must allow messaging a user from **listing detail** and **user profile**
- No payments, no shipping management, no escrow.
- Trust layer must exist in MVP: phone verification badge, reporting, moderation basics, reviews after conversation.

## 2) Default tech choices (unless changed in decisions.md)
- Frontend: **Next.js (App Router) + TypeScript**
- UI: **shadcn/ui + Tailwind** (mobile-first utility classes)
- Backend: **Supabase** (Postgres + Auth + Storage + Realtime)
- Auth: Supabase Auth (email/OTP or email+password)
- Images: Supabase Storage with signed/public URLs + responsive rendering

If the project uses a different stack, adapt the same architecture principles.

## 3) Architecture & folders (recommended)
- `/app` routes:
  - `/` (home/feed)
  - `/listing/[id]` (listing detail)
  - `/wanted` (wanted feed)
  - `/wanted/[id]` (wanted detail)
  - `/create` (create listing wizard)
  - `/inbox` (threads list)
  - `/chat/[threadId]` (thread view)
  - `/profile/[userId]` (public profile)
  - `/me` (my profile/settings)
- `/components` shared UI components
- `/lib`:
  - `supabaseClient.ts`
  - `auth.ts`
  - `permissions.ts`
  - `validators.ts` (zod)
  - `formatters.ts`
- `/db`:
  - `schema.sql`
  - `rls.sql`
  - `seed.sql`
  - `migrations/`

## 4) Database rules
- Enforce permissions with **Row Level Security (RLS)**:
  - Users can read public listings and public profiles.
  - Only owners can edit/delete their listings.
  - Chat:
    - Only thread participants can read/write messages.
    - Only participants can read thread metadata (inbox list).
  - Reviews:
    - Only eligible users can create (based on server-side policy checks).
- Add indexes for:
  - listings: region, created_at, type, swap_enabled, category
  - bids: listing_id, created_at
  - threads: participant ids, last_message_at
  - messages: thread_id, created_at

## 5) Chat implementation requirements (must meet)
### Inbox
- Query threads where current user is participant.
- Sort by last_message_at DESC.
- Show: other participant name/avatar, context card (listing/wanted/direct), unread badge.

### Thread
- Load messages with pagination (latest first).
- Composer supports:
  - text
  - image attachments (upload then send)
  - structured offers:
    - `offer_price` with amount
    - `offer_swap` with text + optional referenced listing id
- System messages for:
  - listing marked sold
  - offer accepted/declined

### Thread creation
- Ensure idempotent “get or create”:
  - listing thread unique per (listing_id, buyer_id, seller_id)
  - wanted thread unique per (wanted_id, requester_id, offerer_id)
  - direct thread unique per unordered pair (user_a, user_b)

### Abuse
- Rate limit message sends.
- Block user action:
  - blocker no longer receives notifications and can hide thread
  - messages can be prevented or limited depending on chosen policy (document in decisions.md)

## 6) Mobile-first UX constraints
- Minimum tap target 44px.
- Sticky primary CTA on detail pages (Message seller / Send offer).
- Create listing uses stepper wizard; auto-save drafts.
- Autocomplete for plant names:
  - typeahead using PlantTaxon + fallback to free text
  - debounce input; cache popular results

## 7) Product constraints (do not violate)
- Do not implement payment APIs.
- Do not build shipping labels/tracking.
- Reviews must be gated by conversation/deal confirmation.
- Personal data visibility:
  - phone/email hidden by default
  - seller can opt-in to show phone on listing detail

## 8) Coding standards
- TypeScript strict mode.
- Validate all user inputs with zod (or equivalent).
- No duplicated business logic across client/server: centralize validation.
- Handle states: loading, empty, error.
- Avoid “giant components”: split into smaller components.
- Never store secrets in client; use env vars properly.

## 9) Testing (minimum)
- Unit tests for:
  - bid validation (min increment, auction end)
  - review eligibility logic
  - thread creation uniqueness rules
- Basic e2e smoke:
  - create listing
  - start chat from listing
  - send message + attachment
  - create wanted + respond via offer

## 10) When adding new scope
- If a feature is not in `spec.md`, add it to spec first OR explicitly mark as out-of-scope.
- Log any new constraints/assumptions in `decisions.md`.
