-- Listing threads: only seller can confirm; deal_confirmed_at set when seller confirms.
-- Wanted/direct: keep "both confirmed" behaviour.

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

-- RLS: for listing threads only the seller can insert a confirmation
drop policy if exists "thread_deal_confirmations_insert_own" on public.thread_deal_confirmations;
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
