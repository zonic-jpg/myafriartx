
ALTER TABLE public.artworks
  ADD CONSTRAINT artworks_image_url_https CHECK (image_url LIKE 'https://%') NOT VALID;
ALTER TABLE public.artworks VALIDATE CONSTRAINT artworks_image_url_https;

ALTER TABLE public.artists
  ADD CONSTRAINT artists_portrait_url_https CHECK (portrait_url IS NULL OR portrait_url LIKE 'https://%') NOT VALID;
ALTER TABLE public.artists VALIDATE CONSTRAINT artists_portrait_url_https;

ALTER TABLE public.landing_panes
  ADD CONSTRAINT landing_panes_image_url_https CHECK (image_url IS NULL OR image_url LIKE 'https://%') NOT VALID;
ALTER TABLE public.landing_panes VALIDATE CONSTRAINT landing_panes_image_url_https;

ALTER TABLE public.landing_panes
  ADD CONSTRAINT landing_panes_image_url_mobile_https CHECK (image_url_mobile IS NULL OR image_url_mobile LIKE 'https://%') NOT VALID;
ALTER TABLE public.landing_panes VALIDATE CONSTRAINT landing_panes_image_url_mobile_https;

ALTER TABLE public.sponsor_panes
  ADD CONSTRAINT sponsor_panes_image_url_https CHECK (image_url LIKE 'https://%') NOT VALID;
ALTER TABLE public.sponsor_panes VALIDATE CONSTRAINT sponsor_panes_image_url_https;

ALTER TABLE public.listings
  ADD CONSTRAINT listings_image_url_https CHECK (image_url IS NULL OR image_url LIKE 'https://%') NOT VALID;
ALTER TABLE public.listings VALIDATE CONSTRAINT listings_image_url_https;

ALTER TABLE public.renders
  ADD CONSTRAINT renders_source_image_url_https CHECK (source_image_url LIKE 'https://%') NOT VALID;
ALTER TABLE public.renders VALIDATE CONSTRAINT renders_source_image_url_https;

ALTER TABLE public.renders
  ADD CONSTRAINT renders_result_image_url_https CHECK (result_image_url IS NULL OR result_image_url LIKE 'https://%') NOT VALID;
ALTER TABLE public.renders VALIDATE CONSTRAINT renders_result_image_url_https;
