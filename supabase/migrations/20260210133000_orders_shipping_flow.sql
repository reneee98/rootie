-- Order coordination flow (no payments): listing offer acceptance -> address -> shipped -> delivered -> review.

create type public.order_status_type as enum (
  'negotiating',
  'price_accepted',
  'address_provided',
  'shipped',
  'delivered',
  'cancelled'
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  seller_id uuid not null references public.profiles (id) on delete cascade,
  status public.order_status_type not null default 'negotiating',
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

create unique index if not exists idx_orders_thread_unique on public.orders (thread_id);
create index if not exists idx_orders_buyer on public.orders (buyer_id, status);
create index if not exists idx_orders_seller on public.orders (seller_id, status);
create index if not exists idx_orders_listing on public.orders (listing_id);

comment on table public.orders is 'Order/deal coordination state for listing threads. No payment processing.';
comment on column public.orders.shipping_address is
  'Private shipping address shared only in the order thread: {name, street, city, zip, country, phone?}';

create table if not exists public.profile_shipping_addresses (
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

comment on table public.profile_shipping_addresses is
  'Default private shipping address for buyer prefill in chat order flow.';

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

drop trigger if exists orders_validate_integrity_trigger on public.orders;
create trigger orders_validate_integrity_trigger
  before insert or update on public.orders
  for each row execute function public.orders_validate_integrity();

drop trigger if exists orders_updated_at on public.orders;
create trigger orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

drop trigger if exists profile_shipping_addresses_updated_at on public.profile_shipping_addresses;
create trigger profile_shipping_addresses_updated_at
  before update on public.profile_shipping_addresses
  for each row execute function public.set_updated_at();

alter table public.orders enable row level security;
alter table public.profile_shipping_addresses enable row level security;

drop policy if exists "orders_select_participants" on public.orders;
create policy "orders_select_participants" on public.orders for select
  using (buyer_id = auth.uid() or seller_id = auth.uid());

drop policy if exists "orders_insert_seller" on public.orders;
create policy "orders_insert_seller" on public.orders for insert
  with check (
    seller_id = auth.uid()
    and status in ('negotiating', 'price_accepted', 'cancelled')
    and exists (
      select 1
      from public.threads t
      where t.id = orders.thread_id
        and t.context_type = 'listing'
        and t.listing_id = orders.listing_id
        and (t.user1_id = orders.buyer_id or t.user2_id = orders.buyer_id)
        and (t.user1_id = orders.seller_id or t.user2_id = orders.seller_id)
    )
    and exists (
      select 1
      from public.listings l
      where l.id = orders.listing_id
        and l.seller_id = auth.uid()
    )
  );

drop policy if exists "orders_update_buyer" on public.orders;
create policy "orders_update_buyer" on public.orders for update
  using (buyer_id = auth.uid())
  with check (
    buyer_id = auth.uid()
    and status in ('address_provided', 'delivered', 'cancelled')
  );

drop policy if exists "orders_update_seller" on public.orders;
create policy "orders_update_seller" on public.orders for update
  using (seller_id = auth.uid())
  with check (
    seller_id = auth.uid()
    and status in ('price_accepted', 'shipped', 'cancelled')
  );

drop policy if exists "profile_shipping_addresses_select_own" on public.profile_shipping_addresses;
create policy "profile_shipping_addresses_select_own" on public.profile_shipping_addresses for select
  using (user_id = auth.uid());

drop policy if exists "profile_shipping_addresses_insert_own" on public.profile_shipping_addresses;
create policy "profile_shipping_addresses_insert_own" on public.profile_shipping_addresses for insert
  with check (user_id = auth.uid());

drop policy if exists "profile_shipping_addresses_update_own" on public.profile_shipping_addresses;
create policy "profile_shipping_addresses_update_own" on public.profile_shipping_addresses for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Strong review eligibility at DB policy level: buyer can review only after order status = delivered.
drop policy if exists "reviews_insert_own" on public.reviews;
create policy "reviews_insert_own" on public.reviews for insert
  with check (
    reviewer_id = auth.uid()
    and thread_id is not null
    and exists (
      select 1
      from public.orders o
      where o.thread_id = reviews.thread_id
        and o.listing_id = reviews.listing_id
        and o.buyer_id = auth.uid()
        and o.seller_id = reviews.seller_id
        and o.status = 'delivered'
    )
  );
