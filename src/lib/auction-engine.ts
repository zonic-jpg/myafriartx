// MyAfriArt auction engine — rules consistent with international timed auctions
// (Christie's / Sotheby's / eBay timed sales). Pure functions, shared by the
// client UI and the server functions so both enforce identical rules.

export type LotStatus = "upcoming" | "live" | "sold" | "passed" | "closed";
export type Lot = {
  id: string;
  code: string;
  title: string;
  artist: string;
  medium: string;
  image: string | null;
  description: string;
  estimateLow: number;
  estimateHigh: number;
  startingBid: number;
  reserve: number; // reserve is hidden from bidders
  currentBid: number;
  bidCount: number;
  leadingBidderId: string | null;
  leadingBidderName: string | null;
  status: LotStatus;
  endsAt: number; // epoch ms
};
export type Bid = {
  id: string;
  lotId: string;
  bidderId: string;
  bidderName: string;
  amount: number;
  at: number;
};

export const CURRENCY = "₦";
export const BUYERS_PREMIUM = 0.2; // 20% buyer's premium (industry standard band)
export const SOFT_CLOSE_MS = 2 * 60 * 1000; // anti-snipe: bids in last 2 min extend the lot by 2 min

const fmt = new Intl.NumberFormat("en-NG");
export const money = (n: number) => CURRENCY + fmt.format(Math.round(n));

// Ascending bid-increment ladder (the standard "bidding steps" used at auction).
export function increment(current: number): number {
  if (current < 100_000) return 5_000;
  if (current < 500_000) return 10_000;
  if (current < 1_000_000) return 25_000;
  if (current < 5_000_000) return 50_000;
  if (current < 20_000_000) return 100_000;
  return 250_000;
}

// The minimum a new bid must be. First bid must meet the starting bid; after that,
// current bid plus one increment.
export function minNextBid(lot: Pick<Lot, "currentBid" | "startingBid" | "bidCount">): number {
  if (lot.bidCount === 0) return lot.startingBid;
  return lot.currentBid + increment(lot.currentBid);
}

export function reserveMet(
  lot: Pick<Lot, "currentBid" | "reserve" | "bidCount"> & { reserveMet?: boolean },
): boolean {
  if ("reserveMet" in lot && lot.reserveMet !== undefined) return lot.reserveMet;
  return lot.bidCount > 0 && lot.currentBid >= lot.reserve;
}

export function buyersPremium(hammer: number) {
  const premium = Math.round(hammer * BUYERS_PREMIUM);
  return { hammer, premium, total: hammer + premium };
}

export type BidResult =
  | { ok: true; lot: Lot; extended: boolean }
  | { ok: false; reason: string; minNext: number };

// The core rule check + state transition for placing a bid. Used identically on
// client (optimistic) and server (authoritative).
export function applyBid(
  lot: Lot,
  bidderId: string,
  bidderName: string,
  amount: number,
  now = Date.now(),
): BidResult {
  if (lot.status !== "live")
    return { ok: false, reason: "This lot is not open for bidding.", minNext: minNextBid(lot) };
  if (now >= lot.endsAt)
    return { ok: false, reason: "Bidding has closed for this lot.", minNext: minNextBid(lot) };
  const min = minNextBid(lot);
  if (amount < min)
    return { ok: false, reason: `Your bid must be at least ${money(min)}.`, minNext: min };
  if (lot.leadingBidderId === bidderId)
    return {
      ok: false,
      reason: "You are already the highest bidder.",
      minNext: min + increment(amount),
    };

  // soft close (anti-sniping): a late bid extends the lot
  let endsAt = lot.endsAt;
  let extended = false;
  if (lot.endsAt - now <= SOFT_CLOSE_MS) {
    endsAt = now + SOFT_CLOSE_MS;
    extended = true;
  }

  const next: Lot = {
    ...lot,
    currentBid: amount,
    bidCount: lot.bidCount + 1,
    leadingBidderId: bidderId,
    leadingBidderName: bidderName,
    endsAt,
  };
  return { ok: true, lot: next, extended };
}

// Resolve a lot at end of bidding: sold if reserve met, else passed.
export function settle(lot: Lot): Lot {
  if (lot.status === "sold" || lot.status === "passed") return lot;
  return { ...lot, status: reserveMet(lot) ? "sold" : "passed" };
}

export function countdown(endsAt: number, now = Date.now()): string {
  let s = Math.max(0, Math.floor((endsAt - now) / 1000));
  const d = Math.floor(s / 86400);
  s -= d * 86400;
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  s -= m * 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}
