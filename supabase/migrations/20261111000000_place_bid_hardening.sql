-- Hardens place_bid: rejects null/<=0/oversized amounts and lots with no end time
-- (a NULL ends_at used to make `now() >= ends_at` NULL, letting bids through).
-- Applied live via execute_sql on 2026-11-11; kept here for reproducibility.
create or replace function public.place_bid(p_lot uuid, p_amount bigint)
 returns auction_lots
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare l auction_lots; inc bigint; min_next bigint; soft int := 120;
  max_bid constant bigint := 10000000000;
begin
  if auth.uid() is null then raise exception 'sign in required'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Enter a valid bid amount'; end if;
  if p_amount > max_bid then raise exception 'Bid exceeds the maximum allowed amount'; end if;
  select * into l from auction_lots where id = p_lot for update;
  if not found then raise exception 'Lot not found'; end if;
  if l.status <> 'live' then raise exception 'Lot not open for bidding'; end if;
  if l.ends_at is null or now() >= l.ends_at then raise exception 'Bidding closed'; end if;
  if l.bid_count = 0 then min_next := coalesce(l.starting_bid, 0);
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
end; $function$;
