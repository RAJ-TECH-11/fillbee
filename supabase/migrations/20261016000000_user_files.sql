-- Step 8: users ki apni files (photo, signature)
-- Apply with: npx supabase db push

-- Private bucket, sirf PNG/JPEG, max 1 MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('user-files', 'user-files', false, 1048576, array['image/png', 'image/jpeg'])
on conflict (id) do nothing;

-- Har user sirf apne folder (<user id>/...) ki files dekh, bana, badal aur hata sakta hai.
create policy "Users can read own files"
  on storage.objects for select to authenticated
  using (bucket_id = 'user-files' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users can upload own files"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'user-files' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users can update own files"
  on storage.objects for update to authenticated
  using (bucket_id = 'user-files' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'user-files' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users can delete own files"
  on storage.objects for delete to authenticated
  using (bucket_id = 'user-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
