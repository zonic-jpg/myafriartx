-- Lounge listings ("post for sale" / "looking to buy") let a member attach a
-- photo of the actual piece. listings.image_url already accepts an https URL
-- (see createListing in lounge.functions.ts), but no storage bucket existed
-- for the client to upload into, so the UI never offered a file picker and
-- listing cards fell back to a deterministic-but-arbitrary local stock photo
-- (see localImageForKey in src/lib/local-image-assets.ts).
--
-- Mirrors the existing "renders" bucket shape: public read, owner-only write
-- scoped to a auth.uid()-prefixed folder.
insert into storage.buckets (id, name, public)
values ('listings', 'listings', true)
on conflict (id) do nothing;

drop policy if exists "listings_public_read" on storage.objects;
create policy "listings_public_read" on storage.objects
  for select using (bucket_id = 'listings');

drop policy if exists "listings_own_write" on storage.objects;
create policy "listings_own_write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'listings' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "listings_own_update" on storage.objects;
create policy "listings_own_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'listings' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'listings' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "listings_own_delete" on storage.objects;
create policy "listings_own_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'listings' and auth.uid()::text = (storage.foldername(name))[1]);
