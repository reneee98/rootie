-- Commit the enum value before the next migration uses it in backfill queries.
alter type public.listing_status add value if not exists 'reserved';
