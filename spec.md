# spec.md — Rootie Product Spec (v1)

## 0) Summary
**Rootie** is a **listing-only marketplace** for plants in Slovakia (all 8 regions). Sellers register, create listings, and handle **payment + shipping/off-platform communication** themselves. Rootie provides: discovery, profiles, trust (verification + moderation), messaging, and optional monetization (boosts, plans).

**Listing types**
- **Fixed Price**
- **Auction**
- **Swap-enabled** (optional per listing)
- **Wanted (Looking for…)** requests

**Mobile-first**: 90% of traffic is mobile. Core flows must be one-hand friendly and optimized for fast listing creation.

---

## 1) Goals
- Create the most intuitive **mobile-first** plant listing experience in SK.
- Build a **trust layer**: seller profiles, verified phone badge, internal chat, reviews after conversation, reporting + moderation.
- Support both **fixed price** and **auction** dynamics + **swap** option.
- Create a growth loop with **Wanted requests**, reactions, and gamification.
- Provide monetization paths: boosts, subscriptions, affiliate content (blog), and later “My Greenhouse”.

## 2) Non-goals (MVP)
- No payments, escrow, shipping labels, delivery tracking, or dispute resolution.
- No in-app checkout; no seller logistics management in MVP.
- No complex auction features in MVP (auto-bid, reserve price, anti-sniping).
- No full-blown social network (follows, public comments) in MVP (reactions only).

---

## 3) Target users & roles
### Roles
- **Guest**: browse, search, view listing details.
- **Buyer (registered)**: chat, react, save, create wanted requests, report, review (after eligible).
- **Seller (registered)**: create/manage listings, receive chats/offers, mark listing sold/expired, receive reviews.
- **Moderator/Admin**: review reports, remove/limit content, ban users, handle verification flags.

### Primary user intents
- Buyer: find a plant nearby, negotiate, swap, bid, follow auctions, request a plant via Wanted.
- Seller: sell plants, attract buyers, manage inquiries, build reputation, optionally promote listings.

---

## 4) Core entities
### User
- id, email, phone, phone_verified, display_name, avatar
- role flags: is_seller, is_moderator
- region_preference (optional)
- gamification: xp, level, badges, streak (phase)

### SellerProfile (1:1 User)
- bio, region, district (optional), contact preferences (phone/chat)
- ratings summary (avg, count)
- stats: active_listings_count, sold_count

### Listing
- id, seller_id
- type: `fixed | auction`
- swap_enabled: boolean
- wanted: boolean (for Wanted posts) **or separate table** (see Data Model section)
- category: `plant | accessory`
- plant_name (free text) + plant_taxon_id (optional)
- photos[]
- condition, size, leaf_count, notes (optional)
- location: region (required), district (optional)
- price fields:
  - fixed_price (if fixed)
  - auction_start_price, min_increment, ends_at (if auction)
  - current_price (derived), bid_count (derived)
- status: `active | sold | expired | removed`
- reactions counters (derived)
- created_at, updated_at

### Bid (Auction)
- listing_id, bidder_id, amount, created_at

### Reaction
- listing_id, user_id
- reaction_type: `like | want | wow | funny | sad`
- unique constraint (listing_id, user_id)

### Thread / Message (Internal chat)
- thread: listing_id, buyer_id, seller_id, status
- message: thread_id, sender_id, body, attachments?, created_at

### Review
- reviewer_id, seller_id, listing_id? (optional), rating (1–5), text, created_at
- **Eligibility rule**: only after conversation threshold (see Trust section)

### Report
- reporter_id, target_type (`listing | user | message`)
- target_id
- reason (enum), details, created_at, status (`open | reviewing | resolved`)
- moderator notes

### PlantTaxon (Autocomplete)
- id, canonical_name, synonyms[], popularity_score
- optional: care profile linkage (phase 2)

### MyGreenhousePlant (phase 2)
- user_id, plant_taxon_id or custom_name
- photos, location_in_home, last_watered_at, last_repotted_at, notes
- generated care schedule fields

### BlogPost / AffiliateLink (phase 3)
- editorial content, tags, affiliate disclosures, product cards (links)

---

## 5) MVP scope (Functional requirements)

### 5.1 Discovery & browsing
- Homepage: search bar + quick categories + “Trending” (based on reactions & activity) + “Wanted highlights”
- Listing feed:
  - filters: Region (required), optionally district; type (fixed/auction), swap-enabled, category, price range, plant name
  - sorting: newest, price, ending soon (auction), trending
- Listing detail:
  - photos (mobile gallery), listing info, seller card (rating, verified badge), reactions bar, CTA to chat/contact, report

### 5.2 Listing creation (mobile-first wizard)
**Wizard steps (one-hand optimized):**
1) Choose: Fixed / Auction / Wanted / Swap toggle (if not Wanted)
2) Add photos (camera first, reorder, min 1; recommended 3+)
3) Plant name input with **autocomplete** (typeahead; “mons” → Monstera…)
4) Essentials: region, optional district; condition; size; notes
5) Price config:
   - fixed: amount
   - auction: start, min increment, ends_at
   - wanted: budget range + intent (buy/swap/both)
6) Publish

**UX requirements**
- Large tappable controls, minimal typing, sticky primary CTA
- Inline validation and clear progress indicator
- Draft auto-save
- Smart defaults:
  - region suggested from profile
  - auction end time presets (24h, 48h, 7d)

### 5.3 Swap-enabled listings
- Seller can enable swap and optionally define preferences (tags or free text).
- Buyer can “Propose swap” via chat flow:
  - choose one of their listings or write text + attach photos
  - seller can accept/decline/counter (MVP: handled via chat messages + status tags)

### 5.4 Wanted (“Looking for…”) posts
- Separate feed tab and filter.
- Wanted detail with CTA “Send offer”.
- Offers are messages in internal chat (attachments allowed).

### 5.5 Internal chat (Trust backbone)
- Chat thread anchored to listing or wanted request.
- Attachments allowed (photos).
- Rate limit and spam protection.

### 5.6 Reviews (after conversation)
**Rule (MVP)**
- A buyer can review a seller only if:
  - there is a chat thread for that listing/wanted AND
  - at least **N messages exchanged** OR thread is marked “deal confirmed” by both (simple toggle).
- One review per buyer per listing (unique constraint).

### 5.7 Reactions (FB-like)
- Reaction types: 👍 ❤️/😍 😮 😂 😢 (mapped to internal enum)
- Only registered users can react.
- One reaction per user per listing; user can change it.

### 5.8 Trust & safety
- Phone verification badge (SMS/OTP).
- Reporting: listing/user/message with reasons.
- Moderation tools: remove listing, warn user, shadow-limit, ban.
- Basic anti-scam education box on listing detail.

### 5.9 Monetization (phase-ready; optional MVP)
- Boosting: “Top in region/category”, “Highlight”, “Refresh”.
- Subscription plans (phase): Free / Plus / Pro with listing limits and analytics.

---

## 6) Phase roadmap (High-level)

### Phase 1.0 — MVP
- Auth + profiles, listings (fixed/auction), region filters, detail page
- Internal chat + reporting
- Phone verification
- Reviews (post-conversation)
- Wanted posts
- Swap toggle + swap proposals (via chat)
- Reactions + saved listings

### Phase 1.5 — Growth
- Notifications: outbid, auction ending, new offers, messages
- Better seller insights (views/saves), basic leaderboards (gamification-lite)

### Phase 2.0 — My Greenhouse
- Personal library of plants + profiles + care schedule + reminders
- “Add to greenhouse” from a listing
- Plant care knowledge base integration

### Phase 3.0 — Content & affiliate
- Blog/magazine with SEO, affiliate product cards
- Accessory makers spotlight pages

---

## 7) Non-functional requirements
### Performance
- Mobile load: LCP < 2.5s on 4G for feed/detail
- Image optimization: responsive sizes + lazy loading
- Infinite scroll feed with pagination

### Accessibility
- Minimum 44px tap targets
- Color contrast, focus states, screen-reader labels

### Security & privacy
- GDPR compliance; minimal personal data display
- Protect phone/email by default (show only if seller opts in)
- RLS / permission enforcement at DB level
- Rate limiting: reactions, messages, listing creation

### Localization
- Slovak UI copy (default). (Optional future: CZ/EN)

---

## 8) Acceptance criteria (Definition of Done)
A feature is done when:
- Implemented per spec, mobile-first, with loading/empty/error states
- Permission checks enforced (backend + UI)
- Basic analytics events added (view listing, start chat, send message, publish listing)
- Tests for critical logic (auction bid validation, review eligibility, permissions)
- No console errors; Lighthouse mobile score acceptable

---
