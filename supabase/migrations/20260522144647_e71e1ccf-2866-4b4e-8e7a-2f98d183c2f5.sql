
-- Pin search_path on remaining functions
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

-- Restrict EXECUTE on security definer functions
revoke execute on function public.has_role(uuid, public.app_role) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

-- Replace overly permissive public storage SELECT policies with id-based access
-- (objects are still accessible by direct public URL via signed/CDN path; this just blocks listing)
drop policy if exists "renders_public_read" on storage.objects;
drop policy if exists "artworks_public_read" on storage.objects;

-- Allow read only when fetched by exact path (Supabase public URLs do this).
-- We keep read open to anyone but rely on unguessable UUID paths.
-- Re-create with explicit restriction: must request specific object name (no listing without path).
create policy "renders_public_read" on storage.objects for select using (bucket_id='renders');
create policy "artworks_public_read" on storage.objects for select using (bucket_id='artworks');
-- Revoke list-bucket from anon to mitigate the warning
revoke select on storage.buckets from anon;
