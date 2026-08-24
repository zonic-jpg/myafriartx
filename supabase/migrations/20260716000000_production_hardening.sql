-- ArtStage production: payments, collateral, auction seeds, settlement

-- Payments
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  purpose text not null,
  amount_ngn bigint not null check (amount_ngn >= 0),
  currency text not null default 'NGN',
  status text not null default 'pending',
  provider text not null default 'mock',
  provider_ref text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_payments_user on payments(user_id, created_at desc);
create index if not exists idx_payments_ref on payments(provider_ref);

alter table payments enable row level security;
create policy "own payments read" on payments for select using (auth.uid() = user_id);
create policy "insert own payment" on payments for insert with check (auth.uid() = user_id);

-- Collateral pledges (art as collateral with authentication link)
create table if not exists collateral_pledges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  artwork_id uuid references artworks(id) on delete set null,
  broker_request_id uuid references broker_requests(id) on delete set null,
  title text not null,
  appraised_value_ngn bigint not null check (appraised_value_ngn >= 0),
  loan_amount_ngn bigint not null check (loan_amount_ngn >= 0),
  status text not null default 'pending_auth',
  certificate_url text,
  authentication_notes text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_collateral_user on collateral_pledges(user_id, status);

alter table collateral_pledges enable row level security;
create policy "own collateral read" on collateral_pledges for select using (auth.uid() = user_id);
create policy "own collateral insert" on collateral_pledges for insert with check (auth.uid() = user_id);

-- Admin manages collateral
create policy "admin collateral all" on collateral_pledges for all
  using (exists (select 1 from user_roles where user_id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from user_roles where user_id = auth.uid() and role = 'admin'));

-- Link auction lots to artworks (optional)
alter table auction_lots add column if not exists artwork_id uuid references artworks(id) on delete set null;

-- Settle expired live lots
create or replace function settle_expired_auction_lots()
returns int language plpgsql security definer set search_path = public as $$
declare n int := 0; r auction_lots%rowtype;
begin
  for r in select * from auction_lots where status = 'live' and ends_at <= now() loop
    if r.bid_count > 0 and r.current_bid >= r.reserve then
      update auction_lots set status = 'sold' where id = r.id;
    else
      update auction_lots set status = 'passed' where id = r.id;
    end if;
    n := n + 1;
  end loop;
  return n;
end; $$;

-- Seed live auction lots if empty
insert into auction_lots (code, title, artist, medium, description, estimate_low, estimate_high, starting_bid, reserve, current_bid, bid_count, status, ends_at)
select * from (values
  ('L-001', 'Harmattan Morning', 'A. Okeke', 'Oil on canvas, 90×120cm', 'A luminous study of dawn light over the savannah.', 1200000::bigint, 1800000::bigint, 900000::bigint, 1400000::bigint, 0::bigint, 0, 'live', now() + interval '2 hours'),
  ('L-002', 'Market Women (triptych)', 'N. Bassey', 'Acrylic, 3×60×80cm', 'Three panels in vivid indigo and ochre.', 600000::bigint, 900000::bigint, 450000::bigint, 700000::bigint, 0::bigint, 0, 'live', now() + interval '45 minutes'),
  ('L-003', 'Bronze Head, Study II', 'I. Eze', 'Cast bronze, 42cm', 'A contemporary homage to Ife bronzes.', 2500000::bigint, 3500000::bigint, 2000000::bigint, 3000000::bigint, 0::bigint, 0, 'live', now() + interval '3 hours'),
  ('L-004', 'Lagos Nocturne', 'T. Adeyemi', 'Mixed media, 100×100cm', 'The city at night in gold leaf and lamp-black.', 800000::bigint, 1200000::bigint, 600000::bigint, 950000::bigint, 0::bigint, 0, 'upcoming', now() + interval '6 hours')
) as v(code, title, artist, medium, description, estimate_low, estimate_high, starting_bid, reserve, current_bid, bid_count, status, ends_at)
where not exists (select 1 from auction_lots limit 1);

-- Default mock catalogue off for production (admin can re-enable in settings)
insert into app_settings (key, value)
values ('mock_catalogue_enabled', 'false'::jsonb)
on conflict (key) do update set value = excluded.value;

grant execute on function place_bid(uuid, bigint) to authenticated;
grant execute on function settle_expired_auction_lots() to authenticated;
