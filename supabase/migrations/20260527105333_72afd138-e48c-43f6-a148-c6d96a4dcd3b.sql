
-- ============ notify_preferences ============
CREATE TABLE public.notify_preferences (
  user_id uuid PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  frequency_per_week integer NOT NULL DEFAULT 1 CHECK (frequency_per_week BETWEEN 1 AND 14),
  categories art_medium[] NOT NULL DEFAULT '{}',
  countries text[] NOT NULL DEFAULT '{}',
  genders text[] NOT NULL DEFAULT '{}',
  artist_age_min integer,
  artist_age_max integer,
  price_min numeric,
  price_max numeric,
  currency text NOT NULL DEFAULT 'USD',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notify_preferences TO authenticated;
GRANT ALL ON public.notify_preferences TO service_role;

ALTER TABLE public.notify_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY notify_prefs_self_select ON public.notify_preferences
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY notify_prefs_self_insert ON public.notify_preferences
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY notify_prefs_self_update ON public.notify_preferences
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY notify_prefs_self_delete ON public.notify_preferences
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER notify_preferences_set_updated_at
  BEFORE UPDATE ON public.notify_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ sponsor_panes ============
CREATE TABLE public.sponsor_panes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  headline text,
  link_url text,
  is_active boolean NOT NULL DEFAULT true,
  weight integer NOT NULL DEFAULT 1 CHECK (weight >= 0),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.sponsor_panes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sponsor_panes TO authenticated;
GRANT ALL ON public.sponsor_panes TO service_role;

ALTER TABLE public.sponsor_panes ENABLE ROW LEVEL SECURITY;

CREATE POLICY sponsor_panes_public_read ON public.sponsor_panes
  FOR SELECT TO anon, authenticated
  USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY sponsor_panes_admin_write ON public.sponsor_panes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER sponsor_panes_set_updated_at
  BEFORE UPDATE ON public.sponsor_panes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ notify_reels ============
CREATE TABLE public.notify_reels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','delivered','viewed')),
  delivered_at timestamptz,
  viewed_at timestamptz,
  email_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notify_reels_user_created_idx ON public.notify_reels (user_id, created_at DESC);

GRANT SELECT, UPDATE ON public.notify_reels TO authenticated;
GRANT ALL ON public.notify_reels TO service_role;

ALTER TABLE public.notify_reels ENABLE ROW LEVEL SECURITY;

CREATE POLICY notify_reels_self_select ON public.notify_reels
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY notify_reels_self_update ON public.notify_reels
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER notify_reels_set_updated_at
  BEFORE UPDATE ON public.notify_reels
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ notify_reel_panes ============
CREATE TABLE public.notify_reel_panes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_id uuid NOT NULL REFERENCES public.notify_reels(id) ON DELETE CASCADE,
  position integer NOT NULL CHECK (position BETWEEN 1 AND 12),
  kind text NOT NULL CHECK (kind IN ('artwork','sponsor')),
  artwork_id uuid,
  sponsor_pane_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reel_id, position)
);

CREATE INDEX notify_reel_panes_reel_idx ON public.notify_reel_panes (reel_id, position);

GRANT SELECT ON public.notify_reel_panes TO authenticated;
GRANT ALL ON public.notify_reel_panes TO service_role;

ALTER TABLE public.notify_reel_panes ENABLE ROW LEVEL SECURITY;

CREATE POLICY notify_reel_panes_self_select ON public.notify_reel_panes
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.notify_reels r
    WHERE r.id = notify_reel_panes.reel_id
      AND (r.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  ));

-- ============ admin setting: max freq per week ============
INSERT INTO public.app_settings (key, value)
VALUES ('notify_max_freq_per_week', '3'::jsonb)
ON CONFLICT (key) DO NOTHING;
