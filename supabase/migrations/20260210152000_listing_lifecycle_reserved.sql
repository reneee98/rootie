-- Listing lifecycle update: add "reserved" status and sync listing status from order state.

alter type public.listing_status add value if not exists 'reserved';

-- Indexes for frequent status filters in public feed and /me sections.
create index if not exists idx_listings_seller_status_created
  on public.listings (seller_id, status, created_at desc);

create index if not exists idx_listings_active_type_created
  on public.listings (type, created_at desc)
  where status = 'active';

-- Keep listing lifecycle in sync with order lifecycle.
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
      -- Cancellation after shipment keeps listing out of public feed.
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

drop trigger if exists listings_sync_status_from_order_trigger on public.orders;
create trigger listings_sync_status_from_order_trigger
  after insert or update of status on public.orders
  for each row execute function public.listings_sync_status_from_order();

-- Backfill existing listings from latest order state.
with latest_order_per_listing as (
  select distinct on (o.listing_id)
    o.listing_id,
    o.status
  from public.orders o
  order by o.listing_id, o.updated_at desc
)
update public.listings l
set
  status = case
    when o.status = 'delivered' then 'sold'::public.listing_status
    when o.status in ('price_accepted', 'address_provided', 'shipped') then 'reserved'::public.listing_status
    when o.status = 'cancelled' then 'active'::public.listing_status
    else 'active'::public.listing_status
  end,
  updated_at = now()
from latest_order_per_listing o
where l.id = o.listing_id
  and l.status not in ('removed', 'expired')
  and l.status is distinct from case
    when o.status = 'delivered' then 'sold'::public.listing_status
    when o.status in ('price_accepted', 'address_provided', 'shipped') then 'reserved'::public.listing_status
    when o.status = 'cancelled' then 'active'::public.listing_status
    else 'active'::public.listing_status
  end;

-- Allow order participants (buyer/seller) to read non-active listing detail and photos.
drop policy if exists "listings_select_order_participant" on public.listings;
create policy "listings_select_order_participant" on public.listings for select
  using (
    exists (
      select 1
      from public.orders o
      where o.listing_id = listings.id
        and (o.buyer_id = auth.uid() or o.seller_id = auth.uid())
    )
  );

drop policy if exists "listing_photos_select_order_participant" on public.listing_photos;
create policy "listing_photos_select_order_participant" on public.listing_photos for select
  using (
    exists (
      select 1
      from public.orders o
      where o.listing_id = listing_photos.listing_id
        and (o.buyer_id = auth.uid() or o.seller_id = auth.uid())
    )
  );
