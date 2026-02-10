-- Enforce blocks in chat: hide threads where current user blocked the other; reject message insert if recipient blocked sender.

-- Threads: only show if current user has not blocked the other participant
drop policy if exists "threads_select_participant" on public.threads;
create policy "threads_select_participant" on public.threads for select
  using (
    (user1_id = auth.uid() or user2_id = auth.uid())
    and not exists (
      select 1 from public.blocks b
      where b.blocker_id = auth.uid()
        and b.blocked_id = (case when threads.user1_id = auth.uid() then threads.user2_id else threads.user1_id end)
    )
  );

-- Messages: sender must not be blocked by the other participant (recipient)
-- So: when inserting, the "other" participant (user1 or user2 who is not sender) must not have blocked the sender.
drop policy if exists "messages_insert_participant" on public.messages;
create policy "messages_insert_participant" on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.threads t
      where t.id = messages.thread_id and (t.user1_id = auth.uid() or t.user2_id = auth.uid())
    )
    and not exists (
      select 1 from public.threads t
      inner join public.blocks b
        on b.blocked_id = auth.uid()
        and b.blocker_id = (case when t.user1_id = auth.uid() then t.user2_id else t.user1_id end)
      where t.id = messages.thread_id
    )
  );
