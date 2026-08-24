-- Restrict role policies to signed-in users and prevent client-side role creation
DROP POLICY IF EXISTS "user_roles_self_select" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_admin_all" ON public.user_roles;

CREATE POLICY "user_roles_self_select" ON public.user_roles
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "user_roles_admin_update" ON public.user_roles
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "user_roles_admin_delete" ON public.user_roles
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Owner-scoped file replacement for private image buckets
DROP POLICY IF EXISTS "rooms_own_update" ON storage.objects;
CREATE POLICY "rooms_own_update" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'rooms'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'rooms'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "renders_own_update" ON storage.objects;
CREATE POLICY "renders_own_update" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'renders'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'renders'
  AND auth.uid()::text = (storage.foldername(name))[1]
);