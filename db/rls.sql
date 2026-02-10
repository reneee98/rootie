-- Rootie Phase 1.0 — Row Level Security policies
-- Run after schema.sql. Requires auth.uid() (Supabase Auth).

-- Helper: current user's profile id (for moderator check)
create or replace function public.current_user_is_moderator()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_moderator = true
  );
$$ language sql security definer stable;

-- =============================================================================
-- Profiles
-- =============================================================================
alter table public.profiles enable row level security;

-- Public can read all profiles (safe fields only; do not expose sensitive data in app)
create policy "profiles_select_all" on public.profiles for select using (true);

-- Users can insert their own profile (e.g. on signup)
create policy "profiles_insert_own" on public.profiles for insert with check (id = auth.uid());

-- Users can update their own profile
create policy "profiles_update_own" on public.profiles for update using (id = auth.uid());

-- Moderators can update any profile (warn, ban)
create policy "profiles_update_moderator" on public.profiles for update
  using (public.current_user_is_moderator());

-- =============================================================================
-- Listings
-- =============================================================================
alter table public.listings enable row level security;

-- Public can read active listings only (exclude banned sellers)
create policy "listings_select_public" on public.listings for select
  using (
    status = 'active'
    and not coalesce((select is_banned from public.profiles where id = listings.seller_id), false)
  );

-- Owner can read their own (any status)
create policy "listings_select_own" on public.listings for select
  using (seller_id = auth.uid());

-- Moderators can read any listing (for moderation context)
create policy "listings_select_moderator" on public.listings for select
  using (public.current_user_is_moderator());

-- Owner can insert own
create policy "listings_insert_own" on public.listings for insert
  with check (seller_id = auth.uid());

-- Owner can update own
create policy "listings_update_own" on public.listings for update
  using (seller_id = auth.uid());

-- Moderators can update listings (e.g. set status = removed)
create policy "listings_update_moderator" on public.listings for update
  using (public.current_user_is_moderator());

-- Owner can delete own (soft-delete via status preferred)
create policy "listings_delete_own" on public.listings for delete
  using (seller_id = auth.uid());

-- =============================================================================
-- Listing photos
-- =============================================================================
alter table public.listing_photos enable row level security;

-- Public can read photos for active listings (exclude banned sellers)
create policy "listing_photos_select_public" on public.listing_photos for select
  using (
    exists (
      select 1 from public.listings l
      join public.profiles p on p.id = l.seller_id
      where l.id = listing_photos.listing_id and l.status = 'active'
        and not coalesce(p.is_banned, false)
    )
  );

-- Owner can read photos for their own listings
create policy "listing_photos_select_own" on public.listing_photos for select
  using (
    exists (select 1 from public.listings l where l.id = listing_photos.listing_id and l.seller_id = auth.uid())
  );

-- Owner can insert/update/delete photos for own listings
create policy "listing_photos_insert_own" on public.listing_photos for insert
  with check (
    exists (select 1 from public.listings l where l.id = listing_photos.listing_id and l.seller_id = auth.uid())
  );
create policy "listing_photos_update_own" on public.listing_photos for update
  using (
    exists (select 1 from public.listings l where l.id = listing_photos.listing_id and l.seller_id = auth.uid())
  );
create policy "listing_photos_delete_own" on public.listing_photos for delete
  using (
    exists (select 1 from public.listings l where l.id = listing_photos.listing_id and l.seller_id = auth.uid())
  );

-- =============================================================================
-- Bids
-- =============================================================================
alter table public.bids enable row level security;

-- Public can read bids (for auction display)
create policy "bids_select_all" on public.bids for select using (true);

-- Authenticated user can insert own bid on active auction
create policy "bids_insert_own" on public.bids for insert
  with check (
    bidder_id = auth.uid()
    and exists (
      select 1 from public.listings l
      where l.id = bids.listing_id and l.type = 'auction' and l.status = 'active'
        and (l.auction_ends_at is null or l.auction_ends_at > now())
    )
  );

-- =============================================================================
-- Wanted requests
-- =============================================================================
alter table public.wanted_requests enable row level security;

-- Public can read active wanted
create policy "wanted_select_public" on public.wanted_requests for select
  using (status = 'active');

-- Owner can read own (any status)
create policy "wanted_select_own" on public.wanted_requests for select
  using (user_id = auth.uid());

-- Owner can insert/update/delete own
create policy "wanted_insert_own" on public.wanted_requests for insert
  with check (user_id = auth.uid());
create policy "wanted_update_own" on public.wanted_requests for update
  using (user_id = auth.uid());
create policy "wanted_delete_own" on public.wanted_requests for delete
  using (user_id = auth.uid());

-- =============================================================================
-- Threads — only participants can read; participants can create (app logic for dedup)
-- =============================================================================
alter table public.threads enable row level security;

create policy "threads_select_participant" on public.threads for select
  using (user1_id = auth.uid() or user2_id = auth.uid());

-- Moderators can read any thread (for moderation)
create policy "threads_select_moderator" on public.threads for select
  using (public.current_user_is_moderator());

create policy "threads_insert_authenticated" on public.threads for insert
  with check (user1_id = auth.uid() or user2_id = auth.uid());

create policy "threads_update_participant" on public.threads for update
  using (user1_id = auth.uid() or user2_id = auth.uid());

-- =============================================================================
-- Messages — only thread participants can read and send
-- =============================================================================
alter table public.messages enable row level security;

create policy "messages_select_participant" on public.messages for select
  using (
    exists (
      select 1 from public.threads t
      where t.id = messages.thread_id and (t.user1_id = auth.uid() or t.user2_id = auth.uid())
    )
  );

-- Moderators can read any message (for moderation)
create policy "messages_select_moderator" on public.messages for select
  using (public.current_user_is_moderator());

create policy "messages_insert_participant" on public.messages for insert
  with check (
    sender_id = auth.uid()
    and not coalesce((select is_banned from public.profiles where id = auth.uid()), false)
    and exists (
      select 1 from public.threads t
      where t.id = messages.thread_id and (t.user1_id = auth.uid() or t.user2_id = auth.uid())
    )
  );

-- =============================================================================
-- Reactions — user can create/delete own; public read (counters)
-- =============================================================================
alter table public.reactions enable row level security;

create policy "reactions_select_all" on public.reactions for select using (true);

create policy "reactions_insert_own" on public.reactions for insert
  with check (user_id = auth.uid());

create policy "reactions_delete_own" on public.reactions for delete
  using (user_id = auth.uid());

-- Update own reaction (change type)
create policy "reactions_update_own" on public.reactions for update
  using (user_id = auth.uid());

-- =============================================================================
-- Saved listings — user CRUD own; public read for listing page save count
-- =============================================================================
alter table public.saved_listings enable row level security;

create policy "saved_listings_select_all" on public.saved_listings for select using (true);

create policy "saved_listings_insert_own" on public.saved_listings for insert
  with check (user_id = auth.uid());

create policy "saved_listings_delete_own" on public.saved_listings for delete
  using (user_id = auth.uid());

-- =============================================================================
-- Reviews — public read; insert only own (eligibility enforced in RPC/server action)
-- =============================================================================
alter table public.reviews enable row level security;

create policy "reviews_select_all" on public.reviews for select using (true);

create policy "reviews_insert_own" on public.reviews for insert
  with check (reviewer_id = auth.uid());

-- =============================================================================
-- Thread deal confirmations — participants read; listing = only seller can insert; all participants can update own (upsert)
-- =============================================================================
alter table public.thread_deal_confirmations enable row level security;

create policy "thread_deal_confirmations_select_participant" on public.thread_deal_confirmations for select
  using (
    exists (
      select 1 from public.threads t
      where t.id = thread_deal_confirmations.thread_id
        and (t.user1_id = auth.uid() or t.user2_id = auth.uid())
    )
  );

-- Listing threads: only seller can insert; wanted/direct: any participant can insert
create policy "thread_deal_confirmations_insert_own" on public.thread_deal_confirmations for insert
  with check (
    user_id = auth.uid()
    and (
      not exists (
        select 1 from public.threads t
        join public.listings l on l.id = t.listing_id and t.context_type = 'listing'
        where t.id = thread_deal_confirmations.thread_id
      )
      or exists (
        select 1 from public.threads t
        join public.listings l on l.id = t.listing_id and t.context_type = 'listing'
        where t.id = thread_deal_confirmations.thread_id and l.seller_id = auth.uid()
      )
    )
  );

-- Allow update own row (needed for upsert when row already exists)
create policy "thread_deal_confirmations_update_own" on public.thread_deal_confirmations for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- =============================================================================
-- Reports — user can create; moderators can read all
-- =============================================================================
alter table public.reports enable row level security;

create policy "reports_insert_own" on public.reports for insert
  with check (reporter_id = auth.uid());

create policy "reports_select_own" on public.reports for select
  using (reporter_id = auth.uid());

create policy "reports_select_moderator" on public.reports for select
  using (public.current_user_is_moderator());

-- Moderators can update (e.g. status, notes)
create policy "reports_update_moderator" on public.reports for update
  using (public.current_user_is_moderator());

-- =============================================================================
-- Blocks — user can only manage their own blocks
-- =============================================================================
alter table public.blocks enable row level security;

create policy "blocks_select_own" on public.blocks for select
  using (blocker_id = auth.uid());

create policy "blocks_insert_own" on public.blocks for insert
  with check (blocker_id = auth.uid());

create policy "blocks_delete_own" on public.blocks for delete
  using (blocker_id = auth.uid());

-- =============================================================================
-- Plant taxa — public read (autocomplete)
-- =============================================================================
alter table public.plant_taxa enable row level security;

create policy "plant_taxa_select_all" on public.plant_taxa for select using (true);

-- Only service role / migrations should insert/update plant_taxa (no policy = no access for anon/authenticated)
-- If you need app-driven taxonomy edits, add an "admin" policy here.
