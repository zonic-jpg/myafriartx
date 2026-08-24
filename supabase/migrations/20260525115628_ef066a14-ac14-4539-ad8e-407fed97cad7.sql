
-- ============================================================
-- 1. Country allocation tables (separate for pieces and artists)
-- ============================================================
CREATE TABLE public.catalogue_allocations_pieces (
  country text PRIMARY KEY,
  percent numeric NOT NULL CHECK (percent >= 0 AND percent <= 100),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.catalogue_allocations_artists (
  country text PRIMARY KEY,
  percent numeric NOT NULL CHECK (percent >= 0 AND percent <= 100),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.catalogue_allocations_pieces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogue_allocations_artists ENABLE ROW LEVEL SECURITY;

CREATE POLICY alloc_pieces_read_public ON public.catalogue_allocations_pieces
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY alloc_pieces_admin_write ON public.catalogue_allocations_pieces
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY alloc_artists_read_public ON public.catalogue_allocations_artists
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY alloc_artists_admin_write ON public.catalogue_allocations_artists
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER alloc_pieces_updated_at BEFORE UPDATE ON public.catalogue_allocations_pieces
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER alloc_artists_updated_at BEFORE UPDATE ON public.catalogue_allocations_artists
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 2. Short codes + view counters + lifecycle status
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS public.artist_code_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.piece_code_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.txn_code_seq START 1;

ALTER TABLE public.artists
  ADD COLUMN short_code text UNIQUE,
  ADD COLUMN view_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.artworks
  ADD COLUMN short_code text UNIQUE,
  ADD COLUMN view_count integer NOT NULL DEFAULT 0,
  ADD COLUMN lifecycle_status text NOT NULL DEFAULT 'in_catalogue'
    CHECK (lifecycle_status IN ('in_catalogue','sold','withdrawn'));

ALTER TABLE public.broker_requests
  ADD COLUMN short_code text UNIQUE;

-- Triggers to assign short codes on insert
CREATE OR REPLACE FUNCTION public.assign_artist_short_code()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.short_code IS NULL THEN
    NEW.short_code := 'ART-' || lpad(nextval('public.artist_code_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.assign_piece_short_code()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.short_code IS NULL THEN
    NEW.short_code := 'PCE-' || lpad(nextval('public.piece_code_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.assign_txn_short_code()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.short_code IS NULL THEN
    NEW.short_code := 'TXN-' || lpad(nextval('public.txn_code_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_artist_short_code BEFORE INSERT ON public.artists
  FOR EACH ROW EXECUTE FUNCTION public.assign_artist_short_code();
CREATE TRIGGER trg_piece_short_code BEFORE INSERT ON public.artworks
  FOR EACH ROW EXECUTE FUNCTION public.assign_piece_short_code();
CREATE TRIGGER trg_txn_short_code BEFORE INSERT ON public.broker_requests
  FOR EACH ROW EXECUTE FUNCTION public.assign_txn_short_code();

-- Backfill existing rows (ordered by created_at for stable sequencing)
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.artists WHERE short_code IS NULL ORDER BY created_at LOOP
    UPDATE public.artists SET short_code = 'ART-' || lpad(nextval('public.artist_code_seq')::text, 6, '0') WHERE id = r.id;
  END LOOP;
  FOR r IN SELECT id FROM public.artworks WHERE short_code IS NULL ORDER BY created_at LOOP
    UPDATE public.artworks SET short_code = 'PCE-' || lpad(nextval('public.piece_code_seq')::text, 6, '0') WHERE id = r.id;
  END LOOP;
  FOR r IN SELECT id FROM public.broker_requests WHERE short_code IS NULL ORDER BY created_at LOOP
    UPDATE public.broker_requests SET short_code = 'TXN-' || lpad(nextval('public.txn_code_seq')::text, 6, '0') WHERE id = r.id;
  END LOOP;
END $$;

-- ============================================================
-- 3. View counter RPC (safe: only bumps view_count)
-- ============================================================
CREATE OR REPLACE FUNCTION public.increment_view(target_table text, target_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF target_table = 'artworks' THEN
    UPDATE public.artworks SET view_count = view_count + 1 WHERE id = target_id;
  ELSIF target_table = 'artists' THEN
    UPDATE public.artists SET view_count = view_count + 1 WHERE id = target_id;
  ELSE
    RAISE EXCEPTION 'invalid target_table';
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION public.increment_view(text, uuid) TO anon, authenticated;

-- ============================================================
-- 4. Admin transactions view (broker_requests + sale flag)
-- ============================================================
CREATE OR REPLACE VIEW public.admin_transactions
WITH (security_invoker=on) AS
SELECT
  br.id,
  br.short_code,
  br.listing_id,
  br.thread_id,
  br.requester_id,
  br.transaction_amount,
  br.currency,
  br.fee_percent,
  br.fee_amount,
  br.status,
  (br.status = 'delivered') AS is_sale,
  br.created_at,
  br.updated_at,
  br.delivered_at,
  l.title AS listing_title,
  t.buyer_id,
  t.seller_id
FROM public.broker_requests br
LEFT JOIN public.listings l ON l.id = br.listing_id
LEFT JOIN public.threads t ON t.id = br.thread_id;

-- ============================================================
-- 5. Helpful indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_artworks_lifecycle ON public.artworks(lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_artworks_short_code ON public.artworks(short_code);
CREATE INDEX IF NOT EXISTS idx_artists_short_code ON public.artists(short_code);
CREATE INDEX IF NOT EXISTS idx_broker_short_code ON public.broker_requests(short_code);
CREATE INDEX IF NOT EXISTS idx_artists_country ON public.artists(country);
