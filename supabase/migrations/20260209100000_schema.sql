-- Rootie Phase 1.0 — Supabase Postgres schema
-- Apply in order: schema.sql → rls.sql → seed.sql (see README).

-- Extensions (Supabase usually has these)
create extension if not exists "uuid-ossp";

-- Enums
create type listing_type as enum ('fixed', 'auction');
create type listing_status as enum ('active', 'sold', 'expired', 'removed');
create type listing_category as enum ('plant', 'accessory');
create type thread_context_type as enum ('listing', 'wanted', 'direct');
create type reaction_type as enum ('like', 'want', 'wow', 'funny', 'sad');
create type report_target_type as enum ('listing', 'user', 'message');
create type report_status_type as enum ('open', 'reviewing', 'resolved');
create type wanted_intent as enum ('buy', 'swap', 'both');

-- =============================================================================
-- Profiles (1:1 with auth.users; public profile + seller summary)
-- phone_verified: synced from auth.users.phone_confirmed_at or set by app
-- =============================================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  bio text,
  region text,
  district text,
  phone_verified boolean not null default false,
  is_seller boolean not null default false,
  is_moderator boolean not null default false,
  region_preference text,
  ratings_avg numeric(3, 2),
  ratings_count int not null default 0,
  active_listings_count int not null default 0,
  sold_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_profiles_region on public.profiles (region);
create index idx_profiles_is_seller on public.profiles (is_seller) where is_seller = true;

comment on table public.profiles is 'Public profile and seller summary; id = auth.users.id';

-- =============================================================================
-- Plant taxa (autocomplete / taxonomy)
-- =============================================================================
create table public.plant_taxa (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null,
  synonyms text[] default '{}',
  popularity_score int not null default 0,
  created_at timestamptz not null default now()
);

create unique index idx_plant_taxa_canonical_lower on public.plant_taxa (lower(canonical_name));
create index idx_plant_taxa_popularity on public.plant_taxa (popularity_score desc);
create index idx_plant_taxa_synonyms on public.plant_taxa using gin (synonyms);

-- =============================================================================
-- Listings
-- =============================================================================
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles (id) on delete cascade,
  type listing_type not null,
  swap_enabled boolean not null default false,
  category listing_category not null default 'plant',
  plant_name text not null,
  plant_taxon_id uuid references public.plant_taxa (id) on delete set null,
  condition text,
  size text,
  leaf_count int,
  notes text,
  region text not null,
  district text,
  fixed_price numeric(10, 2),
  auction_start_price numeric(10, 2),
  auction_min_increment numeric(10, 2),
  auction_ends_at timestamptz,
  status listing_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint listings_fixed_price check (
    (type = 'fixed' and fixed_price is not null and auction_start_price is null and auction_ends_at is null)
    or (type = 'auction' and fixed_price is null and auction_start_price is not null and auction_min_increment is not null and auction_ends_at is not null)
  )
);

create index idx_listings_seller on public.listings (seller_id);
create index idx_listings_status_region_created on public.listings (status, region, created_at desc);
create index idx_listings_auction_ends on public.listings (auction_ends_at) where type = 'auction' and status = 'active';
create index idx_listings_plant_taxon on public.listings (plant_taxon_id) where plant_taxon_id is not null;

-- =============================================================================
-- Listing photos (normalized; one row per photo, position for order)
-- =============================================================================
create table public.listing_photos (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  url text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index idx_listing_photos_listing on public.listing_photos (listing_id, position);

-- =============================================================================
-- Bids (auction)
-- =============================================================================
create table public.bids (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  bidder_id uuid not null references public.profiles (id) on delete cascade,
  amount numeric(10, 2) not null,
  created_at timestamptz not null default now()
);

create index idx_bids_listing_created on public.bids (listing_id, created_at desc);

-- =============================================================================
-- Wanted requests ("Hľadám")
-- =============================================================================
create table public.wanted_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  plant_name text not null,
  plant_taxon_id uuid references public.plant_taxa (id) on delete set null,
  budget_min numeric(10, 2),
  budget_max numeric(10, 2),
  intent wanted_intent not null default 'both',
  region text not null,
  district text,
  notes text,
  status listing_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_wanted_requests_user on public.wanted_requests (user_id);
create index idx_wanted_requests_status_region on public.wanted_requests (status, region, created_at desc);

-- =============================================================================
-- Threads (chat: listing / wanted / direct)
-- user1_id, user2_id = participants; for listing: seller from listing, buyer = other; for wanted: owner from wanted_requests
-- =============================================================================
create table public.threads (
  id uuid primary key default gen_random_uuid(),
  context_type thread_context_type not null,
  listing_id uuid references public.listings (id) on delete set null,
  wanted_request_id uuid references public.wanted_requests (id) on delete set null,
  user1_id uuid not null references public.profiles (id) on delete cascade,
  user2_id uuid not null references public.profiles (id) on delete cascade,
  deal_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint threads_context_listing check (
    (context_type = 'listing' and listing_id is not null and wanted_request_id is null)
    or (context_type = 'wanted' and wanted_request_id is not null and listing_id is null)
    or (context_type = 'direct' and listing_id is null and wanted_request_id is null)
  )
);

create unique index idx_threads_direct on public.threads (least(user1_id, user2_id), greatest(user1_id, user2_id)) where context_type = 'direct';
create index idx_threads_listing on public.threads (listing_id) where listing_id is not null;
create index idx_threads_wanted on public.threads (wanted_request_id) where wanted_request_id is not null;
create index idx_threads_user1 on public.threads (user1_id);
create index idx_threads_user2 on public.threads (user2_id);

-- =============================================================================
-- Messages
-- =============================================================================
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  attachments jsonb default '[]',
  created_at timestamptz not null default now()
);

create index idx_messages_thread_created on public.messages (thread_id, created_at);

-- =============================================================================
-- Reactions (one per user per listing; type can change)
-- =============================================================================
create table public.reactions (
  listing_id uuid not null references public.listings (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  reaction_type reaction_type not null,
  created_at timestamptz not null default now(),
  primary key (listing_id, user_id)
);

create index idx_reactions_listing on public.reactions (listing_id);
create index idx_reactions_user on public.reactions (user_id);

-- =============================================================================
-- Saved listings
-- =============================================================================
create table public.saved_listings (
  user_id uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create index idx_saved_listings_user on public.saved_listings (user_id);
create index idx_saved_listings_listing on public.saved_listings (listing_id);

-- =============================================================================
-- Reviews (one per reviewer per listing; eligibility enforced in RPC/server action)
-- =============================================================================
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  seller_id uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  thread_id uuid references public.threads (id) on delete set null,
  rating int not null,
  body text,
  created_at timestamptz not null default now(),
  constraint reviews_rating_range check (rating >= 1 and rating <= 5),
  constraint reviews_one_per_listing unique (reviewer_id, listing_id)
);

create index idx_reviews_seller on public.reviews (seller_id);
create index idx_reviews_listing on public.reviews (listing_id) where listing_id is not null;

-- =============================================================================
-- Reports
-- =============================================================================
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type report_target_type not null,
  target_id uuid not null,
  reason text not null,
  details text,
  status report_status_type not null default 'open',
  moderator_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_reports_status on public.reports (status);
create index idx_reports_reporter on public.reports (reporter_id);

-- =============================================================================
-- Blocks (user blocks)
-- =============================================================================
create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint blocks_no_self check (blocker_id != blocked_id),
  constraint blocks_unique unique (blocker_id, blocked_id)
);

create index idx_blocks_blocker on public.blocks (blocker_id);

-- =============================================================================
-- updated_at trigger helper
-- =============================================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger listings_updated_at before update on public.listings
  for each row execute function public.set_updated_at();
create trigger wanted_requests_updated_at before update on public.wanted_requests
  for each row execute function public.set_updated_at();
create trigger threads_updated_at before update on public.threads
  for each row execute function public.set_updated_at();
create trigger reports_updated_at before update on public.reports
  for each row execute function public.set_updated_at();
