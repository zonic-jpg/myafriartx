DROP POLICY IF EXISTS "user_roles_admin_insert" ON public.user_roles;

CREATE POLICY "user_roles_admin_insert" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));