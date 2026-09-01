-- Live art events calendar (Oct 2026 → Mar 2027). Admin CRUD via /admin → Events.

create table if not exists public.live_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  detail_text text,
  venue text,
  city text,
  country text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  image_url text,
  detail_image_url text,
  detail_video_url text,
  ticket_url text,
  category text,
  tags text[] not null default '{}',
  status text not null default 'published'
    check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists live_events_starts_idx on public.live_events (starts_at);
create index if not exists live_events_status_idx on public.live_events (status, starts_at);

alter table public.live_events enable row level security;

drop policy if exists live_events_public_read on public.live_events;
create policy live_events_public_read on public.live_events
  for select to anon, authenticated
  using (status = 'published');

drop policy if exists live_events_admin_all on public.live_events;
create policy live_events_admin_all on public.live_events
  for all to authenticated
  using (has_role(auth.uid(), 'admin'))
  with check (has_role(auth.uid(), 'admin'));

drop trigger if exists live_events_set_updated_at on public.live_events;
create trigger live_events_set_updated_at
  before update on public.live_events
  for each row execute function public.set_updated_at();

grant select on public.live_events to anon, authenticated;
grant all on public.live_events to service_role;

insert into public.live_events (
  title, description, detail_text, venue, city, country, starts_at, ends_at,
  image_url, category, tags, status
)
select * from (values
  (
    'ART X Lagos 2026',
    'West Africa''s leading contemporary art fair — galleries, installations, and talks.',
    'Four-day fair at Federal Palace with evening openings, collector previews, and MyAfriArt staging demos.',
    'The Federal Palace Hotel', 'Lagos', 'Nigeria', '2026-10-24 11:00:00+01', '2026-10-27 21:00:00+01',
    '/media/pane-event.jpg', 'Art Fair', array['art fair','lagos','contemporary']::text[], 'published'
  ),
  (
    '1-54 Contemporary African Art Fair · London',
    'Diaspora satellite edition spotlighting galleries from Lagos, Accra, and Johannesburg.',
    'Collector morning, public afternoon, and MyAfriArt lounge conversations on provenance.',
    'Somerset House', 'London', 'United Kingdom', '2026-10-30 10:00:00+00', '2026-11-02 18:00:00+00',
    '/media/pane-auction.jpg', 'Art Fair', array['1-54','diaspora','london']::text[], 'published'
  ),
  (
    'Nubuke Foundation Season Opening',
    'Gallery season launch with sculpture garden walk-through and artist talks.',
    'Opening weekend featuring West African mid-career painters and a live studio broadcast.',
    'Nubuke Foundation', 'Accra', 'Ghana', '2026-11-07 17:00:00+00', '2026-11-08 20:00:00+00',
    '/media/pane-artist.jpg', 'Gallery Opening', array['gallery','accra','opening']::text[], 'published'
  ),
  (
    'Lagos Biennial Preview Week',
    'Curatorial walk-throughs ahead of the main biennial programme.',
    'Public panels on port city histories, performance art, and community archives.',
    'Tafawa Balewa Square', 'Lagos', 'Nigeria', '2026-11-14 12:00:00+01', '2026-11-16 22:00:00+01',
    '/media/pane-stage.jpg', 'Biennial', array['biennial','lagos','preview']::text[], 'published'
  ),
  (
    'FNB Art Joburg',
    'Southern Africa''s flagship art fair — modern, contemporary, and design.',
    'Sandton pavilion with talks, film programme, and evening collector events.',
    'Sandton Convention Centre', 'Johannesburg', 'South Africa', '2026-11-21 10:00:00+02', '2026-11-23 19:00:00+02',
    '/media/pane-piece.jpg', 'Art Fair', array['art fair','joburg','contemporary']::text[], 'published'
  ),
  (
    'Reclaimed Beauty · Popoola Tour Stop',
    'Scrap-metal sculpture exhibition and artist conversation on sustainability.',
    'Evening salon with Dotun Popoola on recycled materials and public art commissions.',
    'The Village by Tikera', 'Abuja', 'Nigeria', '2026-12-05 18:00:00+01', '2026-12-07 20:00:00+01',
    '/media/pane-event.jpg', 'Exhibition', array['sculpture','abuja','popoola']::text[], 'published'
  ),
  (
    'Dakar Biennale Off-Programme',
    'Independent studios and residencies open their doors across the city.',
    'Self-guided studio map with evening performances at Village des Arts.',
    'Village des Arts', 'Dakar', 'Senegal', '2027-01-10 11:00:00+00', '2027-01-12 23:00:00+00',
    '/media/pane-lounge.jpg', 'Biennial', array['dakar','off-programme','studios']::text[], 'published'
  ),
  (
    'Investec Cape Town Art Fair',
    'Pan-African fair with talks, film, and design crossover programming.',
    'CTICC main hall plus satellite shows along the Waterfront.',
    'CTICC', 'Cape Town', 'South Africa', '2027-02-06 10:00:00+02', '2027-02-08 18:00:00+02',
    '/media/pane-auction.jpg', 'Art Fair', array['cape town','art fair','investec']::text[], 'published'
  ),
  (
    'Nairobi Gallery Crawl',
    'Karen and Westlands gallery hop with shuttle and curator introductions.',
    'Saturday crawl ending with a lounge reception for registered members.',
    'Karen & Westlands', 'Nairobi', 'Kenya', '2027-02-20 14:00:00+03', '2027-02-20 22:00:00+03',
    '/media/pane-artist.jpg', 'Gallery Crawl', array['nairobi','galleries','crawl']::text[], 'published'
  ),
  (
    'MyAfriArt Studio Open House',
    'Virtual staging demos and collector Q&A with resident curators.',
    'Hybrid open house: stream the artstage walk-throughs and book 1:1 lounge slots.',
    'Online + Lagos Hub', 'Lagos', 'Nigeria', '2027-02-27 16:00:00+01', '2027-02-27 21:00:00+01',
    '/media/pane-stage.jpg', 'Open House', array['studio','virtual','open house']::text[], 'published'
  ),
  (
    'Harmattan Contemporary Salon',
    'Intimate salon exhibition with live jazz and collector roundtable.',
    'Twelve-lot preview ahead of the Friday evening auction block.',
    'Terra Kulture', 'Lagos', 'Nigeria', '2027-03-06 18:00:00+01', '2027-03-06 23:00:00+01',
    '/media/pane-piece.jpg', 'Salon', array['salon','lagos','contemporary']::text[], 'published'
  ),
  (
    'Abuja Sculpture Symposium',
    'Public art commissions, foundry visits, and monument conservation talks.',
    'Two-day symposium with outdoor installations and certificate workshops.',
    'Thought Pyramid Art Centre', 'Abuja', 'Nigeria', '2027-03-20 09:00:00+01', '2027-03-21 17:00:00+01',
    '/media/pane-event.jpg', 'Symposium', array['sculpture','abuja','symposium']::text[], 'published'
  )
) as seed(
  title, description, detail_text, venue, city, country, starts_at, ends_at,
  image_url, category, tags, status
)
where not exists (
  select 1 from public.live_events e
  where e.title = seed.title
    and e.starts_at = seed.starts_at
);
