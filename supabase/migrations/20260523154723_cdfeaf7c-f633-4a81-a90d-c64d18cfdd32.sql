-- Make user render images private and owner-scoped
update storage.buckets
set public = false
where id = 'renders';

-- Remove broad public render-image access
DROP POLICY IF EXISTS "renders_public_read" ON storage.objects;
DROP POLICY IF EXISTS "renders_own_read" ON storage.objects;
DROP POLICY IF EXISTS "renders_own_write" ON storage.objects;
DROP POLICY IF EXISTS "renders_own_delete" ON storage.objects;

-- Users can only access files stored under their own user-id folder in the renders bucket
CREATE POLICY "renders_own_read" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'renders'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "renders_own_write" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'renders'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "renders_own_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'renders'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Internal helper functions should not be directly callable by app users
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM public, anon, authenticated;