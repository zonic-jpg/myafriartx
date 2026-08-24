
-- Explicit admin-only write policies on user_roles (defense in depth)
CREATE POLICY "user_roles_admin_insert"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "user_roles_admin_update"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "user_roles_admin_delete"
ON public.user_roles
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to read render storage objects
CREATE POLICY "renders_admin_read_all"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'renders' AND has_role(auth.uid(), 'admin'::app_role));
