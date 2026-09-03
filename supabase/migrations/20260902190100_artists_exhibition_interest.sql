-- Exhibition cost-sharing: admin-only opt-in per artist, plus a free-text
-- field for the target exhibition/region, so artists interested in the same
-- event can be grouped for shared logistics/costs. No public form — visible
-- to admins only, per the confirmed design. Already applied directly to the
-- live project on 2026-09-02; this file brings the repo's migration history
-- back in sync with that.
alter table public.artists
  add column if not exists exhibition_interest boolean not null default false,
  add column if not exists exhibition_notes text;

comment on column public.artists.exhibition_interest is 'Admin-only: artist opted in to shared/cost-pooled exhibition logistics (e.g. international shows).';
comment on column public.artists.exhibition_notes is 'Admin-only free text: target exhibition/region, notes for grouping artists by shared event/logistics interest.';
