-- Rebuild historical values after the integrity triggers are installed.
-- Those triggers protect future writes; earlier values can still be stale.
with derived as (
  select
    p.id,
    (select count(*)::int from public.listings where seller_id = p.id and status = 'active') as active_listings_count,
    (select count(*)::int from public.listings where seller_id = p.id and status = 'sold') as sold_count,
    (select count(*)::int from public.reviews where seller_id = p.id) as ratings_count,
    (select round(avg(rating)::numeric, 2) from public.reviews where seller_id = p.id) as ratings_avg,
    exists (
      select 1 from auth.users u
      where u.id = p.id and u.phone_confirmed_at is not null
        and nullif(regexp_replace(coalesce(p.phone, ''), '[^0-9]', '', 'g'), '') = regexp_replace(u.phone, '[^0-9]', '', 'g')
    ) as phone_verified
  from public.profiles p
)
update public.profiles p
set
  active_listings_count = d.active_listings_count,
  sold_count = d.sold_count,
  ratings_count = d.ratings_count,
  ratings_avg = d.ratings_avg,
  phone_verified = d.phone_verified
from derived d
where p.id = d.id
  and (p.active_listings_count, p.sold_count, p.ratings_count, p.ratings_avg, p.phone_verified)
    is distinct from (d.active_listings_count, d.sold_count, d.ratings_count, d.ratings_avg, d.phone_verified);
