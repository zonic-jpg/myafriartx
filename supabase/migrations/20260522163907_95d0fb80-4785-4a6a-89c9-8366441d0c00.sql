ALTER TABLE public.renders ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS renders_is_featured_idx ON public.renders (is_featured) WHERE is_featured = true;

CREATE POLICY "renders_admin_select_all" ON public.renders
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "renders_admin_update_all" ON public.renders
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "renders_admin_delete_all" ON public.renders
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));