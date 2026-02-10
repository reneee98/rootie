-- Deal confirmations: each participant confirms; when both have confirmed, set threads.deal_confirmed_at.
-- Reviews: update seller profile ratings_avg and ratings_count on insert/delete.

-- =============================================================================
-- Thread deal confirmations (one row per user per thread)
-- =============================================================================
create table if not exists public.thread_deal_confirmations (
  thread_id uuid not null references public.threads (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  confirmed_at timestamptz not null default now(),
  primary key (thread_id, user_id),
  constraint thread_deal_confirmation_participant check (
    exists (
      select 1 from public.threads t
      where t.id = thread_id and (t.user1_id = user_id or t.user2_id = user_id)
    )
  )
);

create index idx_thread_deal_confirmations_user on public.thread_deal_confirmations (user_id);

alter table public.thread_deal_confirmations enable row level security;

create policy "thread_deal_confirmations_select_participant" on public.thread_deal_confirmations for select
  using (
    exists (
      select 1 from public.threads t
      where t.id = thread_deal_confirmations.thread_id
        and (t.user1_id = auth.uid() or t.user2_id = auth.uid())
    )
  );

create policy "thread_deal_confirmations_insert_own" on public.thread_deal_confirmations for insert
  with check (user_id = auth.uid());

-- Trigger: when both participants have confirmed, set threads.deal_confirmed_at
create or replace function public.threads_set_deal_confirmed()
returns trigger as $$
declare
  other_id uuid;
  both_confirmed boolean;
begin
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

drop trigger if exists thread_deal_confirmations_set_deal_trigger on public.thread_deal_confirmations;
create trigger thread_deal_confirmations_set_deal_trigger
  after insert on public.thread_deal_confirmations
  for each row execute function public.threads_set_deal_confirmed();

-- =============================================================================
-- Update seller profile ratings when a review is inserted or deleted
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

drop trigger if exists reviews_update_seller_ratings_trigger on public.reviews;
create trigger reviews_update_seller_ratings_trigger
  after insert or delete on public.reviews
  for each row execute function public.reviews_update_seller_ratings();

-- Backfill existing reviews into profile ratings (in case reviews existed before trigger)
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
