
-- 1. Extend content_source pattern to remaining domains
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS content_source text NOT NULL DEFAULT 'live';
ALTER TABLE public.landing_panes ADD COLUMN IF NOT EXISTS content_source text NOT NULL DEFAULT 'live';
ALTER TABLE public.broker_requests ADD COLUMN IF NOT EXISTS content_source text NOT NULL DEFAULT 'live';
ALTER TABLE public.threads ADD COLUMN IF NOT EXISTS content_source text NOT NULL DEFAULT 'live';

DO $$ BEGIN
  ALTER TABLE public.artworks ADD CONSTRAINT artworks_content_source_chk CHECK (content_source IN ('live','mock','artstage'));
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.artists ADD CONSTRAINT artists_content_source_chk CHECK (content_source IN ('live','mock','artstage'));
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.listings ADD CONSTRAINT listings_content_source_chk CHECK (content_source IN ('live','mock','artstage'));
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.landing_panes ADD CONSTRAINT landing_panes_content_source_chk CHECK (content_source IN ('live','mock','artstage'));
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;

-- 2. Cross-reference: foreign keys (added only if both sides have valid data)
-- artworks.artist_id -> artists.id
DELETE FROM public.artworks WHERE artist_id IS NOT NULL AND artist_id NOT IN (SELECT id FROM public.artists);
DO $$ BEGIN
  ALTER TABLE public.artworks ADD CONSTRAINT artworks_artist_id_fkey
    FOREIGN KEY (artist_id) REFERENCES public.artists(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- listings.member_id -> profiles.id
DO $$ BEGIN
  ALTER TABLE public.listings ADD CONSTRAINT listings_member_id_fkey
    FOREIGN KEY (member_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;

-- threads
DO $$ BEGIN
  ALTER TABLE public.threads ADD CONSTRAINT threads_listing_id_fkey
    FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.threads ADD CONSTRAINT threads_buyer_id_fkey
    FOREIGN KEY (buyer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.threads ADD CONSTRAINT threads_seller_id_fkey
    FOREIGN KEY (seller_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;

-- messages
DO $$ BEGIN
  ALTER TABLE public.messages ADD CONSTRAINT messages_thread_id_fkey
    FOREIGN KEY (thread_id) REFERENCES public.threads(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.messages ADD CONSTRAINT messages_sender_id_fkey
    FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;

-- broker_requests
DO $$ BEGIN
  ALTER TABLE public.broker_requests ADD CONSTRAINT broker_requests_thread_id_fkey
    FOREIGN KEY (thread_id) REFERENCES public.threads(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.broker_requests ADD CONSTRAINT broker_requests_listing_id_fkey
    FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.broker_requests ADD CONSTRAINT broker_requests_requester_id_fkey
    FOREIGN KEY (requester_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;

-- renders
DO $$ BEGIN
  ALTER TABLE public.renders ADD CONSTRAINT renders_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.renders ADD CONSTRAINT renders_style_id_fkey
    FOREIGN KEY (style_id) REFERENCES public.styles(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;

-- Helpful indexes for source filtering
CREATE INDEX IF NOT EXISTS idx_artworks_content_source ON public.artworks(content_source);
CREATE INDEX IF NOT EXISTS idx_artists_content_source ON public.artists(content_source);
CREATE INDEX IF NOT EXISTS idx_listings_content_source ON public.listings(content_source);
CREATE INDEX IF NOT EXISTS idx_landing_panes_content_source ON public.landing_panes(content_source);
