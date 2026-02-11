-- Rootie Phase 1.0 — Supabase Postgres schema
-- Apply in order: schema.sql → rls.sql → seed.sql (see README).

-- Extensions (Supabase usually has these)
create extension if not exists "uuid-ossp";

-- Enums
create type listing_type as enum ('fixed', 'auction');
create type listing_status as enum ('active', 'reserved', 'sold', 'expired', 'removed');
create type listing_category as enum ('plant', 'accessory');
create type thread_context_type as enum ('listing', 'wanted', 'direct');
create type reaction_type as enum ('like', 'want', 'wow', 'funny', 'sad');
create type report_target_type as enum ('listing', 'user', 'message', 'thread');
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
  phone text,
  phone_verified boolean not null default false,
  show_phone_on_listing boolean not null default false,
  is_seller boolean not null default false,
  is_moderator boolean not null default false,
  warned_at timestamptz,
  is_banned boolean not null default false,
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
-- Private default shipping address (owner-only via RLS table, never public)
-- =============================================================================
create table public.profile_shipping_addresses (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  name text not null,
  street text not null,
  city text not null,
  zip text not null,
  country text not null,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
create index idx_listings_seller_status_created on public.listings (seller_id, status, created_at desc);
create index idx_listings_active_type_created on public.listings (type, created_at desc) where status = 'active';
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
  order_delivered_at timestamptz,
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
-- Thread deal confirmations (one row per user per thread; participant enforced by RLS)
-- Listing: only seller confirms; wanted/direct: both confirm → then deal_confirmed_at set.
-- =============================================================================
create table public.thread_deal_confirmations (
  thread_id uuid not null references public.threads (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  confirmed_at timestamptz not null default now(),
  primary key (thread_id, user_id)
);

create index idx_thread_deal_confirmations_user on public.thread_deal_confirmations (user_id);

-- =============================================================================
-- Orders (coordination-only; no payment processing)
-- =============================================================================
create type order_status_type as enum (
  'negotiating',
  'price_accepted',
  'address_provided',
  'shipped',
  'delivered',
  'cancelled'
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  seller_id uuid not null references public.profiles (id) on delete cascade,
  status order_status_type not null default 'negotiating',
  accepted_price_eur numeric(10, 2),
  shipping_address jsonb,
  tracking_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_buyer_not_seller check (buyer_id <> seller_id),
  constraint orders_price_required_for_active_status check (
    status in ('negotiating', 'cancelled')
    or accepted_price_eur is not null
  )
);

create unique index idx_orders_thread_unique on public.orders (thread_id);
create index idx_orders_buyer on public.orders (buyer_id, status);
create index idx_orders_seller on public.orders (seller_id, status);
create index idx_orders_listing on public.orders (listing_id);

comment on table public.orders is 'Order/deal coordination state for listing threads. No payment processing.';
comment on column public.orders.shipping_address is
  'Private shipping address shared only in the order thread: {name, street, city, zip, country, phone?}';

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
create index idx_reports_target on public.reports (target_type, target_id);

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
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();
create trigger profile_shipping_addresses_updated_at before update on public.profile_shipping_addresses
  for each row execute function public.set_updated_at();
create trigger reports_updated_at before update on public.reports
  for each row execute function public.set_updated_at();

-- =============================================================================
-- Orders integrity/transition guard
-- =============================================================================
create or replace function public.orders_validate_integrity()
returns trigger as $$
declare
  t record;
  l record;
  actor uuid;
begin
  actor := auth.uid();

  select id, context_type, listing_id, user1_id, user2_id
  into t
  from public.threads
  where id = new.thread_id;

  if t.id is null then
    raise exception 'Order thread does not exist';
  end if;

  if t.context_type <> 'listing' then
    raise exception 'Orders can be created only for listing threads';
  end if;

  if t.listing_id is distinct from new.listing_id then
    raise exception 'Order listing_id must match thread listing_id';
  end if;

  select id, seller_id into l
  from public.listings
  where id = new.listing_id;

  if l.id is null then
    raise exception 'Order listing does not exist';
  end if;

  if l.seller_id is distinct from new.seller_id then
    raise exception 'Order seller_id must match listing seller_id';
  end if;

  if not (
    (t.user1_id = new.buyer_id and t.user2_id = new.seller_id)
    or (t.user2_id = new.buyer_id and t.user1_id = new.seller_id)
  ) then
    raise exception 'Order buyer/seller must match thread participants';
  end if;

  if new.status = 'address_provided' and new.shipping_address is null then
    raise exception 'Shipping address is required for status address_provided';
  end if;

  if new.status in ('price_accepted', 'address_provided', 'shipped', 'delivered')
     and new.accepted_price_eur is null then
    raise exception 'Accepted price is required for active order statuses';
  end if;

  if tg_op = 'UPDATE' then
    if new.thread_id is distinct from old.thread_id
      or new.listing_id is distinct from old.listing_id
      or new.buyer_id is distinct from old.buyer_id
      or new.seller_id is distinct from old.seller_id then
      raise exception 'Order relations cannot be changed';
    end if;

    if new.shipping_address is distinct from old.shipping_address
       and actor is distinct from old.buyer_id then
      raise exception 'Only buyer can change shipping address';
    end if;

    if new.status is distinct from old.status then
      case new.status
        when 'price_accepted' then
          if actor is distinct from old.seller_id then
            raise exception 'Only seller can set status price_accepted';
          end if;
          if old.status not in ('negotiating', 'price_accepted', 'cancelled') then
            raise exception 'Invalid transition to price_accepted from %', old.status;
          end if;
        when 'address_provided' then
          if actor is distinct from old.buyer_id then
            raise exception 'Only buyer can set status address_provided';
          end if;
          if old.status not in ('price_accepted', 'address_provided') then
            raise exception 'Invalid transition to address_provided from %', old.status;
          end if;
          if new.shipping_address is null then
            raise exception 'Shipping address is required for status address_provided';
          end if;
        when 'shipped' then
          if actor is distinct from old.seller_id then
            raise exception 'Only seller can set status shipped';
          end if;
          if old.status not in ('address_provided', 'shipped') then
            raise exception 'Invalid transition to shipped from %', old.status;
          end if;
        when 'delivered' then
          if actor is distinct from old.buyer_id then
            raise exception 'Only buyer can set status delivered';
          end if;
          if old.status not in ('shipped', 'delivered') then
            raise exception 'Invalid transition to delivered from %', old.status;
          end if;
        when 'cancelled' then
          if actor is distinct from old.buyer_id and actor is distinct from old.seller_id then
            raise exception 'Only buyer or seller can cancel the order';
          end if;
        when 'negotiating' then
          raise exception 'Status cannot be changed back to negotiating';
      end case;
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger orders_validate_integrity_trigger
  before insert or update on public.orders
  for each row execute function public.orders_validate_integrity();

-- =============================================================================
-- Listing lifecycle sync from order status (active -> reserved -> sold)
-- =============================================================================
create or replace function public.listings_sync_status_from_order()
returns trigger as $$
declare
  next_status public.listing_status;
begin
  if new.status = 'delivered' then
    next_status := 'sold';
  elsif new.status in ('price_accepted', 'address_provided', 'shipped') then
    next_status := 'reserved';
  elsif new.status = 'cancelled' then
    if tg_op = 'UPDATE' and old.status = 'shipped' then
      next_status := 'reserved';
    else
      next_status := 'active';
    end if;
  else
    next_status := 'active';
  end if;

  update public.listings
  set status = next_status,
      updated_at = now()
  where id = new.listing_id
    and status not in ('removed', 'expired')
    and status is distinct from next_status;

  return new;
end;
$$ language plpgsql security definer;

create trigger listings_sync_status_from_order_trigger
  after insert or update of status on public.orders
  for each row execute function public.listings_sync_status_from_order();

-- =============================================================================
-- Deal confirmed: listing = seller confirms → set deal_confirmed_at; wanted/direct = both confirm
-- =============================================================================
create or replace function public.threads_set_deal_confirmed()
returns trigger as $$
declare
  t_ctx text;
  t_listing_id uuid;
  t_seller_id uuid;
  other_id uuid;
  both_confirmed boolean;
begin
  select t.context_type, t.listing_id into t_ctx, t_listing_id
  from public.threads t where t.id = new.thread_id;

  if t_ctx = 'listing' and t_listing_id is not null then
    select l.seller_id into t_seller_id
    from public.listings l where l.id = t_listing_id;
    if t_seller_id = new.user_id then
      update public.threads
      set deal_confirmed_at = now(), updated_at = now()
      where id = new.thread_id;
    end if;
    return new;
  end if;

  select case when t.user1_id = new.user_id then t.user2_id else t.user1_id end into other_id
  from public.threads t where t.id = new.thread_id;

  select exists (
    select 1 from public.thread_deal_confirmations c
    where c.thread_id = new.thread_id and c.user_id = other_id
  ) into both_confirmed;

  if both_confirmed then
    update public.threads
    set deal_confirmed_at = now(), updated_at = now()
    where id = new.thread_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger thread_deal_confirmations_set_deal_trigger
  after insert on public.thread_deal_confirmations
  for each row execute function public.threads_set_deal_confirmed();

-- =============================================================================
-- Reviews: update seller profile ratings_avg and ratings_count on insert/delete
-- =============================================================================
create or replace function public.reviews_update_seller_ratings()
returns trigger as $$
declare
  sid uuid;
begin
  if tg_op = 'DELETE' then
    sid := old.seller_id;
  else
    sid := new.seller_id;
  end if;

  update public.profiles p
  set
    ratings_avg = (
      select round(avg(r.rating)::numeric, 2)
      from public.reviews r
      where r.seller_id = sid
    ),
    ratings_count = (
      select count(*)::int from public.reviews r where r.seller_id = sid
    ),
    updated_at = now()
  where p.id = sid;

  return coalesce(new, old);
end;
$$ language plpgsql security definer;

create trigger reviews_update_seller_ratings_trigger
  after insert or delete on public.reviews
  for each row execute function public.reviews_update_seller_ratings();

-- Backfill profile ratings from existing reviews (no-op if no reviews)
update public.profiles p
set
  ratings_avg = sub.avg_rating,
  ratings_count = sub.cnt,
  updated_at = now()
from (
  select seller_id, round(avg(rating)::numeric, 2) as avg_rating, count(*)::int as cnt
  from public.reviews
  group by seller_id
) sub
where p.id = sub.seller_id;
