# Rootie Design System

Mobile-first iOS/Android UI for the plant listings marketplace. Clean, Apple-like minimal style. Listing-only; no payments or shipping in-app.

---

## 1. Principles

- **Mobile-first**: All primary flows one-hand friendly; 90%+ traffic from mobile.
- **8pt grid**: Spacing and sizing based on 8px base unit (8, 16, 24, 32, 40, 48, 56, 64).
- **44px minimum tap targets**: Buttons, links, icons, and interactive controls meet 44×44px for accessibility.
- **Safe area aware**: Bottom nav and sticky CTAs respect `env(safe-area-inset-bottom)` and similar.
- **Neutral + green accent**: Light neutral background; subtle green only for primary actions and badges. No loud gradients.

---

## 2. Spacing (8pt grid)

| Token    | Value  | Use |
|----------|--------|-----|
| `space-1` | 4px   | Tight inline (icon + label) |
| `space-2` | 8px   | Base unit, small gaps |
| `space-3` | 12px  | Between related elements |
| `space-4` | 16px  | Section padding, card padding |
| `space-5` | 20px  | — |
| `space-6` | 24px  | Between sections |
| `space-8` | 32px  | Large gaps |
| `space-10`| 40px  | — |
| `space-12`| 48px  | — |
| `space-14`| 56px  | Bottom nav height area |
| `space-16`| 64px  | — |

Tailwind: use `p-4`, `gap-2`, `mb-6` etc. (Tailwind scale is 4px per unit; double for 8pt: `p-4` = 16px, `gap-4` = 16px.)

---

## 3. Typography

**Font**: Modern sans (e.g. Geist Sans). Clear hierarchy.

| Role     | Class / Token        | Size  | Weight | Use |
|----------|----------------------|-------|--------|-----|
| H1       | `text-2xl font-bold` | 24px  | 700    | Page title, listing name |
| H2       | `text-lg font-semibold` | 18px | 600  | Section headings |
| H3       | `text-base font-semibold` | 16px | 600 | Card titles |
| Body     | `text-sm`            | 14px  | 400    | Default copy |
| Body large | `text-base`        | 16px  | 400    | Emphasised body |
| Caption  | `text-xs text-muted-foreground` | 12px | 400 | Metadata, hints |
| Label    | `text-sm font-medium`| 14px  | 500    | Form labels, chip labels |

Line height: default (Tailwind) or `leading-tight` for headings.

---

## 4. Colors

- **Background**: Neutral light `--background` (near white).
- **Surface / Card**: `--card` (white or off-white).
- **Muted**: `--muted`, `--muted-foreground` for secondary text and subtle areas.
- **Primary**: **Subtle green** — primary buttons, active states, badges, links. Use `--primary` / `--primary-foreground`.
- **Secondary**: Neutral fill for secondary buttons and chips (`--secondary`).
- **Destructive**: Red for delete/report (`--destructive`).
- **Border / Input**: Light gray `--border`, `--input`.

Avoid: loud gradients, heavy shadows, multiple accent colors.

---

## 5. Components Library

### Button
- **Primary**: Filled green (primary). Main CTA (e.g. "Reagovať na ponuku", "Odoslať").
- **Secondary**: Outlined or light fill. Secondary actions.
- **Ghost**: No border, hover background. Tertiary or in-toolbar.
- **Destructive**: For delete/report.
- Min height 44px (`h-11` or `min-h-11`).

### Input
- Standard text field; 44px min height. Border, focus ring (primary/green).

### Search bar
- Full-width bar: search icon + placeholder ("Hľadať rastlinu…") + optional "Hľadať" button. Rounded, border.

### Filter chips
- Horizontal scroll of pills: region, type, category, "Len swap", sort. Selected state: primary (green) or filled. 44px tap height.

### Tabs
- Underline or pill style. Active tab clearly indicated (e.g. primary color).

### Card
- Rounded border, padding (e.g. `p-4`). Used for listing cards, detail blocks, seller card.

### Badge
- Small pill: "Aukcia", "Swap", "Kúpiť", "Beta". Primary for emphasis, secondary/outline for neutral.

### Avatar
- Circular; sizes: sm (24px), default (32px), lg (40px). Fallback initials.

### Rating stars
- 1–5 stars (filled for score). Optional count "(12)". Used in seller card, reviews.

### Bottom sheet
- Slide-up panel (e.g. Drawer/Sheet from bottom). Filters, options.

### Modal
- Centered dialog for confirmations, forms. Overlay + rounded content.

### Toast
- Short-lived feedback (success, error) at top or bottom. Auto-dismiss.

### Skeleton loader
- Gray animated placeholders for images, text lines, cards. Use while loading.

### Empty state
- Illustration or icon + title + short description + optional CTA. No gradients.

### Segmented control
- 2–4 options in a single bar (e.g. "Uložené | Hľadám"). One selected (primary).

### Stepper
- Steps 1 → 2 → 3 for wizards (e.g. create listing). Current step highlighted.

### Photo grid uploader
- Grid of slots; tap to add/remove/reorder. Camera + gallery. Min tap 44px.

### Reaction bar
- Row of reaction icons (e.g. like, want, wow, funny, sad). One per user. 44px tap.

### Message bubbles
- Chat: sent (primary/green-aligned), received (neutral). Optional offer card inside.

### Offer card
- In chat: price or swap offer with amount/description. Distinct from plain text bubble.

---

## 6. App shell (mobile)

- **Bottom tab bar**: 5 tabs — **Domov**, **Hľadám**, **Pridať**, **Inbox**, **Profil**.
  - Domov → `/`
  - Hľadám → `/wanted`
  - Pridať → `/create`
  - Inbox → `/inbox`
  - Profil → `/me`
- Tab bar: safe area padding `pb-[calc(0.5rem+env(safe-area-inset-bottom))]`. Min 44px tap per tab.
- **Sticky CTA**: Primary action bar above bottom nav (e.g. "Reagovať na ponuku"). Offset `bottom: calc(3.5rem + env(safe-area-inset-bottom))` so it sits above the tab bar.
- **Main content**: Padding bottom accounts for sticky CTA + tab bar + safe area (e.g. `pb-[calc(5.75rem+env(safe-area-inset-bottom))]` when sticky CTA is present).

---

## 7. States

- **Loading**: Skeleton loaders for feed, listing detail, wanted, inbox. Optional `loading.tsx` per route.
- **Empty**: Empty state component (icon + text + optional CTA). Feed, inbox, saved, search results.
- **Error**: Inline error text (destructive color). Optional retry CTA. Form validation errors next to fields.

---

## 8. App shell template (mobile)

The main mobile shell is implemented in `components/layout/app-shell.tsx`:

- **Header**: Sticky top; logo "Rootie" (link to `/`); links "Uložené", "Hľadám"; "Beta" pill. Min tap 44px for interactive elements.
- **Main**: `flex-1` with horizontal padding; bottom padding `pb-[calc(5.75rem+env(safe-area-inset-bottom))]` so content is not hidden behind the bottom nav or a sticky CTA bar.
- **Sticky CTA**: Pages (e.g. listing detail, wanted detail) can render a fixed bar above the bottom nav with a primary button (e.g. "Reagovať na ponuku"). That bar uses `bottom-[calc(3.5rem+env(safe-area-inset-bottom))]` so it sits above the tab bar.
- **Bottom nav**: `MobileBottomNav` — 5 tabs (Domov, Hľadám, Pridať, Inbox, Profil), safe area padding, 44px min tap height. Hidden on `/create` and `/wanted/create` for full-screen wizard.

---

## 9. Implementation notes

- Tailwind + shadcn/ui. CSS variables in `globals.css` for theme (e.g. `--primary` green).
- All interactive elements: focus-visible ring, aria-labels where needed.
- Use semantic HTML (nav, main, button, a) and landmarks.
- New UI components: `SearchBar`, `FilterChip`, `SegmentedControl`, `Stepper`, `Skeleton`, `EmptyState`, `Toast`, `RatingStars`, `OfferCard` in `components/ui/`.
