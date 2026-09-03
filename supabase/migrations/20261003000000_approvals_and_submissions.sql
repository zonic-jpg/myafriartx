-- Tester approvals + artist submissions.
--
-- Until now the ADMINTESTER approval queue lived only in each visitor's
-- localStorage, so a tester's request was written on the tester's own device and
-- the owner's browser had nothing to show. Both sides now share one table.
--
-- Artist submissions get their own moderation queue so an upload can travel
-- upload -> attributes -> context -> submit -> approve -> catalogue board.

-- ── Tester / admin access requests ──────────────────────────────────────────
create table if not exists public.admin_access_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  identity text,
  app text not null default 'myafriartx',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists admin_access_requests_email_app_key
  on public.admin_access_requests (lower(email), app);
create index if not exists admin_access_requests_status_idx
  on public.admin_access_requests (status, requested_at desc);

alter table public.admin_access_requests enable row level security;

-- Anyone signing in with an orbit password may queue themselves. They can only
-- ever create a 'pending' row; promotion is a separate, admin-only update.
drop policy if exists admin_access_requests_self_request on public.admin_access_requests;
create policy admin_access_requests_self_request on public.admin_access_requests
  for insert to anon, authenticated
  with check (status = 'pending');

drop policy if exists admin_access_requests_admin_read on public.admin_access_requests;
create policy admin_access_requests_admin_read on public.admin_access_requests
  for select to authenticated
  using (has_role(auth.uid(), 'admin'));

drop policy if exists admin_access_requests_admin_write on public.admin_access_requests;
create policy admin_access_requests_admin_write on public.admin_access_requests
  for update to authenticated
  using (has_role(auth.uid(), 'admin'))
  with check (has_role(auth.uid(), 'admin'));

drop trigger if exists admin_access_requests_set_updated_at on public.admin_access_requests;
create trigger admin_access_requests_set_updated_at
  before update on public.admin_access_requests
  for each row execute function public.set_updated_at();

grant insert on public.admin_access_requests to anon, authenticated;
grant select, update on public.admin_access_requests to authenticated;
grant all on public.admin_access_requests to service_role;

-- A pending tester needs to know when they have been approved without being
-- able to read anybody else's request. One email in, one status out.
create or replace function public.admin_access_status(p_email text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select status
  from public.admin_access_requests
  where lower(email) = lower(trim(p_email))
  order by requested_at desc
  limit 1;
$$;

revoke execute on function public.admin_access_status(text) from public;
grant execute on function public.admin_access_status(text) to anon, authenticated;

-- ── Artist submissions ──────────────────────────────────────────────────────
create table if not exists public.artwork_submissions (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid references auth.users(id) on delete set null,
  submitter_email text,
  submitter_name text,
  artist_name text not null,
  title text not null,
  medium text,
  category text,
  width_cm numeric(10, 2),
  height_cm numeric(10, 2),
  depth_cm numeric(10, 2),
  size_text text,
  year_created text,
  country_of_origin text,
  price_amount numeric(12, 2),
  price_currency text not null default 'USD',
  context text,
  image_url text not null,
  image_path text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  review_note text,
  reviewed_at timestamptz,
  reviewed_by text,
  artwork_id uuid references public.artworks(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists artwork_submissions_status_idx
  on public.artwork_submissions (status, created_at desc);
create index if not exists artwork_submissions_submitter_idx
  on public.artwork_submissions (submitted_by);

alter table public.artwork_submissions enable row level security;

drop policy if exists artwork_submissions_public_insert on public.artwork_submissions;
create policy artwork_submissions_public_insert on public.artwork_submissions
  for insert to anon, authenticated
  with check (status = 'pending' and artwork_id is null);

-- Approved work is public (it is what the board renders); a signed-in artist can
-- also follow their own submission through moderation.
drop policy if exists artwork_submissions_public_read on public.artwork_submissions;
create policy artwork_submissions_public_read on public.artwork_submissions
  for select to anon, authenticated
  using (status = 'approved');

drop policy if exists artwork_submissions_own_read on public.artwork_submissions;
create policy artwork_submissions_own_read on public.artwork_submissions
  for select to authenticated
  using (submitted_by = auth.uid() or has_role(auth.uid(), 'admin'));

drop policy if exists artwork_submissions_admin_write on public.artwork_submissions;
create policy artwork_submissions_admin_write on public.artwork_submissions
  for update to authenticated
  using (has_role(auth.uid(), 'admin'))
  with check (has_role(auth.uid(), 'admin'));

drop trigger if exists artwork_submissions_set_updated_at on public.artwork_submissions;
create trigger artwork_submissions_set_updated_at
  before update on public.artwork_submissions
  for each row execute function public.set_updated_at();

grant insert on public.artwork_submissions to anon, authenticated;
grant select on public.artwork_submissions to anon, authenticated;
grant update on public.artwork_submissions to authenticated;
grant all on public.artwork_submissions to service_role;

-- Dimensions travel with the artwork once it is approved onto the board.
alter table public.artworks
  add column if not exists width_cm numeric(10, 2),
  add column if not exists height_cm numeric(10, 2),
  add column if not exists depth_cm numeric(10, 2),
  add column if not exists size_text text,
  add column if not exists submission_id uuid references public.artwork_submissions(id) on delete set null;

-- ── Submission image storage ────────────────────────────────────────────────
-- Public bucket: artworks.image_url is constrained to https + image extension,
-- so a submitted image must end up at a real storage URL before it can be
-- promoted. Uploads are confined to the inbox/ prefix.
insert into storage.buckets (id, name, public)
values ('submissions', 'submissions', true)
on conflict (id) do nothing;

drop policy if exists submissions_public_read on storage.objects;
create policy submissions_public_read on storage.objects
  for select using (bucket_id = 'submissions');

drop policy if exists submissions_inbox_write on storage.objects;
create policy submissions_inbox_write on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'submissions' and (storage.foldername(name))[1] = 'inbox');

-- ── Letter Studio ───────────────────────────────────────────────────────────
-- The owner signs in through the soft admin gate, which has no Supabase JWT, so
-- sent letters could never be attributed and the audience list was too narrow
-- for the outreach templates the studio actually offers.
alter table public.letters_sent
  alter column sent_by drop not null;

alter table public.letters_sent
  add column if not exists sent_by_email text,
  add column if not exists error_message text,
  add column if not exists body_html text;

alter table public.letters_sent drop constraint if exists letters_sent_audience_check;
alter table public.letters_sent
  add constraint letters_sent_audience_check
  check (audience in (
    'permission', 'collaboration', 'advertising',
    'artist_invite', 'sponsorship', 'press'
  ));

alter table public.letters_sent drop constraint if exists letters_sent_status_check;
alter table public.letters_sent
  add constraint letters_sent_status_check
  check (status in ('sending', 'sent', 'failed'));

create index if not exists letters_sent_created_idx on public.letters_sent (created_at desc);
grant all on public.letters_sent to service_role;

-- The letterhead is read by the admin surface, which runs anonymously under the
-- soft gate. Without this the studio silently fell back to hardcoded defaults.
drop policy if exists settings_read_anon on public.app_settings;
create policy settings_read_anon on public.app_settings
  for select to anon
  using (key in ('broker_fee_percent', 'letterhead'));

update public.app_settings
set value = jsonb_set(value, '{logoUrl}', '"/media/myafriart-logo.png"'::jsonb)
where key = 'letterhead'
  and coalesce(value->>'logoUrl', '') = '';
