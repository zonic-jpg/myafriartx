-- Lock down SECURITY DEFINER functions that were callable by roles that
-- should never be able to call them directly over the REST RPC endpoint.
-- Flagged by Supabase security advisors on 2026-09-14; verified against
-- actual call sites in the app before changing anything.

-- fulfill_payment_record: marks a payment "succeeded", releases the artwork,
-- creates escrow holds. Only ever called server-side via the service-role
-- client (payments-core.server.ts, payments.functions.ts). Anon/authenticated
-- had no legitimate reason to reach it directly and could have marked any
-- payment_id "succeeded" without paying.
revoke execute on function public.fulfill_payment_record(uuid, text) from anon, authenticated;

-- resolve_payment_dispute: takes an arbitrary p_admin_id with no check that
-- the caller IS that admin, and can trigger refunds. Only ever called
-- server-side (disputes.functions.ts) after assertAdmin(). Was directly
-- callable by anyone, admin check or not.
revoke execute on function public.resolve_payment_dispute(uuid, text, text, boolean, uuid) from anon, authenticated;

-- register_certificate: fabricates a certificate-of-authenticity record with
-- caller-supplied title/artist/owner and no ownership check on the broker
-- request. Only ever called server-side (lounge.functions.ts) via the admin
-- client after the broker flow completes.
revoke execute on function public.register_certificate(uuid, text, text, text, text, uuid) from anon, authenticated;

-- settle_expired_auction_lots: settles all expired lots. Only ever called
-- from the cron route and admin client (auction.functions.ts). No reason for
-- a client to trigger it directly.
revoke execute on function public.settle_expired_auction_lots() from anon, authenticated;

-- claim_legacy_artist_by_email: takes an arbitrary _profile_id (not tied to
-- the caller) and links it to any unclaimed legacy artist record matching
-- that profile's email — no call site anywhere in the app actually uses
-- this function; it was dead code left publicly callable. Lock it down and
-- harden it in case it's wired up later.
revoke execute on function public.claim_legacy_artist_by_email(uuid) from anon, authenticated;

create or replace function public.claim_legacy_artist_by_email(_profile_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'auth'
as $function$
declare
  _email text;
  _legacy_id uuid;
begin
  if _profile_id is distinct from auth.uid() then
    raise exception 'can only claim your own profile';
  end if;

  select email into _email from auth.users where id = _profile_id;
  if _email is null then return null; end if;

  select id into _legacy_id
    from public.legacy_myafriart_artists
    where lower(trim(email)) = lower(trim(_email))
      and claimed_profile_id is null
    limit 1;

  if _legacy_id is null then return null; end if;

  update public.legacy_myafriart_artists
    set claimed_profile_id = _profile_id,
        claimed_at = now(),
        consent_status = case when consent_status in ('unknown','pending') then 'consented' else consent_status end,
        consent_note = coalesce(consent_note, '') ||
          case when consent_note is null or consent_note = '' then '' else E'\n' end ||
          'Auto-linked: re-registered on live platform ' || now()::date
    where id = _legacy_id;

  return _legacy_id;
end;
$function$;

grant execute on function public.claim_legacy_artist_by_email(uuid) to authenticated;

-- place_bid: relies on auth.uid() internally but had no guard against a null
-- (anonymous) caller, and was directly callable by anon — letting an
-- unauthenticated visitor insert a bid row with a null bidder and disturb a
-- live auction lot. Real bidders call this via context.supabase
-- (auction.functions.ts) as an authenticated user, so authenticated access
-- stays; anon is revoked and a null auth.uid() now fails loudly instead of
-- silently recording a bid from nobody.
revoke execute on function public.place_bid(uuid, bigint) from anon;

create or replace function public.place_bid(p_lot uuid, p_amount bigint)
returns auction_lots
language plpgsql
security definer
set search_path to 'public'
as $function$
declare l auction_lots; inc bigint; min_next bigint; soft int := 120; -- seconds
begin
  if auth.uid() is null then
    raise exception 'sign in required';
  end if;

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
end; $function$;

grant execute on function public.place_bid(uuid, bigint) to authenticated;
