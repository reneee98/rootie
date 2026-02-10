-- Enable Supabase Realtime for the bids table so clients can subscribe to new bids.
alter publication supabase_realtime add table public.bids;
