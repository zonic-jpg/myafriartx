-- ArtStage ship-complete: escrow, provenance, certificates, disputes, liens, auction deadlines

-- Certificate public verification registry
create table if not exists certificate_registry (
  id uuid primary key default gen_random_uuid(),
  verify_code text not null unique,
  broker_request_id uuid references broker_requests(id) on delete set null,
  artwork_id uuid references artworks(id) on delete set null,
  title text not null,
  artist_name text,
  owner_name text,
  issued_at timestamptz not null default now(),
  certificate_url text,
  revoked_at timestamptz,
  metadata jsonb not null default '{}'
);

create index if not exists idx_cert_verify_code on certificate_registry(verify_code);

alter table certificate_registry enable row level security;
create policy "public read certs" on certificate_registry for select using (revoked_at is null);
create policy "admin manage certs" on certificate_registry for all
  using (exists (select 1 from user_roles where user_id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from user_roles where user_id = auth.uid() and role = 'admin'));

-- Provenance / ownership chain
create table if not exists provenance_events (
  id uuid primary key default gen_random_uuid(),
  artwork_id uuid references artworks(id) on delete cascade,
  listing_id uuid references listings(id) on delete set null,
  event_type text not null,
  from_party text,
  to_party text,
  amount_ngn bigint,
  notes text,
  recorded_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_provenance_artwork on provenance_events(artwork_id, created_at desc);
alter table provenance_events enable row level security;
create policy "read provenance" on provenance_events for select using (true);
create policy "admin write provenance" on provenance_events for insert
  with check (exists (select 1 from user_roles where user_id = auth.uid() and role = 'admin'));

-- Escrow holds for lounge / direct sales
create table if not exists escrow_holds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid references payments(id) on delete set null,
  thread_id uuid references threads(id) on delete set null,
  listing_id uuid references listings(id) on delete set null,
  buyer_id uuid not null references auth.users(id),
  seller_id uuid not null references auth.users(id),
  amount_ngn bigint not null,
  status text not null default 'held',
  release_reason text,
  released_at timestamptz,
  created_at timestamptz not null default now()
);

alter table escrow_holds enable row level security;
create policy "participants read escrow" on escrow_holds for select using (
  auth.uid() = buyer_id or auth.uid() = seller_id
  or exists (select 1 from user_roles where user_id = auth.uid() and role = 'admin')
);
create policy "admin manage escrow" on escrow_holds for all
  using (exists (select 1 from user_roles where user_id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from user_roles where user_id = auth.uid() and role = 'admin'));

-- Disputes
create table if not exists payment_disputes (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments(id) on delete cascade,
  opened_by uuid not null references auth.users(id),
  reason text not null,
  status text not null default 'open',
  resolution text,
  resolved_by uuid references auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

alter table payment_disputes enable row level security;
create policy "own disputes" on payment_disputes for select using (
  auth.uid() = opened_by or exists (select 1 from user_roles where user_id = auth.uid() and role = 'admin')
);
create policy "open dispute" on payment_disputes for insert with check (auth.uid() = opened_by);

-- Webhook idempotency log
create table if not exists payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  reference text,
  payload jsonb not null default '{}',
  processed_at timestamptz not null default now(),
  unique (provider, event_id)
);

-- Artwork lien / pledge flag
alter table artworks add column if not exists is_pledged boolean not null default false;
alter table artworks add column if not exists pledge_id uuid references collateral_pledges(id) on delete set null;

-- Auction winner payment deadline
alter table auction_lots add column if not exists payment_due_at timestamptz;
alter table auction_lots add column if not exists payment_id uuid references payments(id) on delete set null;

-- Member verification (lightweight KYC)
create table if not exists member_verifications (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'unverified',
  id_type text,
  id_reference text,
  verified_at timestamptz,
  verified_by uuid references auth.users(id),
  notes text,
  updated_at timestamptz not null default now()
);

alter table member_verifications enable row level security;
create policy "own verification read" on member_verifications for select using (auth.uid() = user_id);
create policy "admin verification" on member_verifications for all
  using (exists (select 1 from user_roles where user_id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from user_roles where user_id = auth.uid() and role = 'admin'));

-- Link listings to artworks
alter table listings add column if not exists artwork_id uuid references artworks(id) on delete set null;

-- Auto-settle auction + payment deadline
create or replace function settle_expired_auction_lots()
returns int language plpgsql security definer set search_path = public as $$
declare n int := 0; r auction_lots%rowtype;
begin
  for r in select * from auction_lots where status = 'live' and ends_at <= now() loop
    if r.bid_count > 0 and r.current_bid >= r.reserve then
      update auction_lots set
        status = 'sold',
        payment_due_at = now() + interval '72 hours'
      where id = r.id;
    else
      update auction_lots set status = 'passed' where id = r.id;
    end if;
    n := n + 1;
  end loop;

  -- Re-list unpaid winners after deadline
  update auction_lots set
    status = 'passed',
    leading_bidder = null,
    payment_due_at = null
  where status = 'sold'
    and payment_due_at is not null
    and payment_due_at < now()
    and payment_id is null;

  return n;
end; $$;

-- Fulfill payment (called from webhook + verify)
create or replace function fulfill_payment_record(p_payment_id uuid, p_reference text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  pay payments%rowtype;
  meta jsonb;
  lot_id uuid;
begin
  select * into pay from payments where id = p_payment_id for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if pay.status = 'succeeded' then return jsonb_build_object('ok', true, 'already', true); end if;

  update payments set status = 'succeeded', provider_ref = coalesce(provider_ref, p_reference), updated_at = now()
  where id = p_payment_id;

  meta := pay.metadata;

  if meta->>'artwork_id' is not null then
    update artworks set lifecycle_status = 'sold', is_pledged = false where id = (meta->>'artwork_id')::uuid;
    insert into provenance_events (artwork_id, event_type, to_party, amount_ngn, notes)
    values ((meta->>'artwork_id')::uuid, 'sale', pay.user_id::text, pay.amount_ngn, 'Payment fulfilled');
  end if;

  if meta->>'lot_id' is not null then
    lot_id := (meta->>'lot_id')::uuid;
    update auction_lots set payment_id = p_payment_id where id = lot_id and leading_bidder = pay.user_id;
  end if;

  if meta->>'escrow' = 'true' and meta->>'thread_id' is not null then
    insert into escrow_holds (payment_id, thread_id, listing_id, buyer_id, seller_id, amount_ngn, status)
    values (
      p_payment_id,
      (meta->>'thread_id')::uuid,
      nullif(meta->>'listing_id', '')::uuid,
      pay.user_id,
      (meta->>'seller_id')::uuid,
      pay.amount_ngn,
      'held'
    );
  end if;

  return jsonb_build_object('ok', true);
end; $$;

-- Issue certificate with verify code
create or replace function register_certificate(
  p_broker_id uuid,
  p_title text,
  p_artist text,
  p_owner text,
  p_url text,
  p_artwork_id uuid default null
) returns text language plpgsql security definer set search_path = public as $$
declare code text;
begin
  code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
  insert into certificate_registry (verify_code, broker_request_id, artwork_id, title, artist_name, owner_name, certificate_url)
  values (code, p_broker_id, p_artwork_id, p_title, p_artist, p_owner, p_url);
  update broker_requests set certificate_url = p_url, status = 'certified' where id = p_broker_id;
  return code;
end; $$;

-- Site content in app_settings
insert into app_settings (key, value)
values ('site_content', '{}'::jsonb)
on conflict (key) do nothing;

insert into app_settings (key, value)
values ('rate_limit_config', '{"window_ms":60000,"max":60}'::jsonb)
on conflict (key) do nothing;
