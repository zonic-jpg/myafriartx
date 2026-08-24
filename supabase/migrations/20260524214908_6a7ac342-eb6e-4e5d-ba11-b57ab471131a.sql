CREATE TABLE public.landing_panes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pane_id TEXT NOT NULL UNIQUE,
  kicker TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  reveal TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.landing_panes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "landing_panes_public_read"
ON public.landing_panes FOR SELECT
TO anon, authenticated
USING (is_active = true);

CREATE POLICY "landing_panes_admin_write"
ON public.landing_panes FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_landing_panes_updated_at
BEFORE UPDATE ON public.landing_panes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.landing_panes (pane_id, kicker, title, summary, reveal, sort_order) VALUES
('artist', 'Artist of the week', 'Adaeze Okonkwo', 'Lagos-based painter blending Nsibidi script with bold oil abstractions. Her new series channels market noise into colour. Featured this week across the Studio.', 'Adaeze trained at Yaba College of Technology and exhibits across Lagos, Accra and Cape Town. Her work explores migration, memory and the rhythm of West African markets.', 1),
('event', 'Event of the week', 'Sauti Sessions · Nairobi', 'A two-night live-painting and jazz residency at the Karen Pavilion. Twelve artists, six musicians, one canvas built in real time. Doors at 18:00.', 'Tickets include a curated viewing of the resulting canvas, signed prints from each contributing artist, and entry to the silent auction on the closing night.', 2),
('piece', 'Piece of the week', 'Harmattan, II', 'Pastel on raw linen, 120 × 90 cm. A study of dry-season light over the Sahel. One of three in the series, the only one offered publicly.', 'Signed and dated 2025. Ships rolled with certificate of authenticity. Available for outright purchase or to bid in this Friday''s evening auction.', 3),
('stage', 'Stage your space', 'with artstage', 'Point your camera at a wall and drop any piece in at true scale. Walk around it, change the light, send the render to a friend before you commit.', 'Works on phone and desktop. Save unlimited rooms, share with a private link, and order the piece directly from the staged view.', 4),
('auction', 'Live auction', 'Friday Evening Sale', 'Forty-two lots from across the continent, opening at 19:00 WAT. Bid live from anywhere, with absentee bids accepted up to one hour before.', 'Catalogue includes work by emerging and established artists from Nigeria, Kenya, Senegal, South Africa and the diaspora. Buyer''s premium 15%.', 5),
('lounge', 'Members only', 'Sale Lounge', 'A private floor for verified buyers and sellers. Step inside for live auctions and personal sales listed by registered art owners.', '', 6);