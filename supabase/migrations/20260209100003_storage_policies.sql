-- Storage RLS for listing-photos bucket.
-- Bucket is public-read; only authenticated users can upload to their own folder.

-- Allow anyone to read (public bucket)
create policy "listing_photos_public_read"
on storage.objects for select
using ( bucket_id = 'listing-photos' );

-- Authenticated users can upload to their own folder: listing-photos/{user_id}/*
create policy "listing_photos_owner_insert"
on storage.objects for insert
with check (
  bucket_id = 'listing-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Owners can update their own files
create policy "listing_photos_owner_update"
on storage.objects for update
using (
  bucket_id = 'listing-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Owners can delete their own files
create policy "listing_photos_owner_delete"
on storage.objects for delete
using (
  bucket_id = 'listing-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);
