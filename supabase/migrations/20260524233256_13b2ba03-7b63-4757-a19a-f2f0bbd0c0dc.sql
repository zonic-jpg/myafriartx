
CREATE TABLE public.pane_views (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pane_id text NOT NULL,
  session_id text,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX pane_views_pane_id_idx ON public.pane_views (pane_id);
CREATE INDEX pane_views_created_at_idx ON public.pane_views (created_at DESC);

ALTER TABLE public.pane_views ENABLE ROW LEVEL SECURITY;

-- Anyone can insert a view (anonymous + authenticated).
CREATE POLICY "pane_views_public_insert"
  ON public.pane_views FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only admins can read aggregated view data.
CREATE POLICY "pane_views_admin_select"
  ON public.pane_views FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
