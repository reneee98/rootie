-- Report target: add 'thread' for reporting conversations
alter type public.report_target_type add value if not exists 'thread';

-- Profiles: moderation flags
alter table public.profiles
  add column if not exists warned_at timestamptz,
  add column if not exists is_banned boolean not null default false;

-- Reports: index for moderator lookups by target
create index if not exists idx_reports_target on public.reports (target_type, target_id);

-- RLS: hide banned sellers' listings from public; block banned users from sending messages
drop policy if exists "listings_select_public" on public.listings;
create policy "listings_select_public" on public.listings for select
  using (
    status = 'active'
    and not coalesce((select is_banned from public.profiles where id = listings.seller_id), false)
  );

drop policy if exists "listing_photos_select_public" on public.listing_photos;
create policy "listing_photos_select_public" on public.listing_photos for select
  using (
    exists (
      select 1 from public.listings l
      join public.profiles p on p.id = l.seller_id
      where l.id = listing_photos.listing_id and l.status = 'active'
        and not coalesce(p.is_banned, false)
    )
  );

drop policy if exists "messages_insert_participant" on public.messages;
create policy "messages_insert_participant" on public.messages for insert
  with check (
    sender_id = auth.uid()
    and not coalesce((select is_banned from public.profiles where id = auth.uid()), false)
    and exists (
      select 1 from public.threads t
      where t.id = messages.thread_id and (t.user1_id = auth.uid() or t.user2_id = auth.uid())
    )
  );

-- Moderators can update any profile (warn, ban) and any listing (remove)
create policy "profiles_update_moderator" on public.profiles for update
  using (public.current_user_is_moderator());

create policy "listings_update_moderator" on public.listings for update
  using (public.current_user_is_moderator());
