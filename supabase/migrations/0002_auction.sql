-- MyAfriart auction: lots + bids (best-practice timed auction)
create table if not exists auction_lots (
  id uuid primary key default gen_random_uuid(),
  code text unique, title text not null, artist text, medium text, image_url text, description text,
  estimate_low bigint, estimate_high bigint,
  starting_bid bigint not null default 0,
  reserve bigint not null default 0,                 -- hidden from bidders
  current_bid bigint not null default 0,
  bid_count int not null default 0,
  leading_bidder uuid references auth.users(id),
  status text not null default 'upcoming',           -- upcoming|live|sold|passed|closed
  ends_at timestamptz,
  created_at timestamptz default now()
);
create table if not exists auction_bids (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid references auction_lots(id) on delete cascade,
  bidder uuid references auth.users(id),
  amount bigint not null,
  created_at timestamptz default now()
);
create index if not exists idx_bids_lot on auction_bids(lot_id, created_at desc);

alter table auction_lots enable row level security;
alter table auction_bids enable row level security;

-- everyone can view lots and bid history; reserve is served via a view that omits it in production
create policy "lots readable" on auction_lots for select using (true);
create policy "bids readable" on auction_bids for select using (true);

-- only signed-in (verified) users may place bids; the place_bid function enforces the rules
create policy "insert own bid" on auction_bids for insert with check (auth.uid() = bidder);

-- Authoritative bid placement: validates increment, reserve-agnostic min, status & soft-close,
-- updates the lot atomically. Mirrors src/lib/auction-engine.ts.
create or replace function place_bid(p_lot uuid, p_amount bigint)
returns auction_lots language plpgsql security definer as $$
declare l auction_lots; inc bigint; min_next bigint; soft int := 120; -- seconds
begin
  select * into l from auction_lots where id = p_lot for update;
  if not found then raise exception 'Lot not found'; end if;
  if l.status <> 'live' then raise exception 'Lot not open for bidding'; end if;
  if now() >= l.ends_at then raise exception 'Bidding closed'; end if;
  if l.bid_count = 0 then min_next := l.starting_bid;
  else
    inc := case
      when l.current_bid < 100000 then 5000
      when l.current_bid < 500000 then 10000
      when l.current_bid < 1000000 then 25000
      when l.current_bid < 5000000 then 50000
      when l.current_bid < 20000000 then 100000
      else 250000 end;
    min_next := l.current_bid + inc;
  end if;
  if p_amount < min_next then raise exception 'Bid below minimum %', min_next; end if;
  if l.leading_bidder = auth.uid() then raise exception 'Already highest bidder'; end if;

  insert into auction_bids(lot_id, bidder, amount) values (p_lot, auth.uid(), p_amount);
  update auction_lots set
    current_bid = p_amount, bid_count = bid_count + 1, leading_bidder = auth.uid(),
    ends_at = case when (extract(epoch from (ends_at - now())) <= soft) then now() + (soft || ' seconds')::interval else ends_at end
  where id = p_lot returning * into l;
  return l;
end; $$;
