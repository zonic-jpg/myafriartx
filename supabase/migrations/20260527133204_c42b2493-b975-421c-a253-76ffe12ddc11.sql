-- Require image URLs to use lowercase, standard web image extensions (.jpg, .jpeg, .png, .webp).
-- Extensions are matched at the end of the path portion (before any ? or #).
-- Nullable columns still allow NULL.

ALTER TABLE public.artworks
  ADD CONSTRAINT artworks_image_url_ext_check
  CHECK (image_url ~ '\.(jpg|jpeg|png|webp)([?#]|$)') NOT VALID;
ALTER TABLE public.artworks VALIDATE CONSTRAINT artworks_image_url_ext_check;

ALTER TABLE public.artists
  ADD CONSTRAINT artists_portrait_url_ext_check
  CHECK (portrait_url IS NULL OR portrait_url ~ '\.(jpg|jpeg|png|webp)([?#]|$)') NOT VALID;
ALTER TABLE public.artists VALIDATE CONSTRAINT artists_portrait_url_ext_check;

ALTER TABLE public.landing_panes
  ADD CONSTRAINT landing_panes_image_url_ext_check
  CHECK (image_url IS NULL OR image_url ~ '\.(jpg|jpeg|png|webp)([?#]|$)') NOT VALID;
ALTER TABLE public.landing_panes VALIDATE CONSTRAINT landing_panes_image_url_ext_check;

ALTER TABLE public.landing_panes
  ADD CONSTRAINT landing_panes_image_url_mobile_ext_check
  CHECK (image_url_mobile IS NULL OR image_url_mobile ~ '\.(jpg|jpeg|png|webp)([?#]|$)') NOT VALID;
ALTER TABLE public.landing_panes VALIDATE CONSTRAINT landing_panes_image_url_mobile_ext_check;

ALTER TABLE public.sponsor_panes
  ADD CONSTRAINT sponsor_panes_image_url_ext_check
  CHECK (image_url ~ '\.(jpg|jpeg|png|webp)([?#]|$)') NOT VALID;
ALTER TABLE public.sponsor_panes VALIDATE CONSTRAINT sponsor_panes_image_url_ext_check;

ALTER TABLE public.listings
  ADD CONSTRAINT listings_image_url_ext_check
  CHECK (image_url IS NULL OR image_url ~ '\.(jpg|jpeg|png|webp)([?#]|$)') NOT VALID;
ALTER TABLE public.listings VALIDATE CONSTRAINT listings_image_url_ext_check;

ALTER TABLE public.renders
  ADD CONSTRAINT renders_source_image_url_ext_check
  CHECK (source_image_url ~ '\.(jpg|jpeg|png|webp)([?#]|$)') NOT VALID;
ALTER TABLE public.renders VALIDATE CONSTRAINT renders_source_image_url_ext_check;

ALTER TABLE public.renders
  ADD CONSTRAINT renders_result_image_url_ext_check
  CHECK (result_image_url IS NULL OR result_image_url ~ '\.(jpg|jpeg|png|webp)([?#]|$)') NOT VALID;
ALTER TABLE public.renders VALIDATE CONSTRAINT renders_result_image_url_ext_check;