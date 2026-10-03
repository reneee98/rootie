-- Run in the trusted Supabase SQL Editor after the integrity migrations.
-- Uses existing seeded demo accounts. Every fixture and action is rolled back
-- inside a subtransaction, so no messages, offers or orders remain committed.
do $rootie_smoke$
declare
  seller uuid;
  buyer uuid;
  fixed_listing uuid := gen_random_uuid();
  auction_listing uuid := gen_random_uuid();
  test_thread uuid := gen_random_uuid();
  offer uuid := gen_random_uuid();
  bid_rejected boolean := false;
  smoke_passed boolean := false;
begin
  if auth.uid() is not null then raise exception 'Expected trusted SQL session'; end if;
  begin
    select u.id into seller from auth.users u join public.profiles p on p.id=u.id
    where u.email='predajca@test.rootie.sk' and not p.is_banned;
    select u.id into buyer from auth.users u join public.profiles p on p.id=u.id
    where u.email in ('kupujuci@test.rootie.sk','druhy@test.rootie.sk') and not p.is_banned
      and not exists(select 1 from public.blocks b where
        (b.blocker_id=seller and b.blocked_id=u.id) or (b.blocker_id=u.id and b.blocked_id=seller))
    order by u.email='kupujuci@test.rootie.sk' desc limit 1;
    if seller is null or buyer is null then raise exception 'Unblocked seeded demo accounts are required'; end if;

    insert into public.listings(id,seller_id,type,plant_name,region,fixed_price,swap_enabled)
    values(fixed_listing,seller,'fixed','Rootie migration smoke fixture','Bratislavský kraj',10,false);
    insert into public.listings(id,seller_id,type,plant_name,region,auction_start_price,auction_min_increment,auction_ends_at)
    values(auction_listing,seller,'auction','Rootie auction smoke fixture','Bratislavský kraj',10,1,now()+interval '1 hour');
    insert into public.threads(id,context_type,listing_id,user1_id,user2_id)
    values(test_thread,'listing',fixed_listing,least(seller,buyer),greatest(seller,buyer));

    perform set_config('request.jwt.claim.sub',buyer::text,true);
    insert into public.messages(id,thread_id,sender_id,body,message_type,metadata)
    values(offer,test_thread,buyer,'12','offer_price','{"amount_eur":12}');
    perform set_config('request.jwt.claim.sub',seller::text,true);
    perform public.perform_order_action(test_thread,'accept_price',offer);
    perform public.perform_order_action(test_thread,'accept_price',offer);
    if not exists(select 1 from public.listings where id=fixed_listing and status='reserved') or
      (select count(*) from public.messages where thread_id=test_thread and message_type='order_status')<>1 then
      raise exception 'Reservation or idempotent acceptance failed';
    end if;
    perform set_config('request.jwt.claim.sub',buyer::text,true);
    perform public.perform_order_action(test_thread,'address',null,
      '{"name":"Demo buyer","street":"Test street 1","city":"Bratislava","zip":"81101","country":"Slovensko"}');
    perform set_config('request.jwt.claim.sub',seller::text,true);
    perform public.perform_order_action(test_thread,'shipped');
    perform set_config('request.jwt.claim.sub',buyer::text,true);
    perform public.perform_order_action(test_thread,'delivered');
    perform public.perform_order_action(test_thread,'delivered');
    insert into public.reviews(reviewer_id,seller_id,listing_id,thread_id,rating,body)
    values(buyer,seller,fixed_listing,test_thread,5,'Temporary migration smoke fixture');
    if not exists(select 1 from public.orders where thread_id=test_thread and status='delivered') or
      not exists(select 1 from public.listings where id=fixed_listing and status='sold') or
      (select count(*) from public.messages where thread_id=test_thread and metadata->>'order_status'='delivered')<>1 then
      raise exception 'Shipping, delivery or retry failed';
    end if;

    begin
      insert into public.bids(listing_id,bidder_id,amount) values(auction_listing,buyer,9);
    exception when raise_exception then
      if sqlerrm not like 'Minimum bid%' then raise; end if;
      bid_rejected := true;
    end;
    if not bid_rejected then raise exception 'Invalid auction bid was accepted'; end if;
    insert into public.bids(listing_id,bidder_id,amount) values(auction_listing,buyer,10);
    perform set_config('request.jwt.claim.sub','',true);
    update public.listings set auction_ends_at=now()-interval '1 second' where id=auction_listing;
    perform public.finalize_ended_auctions();
    perform public.finalize_ended_auctions();
    if not exists(select 1 from public.listings where id=auction_listing and status='reserved') or
      (select count(*) from public.orders where listing_id=auction_listing and status='price_accepted')<>1 then
      raise exception 'Auction finalization or retry failed';
    end if;

    smoke_passed := true;
    raise exception using errcode='ZX001',message='Rollback successful smoke fixtures';
  exception when sqlstate 'ZX001' then
    if not smoke_passed then raise; end if;
  end;

  if exists(select 1 from public.listings where id in (fixed_listing,auction_listing)) or
    exists(select 1 from public.threads where id=test_thread) or
    exists(select 1 from public.messages where id=offer) then
    raise exception 'Smoke fixtures were not rolled back';
  end if;
  perform set_config('rootie.integrity_smoke',
    '{"orders":true,"idempotent_retries":true,"shipping_and_review":true,"bids":true,"auction_finalization":true,"fixtures_rolled_back":true}',true);
end;
$rootie_smoke$;

select current_setting('rootie.integrity_smoke')::jsonb as cloud_smoke;
