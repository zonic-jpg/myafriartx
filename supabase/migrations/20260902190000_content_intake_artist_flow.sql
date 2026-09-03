-- Artist-first Content Intake: which artist a staged piece belongs to, plus
-- the catalogue fields the admin fills in per-image (medium/year/origin).
-- Already applied directly to the live project on 2026-09-02; this file
-- brings the migration history in the repo back in sync with that.
alter table public.content_staging
  add column if not exists artist_id uuid references public.artists(id) on delete set null,
  add column if not exists medium public.art_medium,
  add column if not exists year text,
  add column if not exists origin text;

create index if not exists content_staging_artist_idx on public.content_staging (artist_id, status);

alter table public.artworks add column if not exists origin text;
