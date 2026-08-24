CREATE POLICY "artworks_public_read"
  ON public.artworks
  FOR SELECT
  TO anon
  USING (is_active = true);

CREATE POLICY "artists_public_read"
  ON public.artists
  FOR SELECT
  TO anon
  USING (true);