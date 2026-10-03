-- Protect API access as well as server actions. Apply after the existing migrations.
-- This migration is intentionally not applied to the remote project by the audit.

-- Every user order mutation must use the atomic, role-checked RPC below.
revoke insert, update, delete on public.orders from anon, authenticated;

create unique index idx_threads_listing_pair on public.threads
  (listing_id, least(user1_id, user2_id), greatest(user1_id, user2_id)) where context_type = 'listing';
create unique index idx_threads_wanted_pair on public.threads
  (wanted_request_id, least(user1_id, user2_id), greatest(user1_id, user2_id)) where context_type = 'wanted';

create or replace function public.profiles_validate_sensitive_fields()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  actor uuid := auth.uid();
  moderator boolean;
begin
  if actor is null then return new; end if; -- trusted database/service-role jobs
  select coalesce(is_moderator, false) into moderator from public.profiles where id = actor;
  if tg_op = 'INSERT' then
    if new.is_moderator or new.is_banned or new.warned_at is not null then
      raise exception 'Protected profile fields cannot be set by a user';
    end if;
  else
    if new.id is distinct from old.id or new.is_moderator is distinct from old.is_moderator then
      raise exception 'Profile identity and moderator role cannot be changed by a user';
    end if;
    if not coalesce(moderator, false) and
       (new.is_banned is distinct from old.is_banned or new.warned_at is distinct from old.warned_at) then
      raise exception 'Only moderators can change moderation flags';
    end if;
  end if;
  -- Verification and reputation are derived, never claimed by the caller.
  new.phone_verified := exists (
    select 1 from auth.users u where u.id = new.id and u.phone_confirmed_at is not null
      and nullif(regexp_replace(coalesce(new.phone, ''), '[^0-9]', '', 'g'), '') = regexp_replace(u.phone, '[^0-9]', '', 'g')
  );
  select round(avg(rating)::numeric, 2), count(*)::int
  into new.ratings_avg, new.ratings_count from public.reviews where seller_id = new.id;
  select count(*) filter (where status = 'active')::int, count(*) filter (where status = 'sold')::int
  into new.active_listings_count, new.sold_count from public.listings where seller_id = new.id;
  return new;
end;
$$;
create trigger profiles_sensitive_fields_trigger before insert or update on public.profiles
for each row execute function public.profiles_validate_sensitive_fields();

create or replace function public.listings_update_profile_counts()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare owner_id uuid := case when tg_op = 'DELETE' then old.seller_id else new.seller_id end;
begin
  update public.profiles set
    active_listings_count = (select count(*)::int from public.listings where seller_id = owner_id and status = 'active'),
    sold_count = (select count(*)::int from public.listings where seller_id = owner_id and status = 'sold')
  where id = owner_id;
  return coalesce(new, old);
end;
$$;
create trigger listings_profile_counts_trigger after insert or update of status or delete on public.listings
for each row execute function public.listings_update_profile_counts();

create or replace function public.listings_protect_integrity()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.seller_id is distinct from old.seller_id then raise exception 'Listing owner cannot change'; end if;
  if exists (select 1 from public.bids where listing_id = old.id) and (
    new.type is distinct from old.type or new.auction_start_price is distinct from old.auction_start_price or
    new.auction_min_increment is distinct from old.auction_min_increment or new.auction_ends_at is distinct from old.auction_ends_at
  ) and auth.uid() is not null then raise exception 'Auction settings cannot change after the first bid'; end if;
  if auth.uid() is not null and pg_trigger_depth() = 1 and new.status is distinct from old.status and
    new.status <> 'removed' and exists (select 1 from public.orders where listing_id = old.id
      and status in ('price_accepted', 'address_provided', 'shipped', 'delivered')) then
    raise exception 'Listing status is controlled by its agreed order';
  end if;
  return new;
end;
$$;
create trigger listings_integrity_trigger before update on public.listings
for each row execute function public.listings_protect_integrity();

create or replace function public.reviews_validate_integrity()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is not null and auth.uid() <> new.reviewer_id then raise exception 'Cannot impersonate a reviewer'; end if;
  if new.rating < 1 or new.rating > 5 or char_length(coalesce(new.body, '')) > 5000 or not exists (
    select 1 from public.orders o join public.listings l on l.id = o.listing_id
    where o.thread_id = new.thread_id and o.listing_id = new.listing_id and o.buyer_id = new.reviewer_id
      and o.seller_id = new.seller_id and l.seller_id = new.seller_id and o.status = 'delivered'
  ) then raise exception 'Only the buyer of a delivered order may review its seller'; end if;
  return new;
end;
$$;
create trigger reviews_integrity_trigger before insert on public.reviews
for each row execute function public.reviews_validate_integrity();

-- Row policies cannot hide a private column. Keep public fields queryable and
-- use narrowly scoped functions for the owner's phone / explicit public opt-in.
revoke select on public.profiles from anon, authenticated;
grant select (id, display_name, avatar_url, bio, region, district, phone_verified,
  show_phone_on_listing, is_seller, is_moderator, warned_at, is_banned, region_preference,
  ratings_avg, ratings_count, active_listings_count, sold_count, created_at, updated_at)
on public.profiles to anon, authenticated;

create or replace function public.get_my_profile_phone()
returns jsonb language sql security definer stable set search_path = public, pg_temp as $$
  select jsonb_build_object('phone', p.phone, 'phone_verified', p.phone_verified,
    'show_phone_on_listing', p.show_phone_on_listing)
  from public.profiles p where p.id = auth.uid();
$$;
revoke all on function public.get_my_profile_phone() from public, anon;
grant execute on function public.get_my_profile_phone() to authenticated;

create or replace function public.get_profile_phone(profile_id uuid)
returns text language sql security definer stable set search_path = public, pg_temp as $$
  select p.phone from public.profiles p where p.id = profile_id and
    (p.id = auth.uid() or (p.show_phone_on_listing and p.phone_verified and not p.is_banned));
$$;
revoke all on function public.get_profile_phone(uuid) from public;
grant execute on function public.get_profile_phone(uuid) to anon, authenticated;

create or replace function public.sync_phone_verified_from_auth()
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  actor uuid := auth.uid();
  verified_phone text;
begin
  if actor is null then raise exception 'Authentication required'; end if;
  select phone into verified_phone from auth.users where id = actor and phone_confirmed_at is not null;
  if nullif(verified_phone, '') is null then raise exception 'Phone has not been verified'; end if;
  update public.profiles set phone = '+' || regexp_replace(verified_phone, '[^0-9]', '', 'g'), phone_verified = true where id = actor;
end;
$$;
revoke all on function public.sync_phone_verified_from_auth() from public, anon;
grant execute on function public.sync_phone_verified_from_auth() to authenticated;

create or replace function public.bids_validate_integrity()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  listing public.listings%rowtype;
  top_amount numeric;
  minimum numeric;
begin
  -- Serializing on the listing also prevents a bid racing its finalization.
  select * into listing from public.listings where id = new.listing_id for update;
  if listing.id is null or listing.type <> 'auction' or listing.status <> 'active' or
     listing.auction_ends_at is null or listing.auction_ends_at <= clock_timestamp() then
    raise exception 'Auction is not active';
  end if;
  if new.bidder_id = listing.seller_id then raise exception 'Cannot bid on your own auction'; end if;
  if exists (select 1 from public.profiles where id in (new.bidder_id, listing.seller_id) and is_banned) then
    raise exception 'Banned users cannot participate in an auction';
  end if;
  if new.amount is null or new.amount::text in ('NaN', 'Infinity', '-Infinity') or new.amount <= 0 or
     listing.auction_start_price <= 0 or listing.auction_min_increment <= 0 then
    raise exception 'Invalid bid amount or auction price';
  end if;
  select max(amount) into top_amount from public.bids where listing_id = new.listing_id;
  minimum := case when top_amount is null then listing.auction_start_price else top_amount + listing.auction_min_increment end;
  if new.amount < minimum then raise exception 'Minimum bid is %', minimum; end if;
  return new;
end;
$$;
create trigger bids_integrity_trigger before insert on public.bids
for each row execute function public.bids_validate_integrity();

create or replace function public.threads_validate_integrity()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  actor uuid := auth.uid();
  listing public.listings%rowtype;
  owner_id uuid;
  winner_id uuid;
begin
  if new.user1_id = new.user2_id then raise exception 'A conversation requires two different participants'; end if;
  if tg_op = 'UPDATE' then
    if new.context_type is distinct from old.context_type or new.listing_id is distinct from old.listing_id or
       new.wanted_request_id is distinct from old.wanted_request_id or new.user1_id is distinct from old.user1_id or
       new.user2_id is distinct from old.user2_id then raise exception 'Thread context and participants cannot change'; end if;
    if actor is not null and pg_trigger_depth() = 1 then
      if new.deal_confirmed_at is distinct from old.deal_confirmed_at and new.context_type = 'listing' and
         not exists (select 1 from public.listings where id = new.listing_id and seller_id = actor) then
        raise exception 'Only seller can confirm a listing deal';
      end if;
      if new.order_delivered_at is distinct from old.order_delivered_at and not exists (
        select 1 from public.orders where thread_id = new.id and buyer_id = actor and status = 'delivered'
      ) then raise exception 'Order must be delivered before setting its delivery timestamp'; end if;
    end if;
    return new;
  end if;
  if actor is not null and exists (select 1 from public.profiles where id in (new.user1_id, new.user2_id) and is_banned) then
    raise exception 'Banned users cannot start conversations';
  end if;
  if new.context_type = 'listing' then
    select * into listing from public.listings where id = new.listing_id;
    if listing.id is null or listing.seller_id not in (new.user1_id, new.user2_id) then
      raise exception 'Listing seller must be a thread participant';
    end if;
    if actor is not null then
      if listing.type = 'auction' then
        select bidder_id into winner_id from public.bids where listing_id = listing.id
        order by amount desc, created_at asc, id asc limit 1;
        if listing.status not in ('reserved', 'sold') or winner_id is null or
           winner_id not in (new.user1_id, new.user2_id) then raise exception 'Only the auction winner may start this chat'; end if;
      elsif listing.status <> 'active' then raise exception 'Listing is no longer active'; end if;
    end if;
  elsif new.context_type = 'wanted' then
    select user_id into owner_id from public.wanted_requests where id = new.wanted_request_id and status = 'active';
    if owner_id is null or owner_id not in (new.user1_id, new.user2_id) then
      raise exception 'Active wanted request owner must be a thread participant';
    end if;
  end if;
  return new;
end;
$$;
create trigger threads_integrity_trigger before insert or update on public.threads
for each row execute function public.threads_validate_integrity();

-- Run block checks with access to both participants' block rows. Ordinary
-- cross-user subqueries inside RLS cannot see the recipient's private blocks.
create or replace function public.messages_validate_integrity()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  t public.threads%rowtype;
  l public.listings%rowtype;
  o public.orders%rowtype;
  source public.messages%rowtype;
  recipient uuid;
begin
  select * into t from public.threads where id = new.thread_id;
  if t.id is null or new.sender_id not in (t.user1_id, t.user2_id) then raise exception 'Sender is not a thread participant'; end if;
  if auth.uid() is not null and auth.uid() <> new.sender_id then raise exception 'Cannot impersonate another sender'; end if;
  recipient := case when new.sender_id = t.user1_id then t.user2_id else t.user1_id end;
  if exists (select 1 from public.blocks where blocker_id = recipient and blocked_id = new.sender_id) then
    raise exception 'Recipient has blocked the sender';
  end if;
  if exists (select 1 from public.profiles where id = new.sender_id and is_banned) then raise exception 'Banned users cannot send messages'; end if;
  if auth.uid() is not null then new.created_at := clock_timestamp(); end if;
  if char_length(new.body) > 5000 or jsonb_typeof(new.attachments) <> 'array' or jsonb_array_length(new.attachments) > 10 then
    raise exception 'Invalid message length or attachments';
  end if;
  if auth.uid() is not null and (select count(*) from public.messages where sender_id = new.sender_id
      and created_at > clock_timestamp() - interval '1 minute') >= 30 then raise exception 'Too many messages, try again later'; end if;
  if t.context_type = 'listing' then
    select * into l from public.listings where id = t.listing_id;
    if new.message_type in ('offer_price', 'offer_swap') then
      if l.status <> 'active' or l.type = 'auction' then raise exception 'Listing no longer accepts chat offers'; end if;
      if new.message_type = 'offer_swap' and (not l.swap_enabled or new.sender_id = l.seller_id) then
        raise exception 'Swap is not available for this listing';
      end if;
    end if;
  end if;
  if new.message_type = 'order_status' then
    select * into o from public.orders where thread_id = new.thread_id;
    if o.id is null or new.metadata->>'order_id' is distinct from o.id::text or
       new.metadata->>'order_status' is distinct from o.status::text then raise exception 'Message must match the actual order state'; end if;
    if (o.status = 'shipped' and new.sender_id <> o.seller_id) or
       (o.status = 'price_accepted' and new.sender_id <> o.seller_id and not exists (
         select 1 from public.messages counter_offer where counter_offer.id::text = new.metadata->>'source_offer_message_id'
           and counter_offer.thread_id = t.id and counter_offer.sender_id = o.seller_id
           and counter_offer.message_type = 'offer_price' and new.sender_id = o.buyer_id
           and counter_offer.metadata->>'counter_to_message_id' is not null
       )) or
       (o.status in ('address_provided', 'delivered') and new.sender_id <> o.buyer_id) then raise exception 'Wrong order status actor'; end if;
  elsif new.message_type = 'system' then
    if new.metadata->>'source_offer_message_id' is not null then
      select * into source from public.messages where id::text = new.metadata->>'source_offer_message_id'
        and thread_id = new.thread_id and message_type in ('offer_price', 'offer_swap');
      if source.id is null or source.sender_id = new.sender_id or
         (l.seller_id is distinct from new.sender_id and not (
           source.sender_id = l.seller_id and source.message_type = 'offer_price' and source.metadata->>'counter_to_message_id' is not null
         )) then
        raise exception 'Only the listing seller can respond to an offer in this thread';
      end if;
    elsif new.metadata->>'kind' in ('shipping_address', 'tracking_number') then
      select * into o from public.orders where thread_id = new.thread_id;
      if o.id is null or new.metadata->>'order_id' is distinct from o.id::text or
         (new.metadata->>'kind' = 'shipping_address' and (new.sender_id <> o.buyer_id or o.status <> 'address_provided')) or
         (new.metadata->>'kind' = 'tracking_number' and (new.sender_id <> o.seller_id or o.status <> 'shipped')) then
        raise exception 'System message does not match the order';
      end if;
    else raise exception 'Unsupported system message'; end if;
  end if;
  return new;
end;
$$;
create trigger messages_integrity_trigger before insert on public.messages
for each row execute function public.messages_validate_integrity();

create or replace function public.orders_protect_fields()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  l public.listings%rowtype;
  actor uuid := auth.uid();
begin
  select * into l from public.listings where id = new.listing_id for update;
  if tg_op = 'UPDATE' then
    if actor is not null then
      if new.accepted_price_eur is distinct from old.accepted_price_eur and
         (actor not in (old.seller_id, old.buyer_id) or new.status <> 'price_accepted' or old.status not in ('negotiating', 'price_accepted', 'cancelled')) then
        raise exception 'Only seller may agree the price before shipping';
      end if;
      if new.tracking_number is distinct from old.tracking_number and (actor <> old.seller_id or new.status <> 'shipped') then
        raise exception 'Only seller may set shipment tracking';
      end if;
      if new.shipping_address is distinct from old.shipping_address and
         (actor <> old.buyer_id or old.status not in ('price_accepted', 'address_provided') or new.status <> 'address_provided') then
        raise exception 'Only buyer may provide an address before shipment';
      end if;
      if old.status = 'delivered' and new.status <> 'delivered' then raise exception 'Delivered orders cannot be reopened or cancelled'; end if;
    end if;
  elsif actor is not null and (new.shipping_address is not null or new.tracking_number is not null) then
    raise exception 'New orders cannot contain shipment details';
  end if;
  if new.accepted_price_eur is not null and (new.accepted_price_eur::text in ('NaN', 'Infinity', '-Infinity') or new.accepted_price_eur <= 0) then
    raise exception 'Invalid accepted price';
  end if;
  if new.status in ('price_accepted', 'address_provided', 'shipped', 'delivered') and exists (
    select 1 from public.orders where listing_id = new.listing_id and id <> new.id
      and status in ('price_accepted', 'address_provided', 'shipped', 'delivered')
  ) then raise exception 'This listing already has an agreed buyer'; end if;
  if (tg_op = 'INSERT' or (new.status = 'price_accepted' and old.status in ('negotiating', 'cancelled'))) and
     l.status <> 'active' then raise exception 'Listing is no longer available'; end if;
  return new;
end;
$$;
create trigger orders_protect_fields_trigger before insert or update on public.orders
for each row execute function public.orders_protect_fields();

create or replace function public.listings_sync_status_from_order()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare next_status public.listing_status;
begin
  if tg_op = 'UPDATE' and new.status = old.status then return new; end if;
  if new.status = 'negotiating' or (tg_op = 'INSERT' and new.status = 'cancelled') then return new; end if;
  if exists (select 1 from public.orders where listing_id = new.listing_id and status = 'delivered') then
    next_status := 'sold';
  elsif exists (select 1 from public.orders where listing_id = new.listing_id and status in ('price_accepted', 'address_provided', 'shipped'))
    or (new.status = 'cancelled' and tg_op = 'UPDATE' and old.status = 'shipped') then
    next_status := 'reserved';
  elsif new.status = 'cancelled' then next_status := 'active';
  else return new;
  end if;
  update public.listings set status = next_status, updated_at = now()
  where id = new.listing_id and status not in ('removed', 'expired') and status is distinct from next_status;
  return new;
end;
$$;

-- Trigger functions are never useful as public RPCs.
revoke all on function public.profiles_validate_sensitive_fields(), public.bids_validate_integrity(),
  public.threads_validate_integrity(), public.messages_validate_integrity(), public.orders_protect_fields(),
  public.listings_update_profile_counts(), public.listings_protect_integrity(), public.reviews_validate_integrity()
from public, anon, authenticated;

-- An order transition and its chat messages either all commit or all roll back.
create or replace function public.perform_order_action(
  p_thread_id uuid,
  p_action text,
  p_offer_message_id uuid default null,
  p_shipping_address jsonb default null,
  p_tracking_number text default null,
  p_save_as_default boolean default false
)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  actor uuid := auth.uid();
  t public.threads%rowtype;
  l public.listings%rowtype;
  o public.orders%rowtype;
  offer public.messages%rowtype;
  buyer uuid;
  amount_text text;
  amount numeric;
  next_status public.order_status_type;
  listing_status text;
  message_body text;
  message_metadata jsonb;
begin
  if actor is null then raise exception 'Prihláste sa.'; end if;
  select * into t from public.threads where id = p_thread_id for update;
  if t.id is null or actor not in (t.user1_id, t.user2_id) or t.context_type <> 'listing' then
    raise exception 'Nemáte prístup ku konverzácii.';
  end if;
  if exists (select 1 from public.profiles where id = actor and is_banned) or exists (
    select 1 from public.blocks where blocker_id = case when actor = t.user1_id then t.user2_id else t.user1_id end and blocked_id = actor
  ) then raise exception 'Nemáte oprávnenie zmeniť dohodu.'; end if;
  select * into l from public.listings where id = t.listing_id for update;
  buyer := case when t.user1_id = l.seller_id then t.user2_id else t.user1_id end;
  select * into o from public.orders where thread_id = t.id for update;

  if p_action in ('accept_price', 'accept_swap', 'decline') then
    select * into offer from public.messages where id = p_offer_message_id and thread_id = t.id
      and message_type in ('offer_price', 'offer_swap');
    if offer.id is null then raise exception 'Ponuka sa nenašla.'; end if;
    if offer.sender_id = buyer then
      if actor <> l.seller_id then raise exception 'Ponuku môže potvrdiť alebo odmietnuť iba predajca.'; end if;
    elsif offer.sender_id = l.seller_id then
      if actor <> buyer or offer.message_type <> 'offer_price' or not exists (
        select 1 from public.messages where id::text = offer.metadata->>'counter_to_message_id'
          and thread_id = t.id and sender_id = buyer and message_type in ('offer_price', 'offer_swap')
      ) then raise exception 'Protiponuku môže potvrdiť alebo odmietnuť iba jej kupujúci.'; end if;
    else raise exception 'Neplatný autor ponuky.'; end if;
    if p_action in ('accept_price', 'accept_swap') and o.id is not null and o.status not in ('negotiating', 'cancelled') and exists (
      select 1 from public.messages where thread_id = t.id and message_type = 'order_status'
        and metadata->>'source_offer_message_id' = offer.id::text and metadata->>'order_id' = o.id::text
    ) then return; end if;
    if p_action = 'decline' and exists (select 1 from public.messages where thread_id = t.id
      and metadata->>'source_offer_message_id' = offer.id::text and metadata->>'action' = 'declined') then return; end if;
    if l.type <> 'fixed' or l.status <> 'active' or (o.id is not null and o.status not in ('negotiating', 'cancelled')) then
      raise exception 'Na tento inzerát už nie je možné reagovať ponukou.';
    end if;
    if exists (select 1 from public.messages where thread_id = t.id and message_type = 'system'
      and metadata->>'source_offer_message_id' = offer.id::text and metadata->>'action' = 'declined') then
      raise exception 'Táto ponuka už bola odmietnutá.';
    end if;
    if p_action = 'decline' then
      insert into public.messages(thread_id, sender_id, body, message_type, metadata, attachments)
      values (t.id, actor, 'Ponuka odmietnutá', 'system', jsonb_build_object('source_offer_message_id', offer.id, 'action', 'declined'), '[]');
      return;
    end if;
    if p_action = 'accept_swap' then
      if offer.message_type <> 'offer_swap' or not l.swap_enabled then raise exception 'Výmena nie je pri tomto inzeráte dostupná.'; end if;
      amount := 0.01; -- existing swap representation, UI hides this sentinel
      message_body := 'Výmena odsúhlasená';
    else
      if offer.message_type <> 'offer_price' then raise exception 'Potvrdiť môžete iba cenovú ponuku.'; end if;
      amount_text := coalesce(offer.metadata->>'amount_eur', offer.metadata->>'amount', offer.body);
      amount_text := replace(trim(amount_text), ',', '.');
      if amount_text !~ '^[0-9]+(\.[0-9]{1,2})?$' then raise exception 'Ponuka neobsahuje platnú sumu.'; end if;
      amount := amount_text::numeric;
      if amount <= 0 or amount > 99999999.99 then raise exception 'Ponuka neobsahuje platnú sumu.'; end if;
      message_body := 'Cena odsúhlasená: ' || to_char(amount, 'FM999999990.00') || ' €';
    end if;
    insert into public.orders(thread_id, listing_id, buyer_id, seller_id, status, accepted_price_eur)
    values (t.id, l.id, buyer, l.seller_id, 'price_accepted', amount)
    on conflict (thread_id) do update set status = 'price_accepted', accepted_price_eur = excluded.accepted_price_eur
    returning * into o;
    next_status := 'price_accepted';
    message_metadata := jsonb_build_object('source_offer_message_id', offer.id,
      'accepted_price_eur', amount, 'accepted_offer_type', case when p_action = 'accept_swap' then 'swap' else 'price' end);
  elsif p_action = 'address' then
    if actor <> buyer or o.id is null or o.status not in ('price_accepted', 'address_provided') then
      raise exception 'Adresu môže odoslať iba kupujúci po potvrdení ceny.';
    end if;
    if p_shipping_address is null or jsonb_typeof(p_shipping_address) <> 'object' or exists (
      select 1 from unnest(array['name', 'street', 'city', 'zip', 'country']) as field_name
      where jsonb_typeof(p_shipping_address->field_name) is distinct from 'string' or
        nullif(trim(p_shipping_address->>field_name), '') is null or char_length(p_shipping_address->>field_name) > 300
    ) then raise exception 'Vyplňte všetky povinné polia adresy.'; end if;
    if o.status = 'address_provided' and o.shipping_address = p_shipping_address then return; end if;
    next_status := 'address_provided';
    update public.orders set status = next_status, shipping_address = p_shipping_address where id = o.id;
    if p_save_as_default then
      insert into public.profile_shipping_addresses(user_id, name, street, city, zip, country, phone)
      values (actor, p_shipping_address->>'name', p_shipping_address->>'street', p_shipping_address->>'city',
        p_shipping_address->>'zip', p_shipping_address->>'country', p_shipping_address->>'phone')
      on conflict (user_id) do update set name = excluded.name, street = excluded.street, city = excluded.city,
        zip = excluded.zip, country = excluded.country, phone = excluded.phone;
    end if;
    message_body := 'Adresa odoslaná';
    insert into public.messages(thread_id, sender_id, body, message_type, metadata, attachments)
    values (t.id, actor, concat_ws(E'\n', 'Adresa pre odoslanie:', p_shipping_address->>'name',
      p_shipping_address->>'street', concat_ws(' ', p_shipping_address->>'zip', p_shipping_address->>'city'),
      p_shipping_address->>'country', case when nullif(p_shipping_address->>'phone', '') is not null then 'Tel.: ' || (p_shipping_address->>'phone') end),
      'system', jsonb_build_object('order_id', o.id, 'kind', 'shipping_address'), '[]');
  elsif p_action = 'shipped' then
    if actor <> l.seller_id or o.id is null or o.status not in ('address_provided', 'shipped') then
      raise exception 'Balíček môže označiť predajca až po odoslaní adresy.';
    end if;
    if char_length(coalesce(p_tracking_number, '')) > 120 then raise exception 'Tracking číslo je príliš dlhé.'; end if;
    if o.status = 'shipped' and o.tracking_number is not distinct from nullif(trim(p_tracking_number), '') then return; end if;
    next_status := 'shipped';
    update public.orders set status = next_status, tracking_number = nullif(trim(p_tracking_number), '') where id = o.id;
    message_body := 'Balíček odoslaný';
    if nullif(trim(p_tracking_number), '') is not null then
      insert into public.messages(thread_id, sender_id, body, message_type, metadata, attachments)
      values (t.id, actor, 'Tracking číslo: ' || trim(p_tracking_number), 'system',
        jsonb_build_object('order_id', o.id, 'kind', 'tracking_number'), '[]');
    end if;
  elsif p_action = 'delivered' then
    if actor <> buyer or o.id is null or o.status not in ('shipped', 'delivered') then
      raise exception 'Doručenie môže potvrdiť iba kupujúci po odoslaní balíčka.';
    end if;
    if o.status = 'delivered' then return; end if;
    next_status := 'delivered';
    update public.orders set status = next_status where id = o.id;
    update public.threads set order_delivered_at = coalesce(order_delivered_at, now()) where id = t.id;
    message_body := 'Objednávka doručená';
  else raise exception 'Nepodporovaná zmena objednávky.';
  end if;
  listing_status := case when next_status = 'delivered' then 'sold' else 'reserved' end;
  insert into public.messages(thread_id, sender_id, body, message_type, metadata, attachments)
  values (t.id, actor, message_body, 'order_status', coalesce(message_metadata, '{}') ||
    jsonb_build_object('order_id', o.id, 'order_status', next_status, 'listing_status', listing_status), '[]');
end;
$$;
revoke all on function public.perform_order_action(uuid, text, uuid, jsonb, text, boolean) from public, anon;
grant execute on function public.perform_order_action(uuid, text, uuid, jsonb, text, boolean) to authenticated;

-- Cron-only transaction: winner, thread and order stay consistent; reruns skip
-- reserved/expired auctions and simultaneous cron requests lock different rows.
create or replace function public.finalize_ended_auctions()
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  listing public.listings%rowtype;
  winning_bid public.bids%rowtype;
  finalized_thread_id uuid;
  finalized int := 0;
  expired int := 0;
begin
  for listing in select * from public.listings where type = 'auction' and status = 'active'
      and auction_ends_at <= now() for update skip locked loop
    select * into winning_bid from public.bids where listing_id = listing.id
      order by amount desc, created_at asc, id asc limit 1;
    if winning_bid.id is null then
      update public.listings set status = 'expired' where id = listing.id;
      expired := expired + 1;
      continue;
    end if;
    insert into public.threads(context_type, listing_id, user1_id, user2_id)
    values ('listing', listing.id, least(listing.seller_id, winning_bid.bidder_id), greatest(listing.seller_id, winning_bid.bidder_id))
    on conflict (listing_id, least(user1_id, user2_id), greatest(user1_id, user2_id)) where context_type = 'listing'
      do update set updated_at = public.threads.updated_at
    returning id into finalized_thread_id;
    insert into public.orders(thread_id, listing_id, buyer_id, seller_id, status, accepted_price_eur)
    values (finalized_thread_id, listing.id, winning_bid.bidder_id, listing.seller_id, 'price_accepted', winning_bid.amount)
    on conflict (thread_id) do update set status = 'price_accepted', accepted_price_eur = excluded.accepted_price_eur
      where public.orders.status in ('negotiating', 'cancelled');
    insert into public.thread_deal_confirmations(thread_id, user_id, confirmed_at)
    values (finalized_thread_id, listing.seller_id, now()), (finalized_thread_id, winning_bid.bidder_id, now())
    on conflict (thread_id, user_id) do nothing;
    update public.threads set deal_confirmed_at = coalesce(deal_confirmed_at, now()) where id = finalized_thread_id;
    finalized := finalized + 1;
  end loop;
  return jsonb_build_object('finalized', finalized, 'expired', expired);
end;
$$;
revoke all on function public.finalize_ended_auctions() from public, anon, authenticated;
grant execute on function public.finalize_ended_auctions() to service_role;

-- Buyer counteroffer acceptance is authorized only through the validated RPC.
-- Direct buyer table updates to price_accepted are still denied by RLS.
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
       and actor is not null and actor is distinct from old.buyer_id then
      raise exception 'Only buyer can change shipping address';
    end if;

    if new.status is distinct from old.status then
      case new.status
        when 'price_accepted' then
          if actor is distinct from old.seller_id and actor is not null and actor is distinct from old.buyer_id then
            raise exception 'Only an offer recipient can set status price_accepted';
          end if;
          if old.status not in ('negotiating', 'price_accepted', 'cancelled') then
            raise exception 'Invalid transition to price_accepted from %', old.status;
          end if;
        when 'address_provided' then
          if actor is not null and actor is distinct from old.buyer_id then
            raise exception 'Only buyer can set status address_provided';
          end if;
          if old.status not in ('price_accepted', 'address_provided') then
            raise exception 'Invalid transition to address_provided from %', old.status;
          end if;
          if new.shipping_address is null then
            raise exception 'Shipping address is required for status address_provided';
          end if;
        when 'shipped' then
          if actor is not null and actor is distinct from old.seller_id then
            raise exception 'Only seller can set status shipped';
          end if;
          if old.status not in ('address_provided', 'shipped') then
            raise exception 'Invalid transition to shipped from %', old.status;
          end if;
        when 'delivered' then
          if actor is not null and actor is distinct from old.buyer_id then
            raise exception 'Only buyer can set status delivered';
          end if;
          if old.status not in ('shipped', 'delivered') then
            raise exception 'Invalid transition to delivered from %', old.status;
          end if;
        when 'cancelled' then
          if actor is not null and actor is distinct from old.buyer_id and actor is distinct from old.seller_id then
            raise exception 'Only buyer or seller can cancel the order';
          end if;
        when 'negotiating' then
          raise exception 'Status cannot be changed back to negotiating';
      end case;
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;
