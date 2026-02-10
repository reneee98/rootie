-- Allow participants to update their own confirmation row (needed for upsert when row already exists).
create policy "thread_deal_confirmations_update_own" on public.thread_deal_confirmations for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
