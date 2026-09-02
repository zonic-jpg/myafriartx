-- Content Intake: staging table for AI-enriched items awaiting final publish.
create table if not exists public.content_staging (
  id uuid primary key default gen_random_uuid(),
  staged_by uuid not null references auth.users(id),
  source_name text,
  image_hash text,                       -- perceptual hash, for cross-batch de-dup
  image_url text,
  title text not null,
  category text,
  subcategory text,
  description text,
  attributes jsonb not null default '{}'::jsonb,
  cultural_tags text[] not null default '{}',
  price_band text,
  needs_vetting boolean not null default false,
  confidence numeric,
  status text not null default 'pending_publish'
    check (status in ('pending_publish','published','rejected')),
  created_at timestamptz not null default now()
);
alter table public.content_staging enable row level security;

-- De-dup guard at the DB level too: same hash can't be staged twice while pending.
create unique index if not exists content_staging_hash_uq
  on public.content_staging (image_hash) where status = 'pending_publish';

create index if not exists content_staging_status_idx
  on public.content_staging (status, created_at desc);

-- Admin-only: only admins may stage, review, publish.
create policy content_staging_admin_all on public.content_staging for all to authenticated
  using (has_role(auth.uid(),'admin'))
  with check (has_role(auth.uid(),'admin'));
