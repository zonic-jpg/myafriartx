ALTER TABLE public.artists
ADD COLUMN IF NOT EXISTS content_source text NOT NULL DEFAULT 'live';

ALTER TABLE public.artworks
ADD COLUMN IF NOT EXISTS content_source text NOT NULL DEFAULT 'live';

ALTER TABLE public.artists
ADD CONSTRAINT artists_content_source_check
CHECK (content_source IN ('live', 'mock')) NOT VALID;

ALTER TABLE public.artworks
ADD CONSTRAINT artworks_content_source_check
CHECK (content_source IN ('live', 'mock')) NOT VALID;

ALTER TABLE public.artists VALIDATE CONSTRAINT artists_content_source_check;
ALTER TABLE public.artworks VALIDATE CONSTRAINT artworks_content_source_check;

CREATE INDEX IF NOT EXISTS artists_content_source_idx ON public.artists(content_source);
CREATE INDEX IF NOT EXISTS artworks_content_source_active_idx ON public.artworks(content_source, is_active);

INSERT INTO public.app_settings(key, value)
VALUES ('mock_catalogue_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;