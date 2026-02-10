-- Chat: last_message_at on threads, message_type + metadata on messages, thread_reads for unread, realtime.

-- Add thread to report target type (for reporting a conversation)
alter type public.report_target_type add value if not exists 'thread';

-- Threads: denormalized last message time for inbox sorting
alter table public.threads
  add column if not exists last_message_at timestamptz;

create index if not exists idx_threads_last_message_at on public.threads (last_message_at desc nulls last);

-- Backfill from latest message per thread
update public.threads t
set last_message_at = (
  select max(m.created_at) from public.messages m where m.thread_id = t.id
)
where last_message_at is null;

-- Message type and metadata (offer_price amount, offer_swap listing_id, system text)
create type public.message_type as enum ('text', 'offer_price', 'offer_swap', 'system');

alter table public.messages
  add column if not exists message_type public.message_type not null default 'text',
  add column if not exists metadata jsonb default '{}';

comment on column public.messages.metadata is 'e.g. { "amount": 10.5 } for offer_price, { "listing_id": "uuid" } for offer_swap';

-- Trigger: set threads.last_message_at on message insert
create or replace function public.threads_set_last_message_at()
returns trigger as $$
begin
  update public.threads
  set last_message_at = new.created_at, updated_at = new.created_at
  where id = new.thread_id;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists threads_last_message_at_trigger on public.messages;
create trigger threads_last_message_at_trigger
  after insert on public.messages
  for each row execute function public.threads_set_last_message_at();

-- Thread reads: per-user last read time for unread count
create table if not exists public.thread_reads (
  thread_id uuid not null references public.threads (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (thread_id, user_id)
);

create index if not exists idx_thread_reads_user on public.thread_reads (user_id);

alter table public.thread_reads enable row level security;

create policy "thread_reads_select_own" on public.thread_reads for select
  using (user_id = auth.uid());

create policy "thread_reads_insert_own" on public.thread_reads for insert
  with check (user_id = auth.uid());

create policy "thread_reads_update_own" on public.thread_reads for update
  using (user_id = auth.uid());

-- Realtime for messages (and optionally threads for last_message_at)
alter publication supabase_realtime add table public.messages;
