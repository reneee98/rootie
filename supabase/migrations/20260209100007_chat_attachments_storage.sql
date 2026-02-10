-- Storage RLS for chat-attachments: users upload to their folder; public read for displaying in chat.
create policy "chat_attachments_public_read"
on storage.objects for select
using ( bucket_id = 'chat-attachments' );

create policy "chat_attachments_owner_insert"
on storage.objects for insert
with check (
  bucket_id = 'chat-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "chat_attachments_owner_update"
on storage.objects for update
using (
  bucket_id = 'chat-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "chat_attachments_owner_delete"
on storage.objects for delete
using (
  bucket_id = 'chat-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
);
