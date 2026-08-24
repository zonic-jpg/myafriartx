
ALTER TABLE public.landing_panes
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft'
  CHECK (status IN ('draft','published'));

UPDATE public.landing_panes SET status = 'published' WHERE status = 'draft';

DROP POLICY IF EXISTS landing_panes_public_read ON public.landing_panes;
CREATE POLICY landing_panes_public_read ON public.landing_panes
  FOR SELECT TO anon, authenticated
  USING (is_active = true AND status = 'published');
