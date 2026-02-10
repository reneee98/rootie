-- Moderators can read any thread, message, and listing (for moderation)
create policy "threads_select_moderator" on public.threads for select
  using (public.current_user_is_moderator());

create policy "messages_select_moderator" on public.messages for select
  using (public.current_user_is_moderator());

create policy "listings_select_moderator" on public.listings for select
  using (public.current_user_is_moderator());
