-- Add missing delivery timestamp on threads for order flow.
alter table public.threads
  add column if not exists order_delivered_at timestamptz;
