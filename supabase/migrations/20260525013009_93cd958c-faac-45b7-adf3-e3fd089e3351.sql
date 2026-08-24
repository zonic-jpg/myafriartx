ALTER TABLE public.artists
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS domicile_city text;

ALTER TABLE public.artworks
  ADD COLUMN IF NOT EXISTS price numeric(12,2),
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD';

CREATE INDEX IF NOT EXISTS idx_artists_country ON public.artists(country);
CREATE INDEX IF NOT EXISTS idx_artists_gender ON public.artists(gender);
CREATE INDEX IF NOT EXISTS idx_artists_domicile_city ON public.artists(domicile_city);
CREATE INDEX IF NOT EXISTS idx_artworks_medium ON public.artworks(medium);
CREATE INDEX IF NOT EXISTS idx_artworks_price ON public.artworks(price);