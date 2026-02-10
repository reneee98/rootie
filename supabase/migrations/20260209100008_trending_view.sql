-- Trending score: weighted reactions + recency decay.
-- Weights: like=1, want=2, wow=1.5, funny=0.5, sad=0.5.
-- Recency: exp(-0.05 * days_since_created) so newer listings rank higher.

create or replace view public.listing_trending_scores as
select
  l.id as listing_id,
  l.region,
  l.status,
  (
    coalesce(r.like_c, 0) * 1.0
    + coalesce(r.want_c, 0) * 2.0
    + coalesce(r.wow_c, 0) * 1.5
    + coalesce(r.funny_c, 0) * 0.5
    + coalesce(r.sad_c, 0) * 0.5
  )
  * exp(-0.05 * extract(epoch from (now() - l.created_at)) / 86400.0) as trending_score
from public.listings l
left join (
  select
    listing_id,
    count(*) filter (where reaction_type = 'like') as like_c,
    count(*) filter (where reaction_type = 'want') as want_c,
    count(*) filter (where reaction_type = 'wow') as wow_c,
    count(*) filter (where reaction_type = 'funny') as funny_c,
    count(*) filter (where reaction_type = 'sad') as sad_c
  from public.reactions
  group by listing_id
) r on r.listing_id = l.id
where l.status = 'active';

comment on view public.listing_trending_scores is 'Trending score per active listing for region-based trending feed.';
