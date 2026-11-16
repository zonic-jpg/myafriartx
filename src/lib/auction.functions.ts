import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buyersPremium, type Lot, type LotStatus } from "@/lib/auction-engine";
import { isUsableImageUrl } from "@/lib/cache-bust";

const __get_admin = () =>
  import("@/integrations/supabase/client.server").then((m) => m.supabaseAdmin);

type DbLot = {
  id: string;
  code: string | null;
  title: string;
  artist: string | null;
  medium: string | null;
  image_url: string | null;
  description: string | null;
  estimate_low: number | null;
  estimate_high: number | null;
  starting_bid: number;
  reserve: number;
  current_bid: number;
  bid_count: number;
  leading_bidder: string | null;
  status: string;
  ends_at: string;
};

async function leaderNames(ids: string[]): Promise<Map<string, string>> {
  if (!ids.length) return new Map();
  const { data } = await (await __get_admin())
    .from("profiles")
    .select("id, display_name")
    .in("id", ids);
  return new Map((data ?? []).map((p) => [p.id, p.display_name ?? "Bidder"]));
}

export function mapDbLot(row: DbLot, leaderName: string | null): Lot & { reserveMet: boolean } {
  const bidCount = Number(row.bid_count ?? 0);
  const currentBid = Number(row.current_bid ?? 0);
  const reserve = Number(row.reserve ?? 0);
  return {
    id: row.id,
    code: row.code ?? row.id.slice(0, 8),
    title: row.title,
    artist: row.artist ?? "Unknown artist",
    medium: row.medium ?? "",
    image: isUsableImageUrl(row.image_url) ? row.image_url : null,
    description: row.description ?? "",
    estimateLow: Number(row.estimate_low ?? 0),
    estimateHigh: Number(row.estimate_high ?? 0),
    startingBid: Number(row.starting_bid ?? 0),
    reserve: 0,
    currentBid,
    bidCount,
    leadingBidderId: row.leading_bidder,
    leadingBidderName: leaderName,
    status: row.status as LotStatus,
    endsAt: new Date(row.ends_at).getTime(),
    reserveMet: bidCount > 0 && currentBid >= reserve,
  };
}

const __gate = () => import("./service-gate.server");
export const listAuctionLots = createServerFn({ method: "GET" }).handler(async () => {
  if (!(await (await __gate()).serviceAllowed("auctions"))) return { lots: [], gated: true as const };
  const admin = await __get_admin();
  await admin.rpc("settle_expired_auction_lots");

  const { data, error } = await admin
    .from("auction_lots")
    .select("*")
    .in("status", ["upcoming", "live", "sold", "passed"])
    .order("ends_at", { ascending: true });

  if (error) throw new Error(error.message);

  const leaderIds = Array.from(
    new Set((data ?? []).map((r) => r.leading_bidder).filter(Boolean) as string[]),
  );
  const names = await leaderNames(leaderIds);

  return {
    lots: (data ?? []).map((r) =>
      mapDbLot(r as DbLot, r.leading_bidder ? (names.get(r.leading_bidder) ?? "Bidder") : null),
    ),
  };
});

export const listLotBids = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ lotId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { data: rows, error } = await (await __get_admin())
      .from("auction_bids")
      .select("id, lot_id, bidder, amount, created_at")
      .eq("lot_id", data.lotId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw new Error(error.message);

    const bidderIds = Array.from(
      new Set((rows ?? []).map((r) => r.bidder).filter(Boolean) as string[]),
    );
    const names = await leaderNames(bidderIds);

    return (rows ?? [])
      .filter((r) => r.lot_id && r.bidder)
      .map((r) => ({
        id: r.id,
        lotId: r.lot_id as string,
        bidderId: r.bidder as string,
        bidderName: names.get(r.bidder as string) ?? "Bidder",
        amount: Number(r.amount),
        at: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
      }));
  });

export const placeAuctionBid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ lotId: z.string().uuid(), amount: z.number().int().positive() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await (await __gate()).assertServiceAccess("auctions", context.userId, "Live auctions");
    const { data: lot, error } = await context.supabase.rpc("place_bid", {
      p_lot: data.lotId,
      p_amount: data.amount,
    });

    if (error) throw new Error(error.message);

    const row = lot as DbLot;
    let leaderName: string | null = null;
    if (row.leading_bidder) {
      const { data: prof } = await (await __get_admin())
        .from("profiles")
        .select("display_name")
        .eq("id", row.leading_bidder)
        .maybeSingle();
      leaderName = prof?.display_name ?? "You";
    }

    return {
      lot: mapDbLot(row, leaderName),
      extended:
        new Date(row.ends_at).getTime() - Date.now() <= 120_000 &&
        row.leading_bidder === context.userId,
    };
  });

export const getAuctionWinCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ lotId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: lot, error } = await (await __get_admin())
      .from("auction_lots")
      .select("*")
      .eq("id", data.lotId)
      .single();

    if (error || !lot) throw new Error("Lot not found");
    if (lot.status !== "sold") throw new Error("Lot is not sold");
    if (lot.leading_bidder !== context.userId) throw new Error("You did not win this lot");

    const { hammer, premium, total } = buyersPremium(Math.round(Number(lot.current_bid)));

    return { lotId: lot.id, hammer, premium, total, title: lot.title };
  });

// ============================================================
// Admin: schedule and manage lots (so an auction can actually be run)
// ============================================================
async function assertAuctionAdmin(userId: string) {
  const { data } = await (await __get_admin())
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden: admin only");
}

const MAX_NGN = 10_000_000_000;
const LotInput = z.object({
  id: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(2).max(200),
  artist: z.string().trim().max(200).optional().nullable(),
  medium: z.string().trim().max(200).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
  imageUrl: z.string().trim().max(1000).optional().nullable(),
  startingBid: z.number().int().min(0).max(MAX_NGN),
  reserve: z.number().int().min(0).max(MAX_NGN),
  estimateLow: z.number().int().min(0).max(MAX_NGN).optional().nullable(),
  estimateHigh: z.number().int().min(0).max(MAX_NGN).optional().nullable(),
  days: z.number().int().min(1).max(30),
});

export const adminListAuctionLots = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAuctionAdmin(context.userId);
    const admin = await __get_admin();
    await admin.rpc("settle_expired_auction_lots");
    const { data, error } = await admin
      .from("auction_lots")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** Create a lot and open it for bidding, or edit one that has no bids yet. */
export const adminSaveAuctionLot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => LotInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAuctionAdmin(context.userId);
    const admin = await __get_admin();
    const image = data.imageUrl && /^https:\/\//i.test(data.imageUrl) ? data.imageUrl : null;
    if (data.imageUrl && !image) throw new Error("The picture link must start with https://");
    if (data.estimateLow != null && data.estimateHigh != null && data.estimateHigh < data.estimateLow) {
      throw new Error("The high estimate must not be below the low estimate.");
    }
    const endsAt = new Date(Date.now() + data.days * 24 * 60 * 60 * 1000).toISOString();
    const fields = {
      title: data.title,
      artist: data.artist || null,
      medium: data.medium || null,
      description: data.description || null,
      image_url: image,
      starting_bid: data.startingBid,
      reserve: data.reserve,
      estimate_low: data.estimateLow ?? null,
      estimate_high: data.estimateHigh ?? null,
    };

    if (data.id) {
      const { data: existing, error: readError } = await admin
        .from("auction_lots")
        .select("id, bid_count, status")
        .eq("id", data.id)
        .maybeSingle();
      if (readError || !existing) throw new Error("Lot not found");
      if (Number(existing.bid_count ?? 0) > 0) {
        throw new Error("This lot already has bids, so it can no longer be edited.");
      }
      const { error } = await admin
        .from("auction_lots")
        .update({ ...fields, status: "live", ends_at: endsAt })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }

    const { count } = await admin.from("auction_lots").select("id", { count: "exact", head: true });
    let code = `L-${String((count ?? 0) + 1).padStart(3, "0")}`;
    for (let attempt = 0; attempt < 4; attempt++) {
      const { data: row, error } = await admin
        .from("auction_lots")
        .insert({ ...fields, code, status: "live", ends_at: endsAt })
        .select("id")
        .single();
      if (!error && row) return { id: row.id };
      if (error && error.code !== "23505") throw new Error(error.message);
      code = `L-${String((count ?? 0) + 2 + attempt).padStart(3, "0")}-${Math.random().toString(36).slice(2, 5)}`;
    }
    throw new Error("The lot could not be created. Please try again.");
  });

/** Put an unsold or not-yet-started lot back up for bidding with a fresh clock. */
export const adminRelistAuctionLot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), days: z.number().int().min(1).max(30) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAuctionAdmin(context.userId);
    const admin = await __get_admin();
    const { data: lot, error: readError } = await admin
      .from("auction_lots")
      .select("id, status, payment_id")
      .eq("id", data.id)
      .maybeSingle();
    if (readError || !lot) throw new Error("Lot not found");
    if (lot.status === "live") throw new Error("This lot is already open for bidding.");
    if (lot.status === "sold" || lot.payment_id) throw new Error("A sold lot cannot be relisted.");
    const { error } = await admin
      .from("auction_lots")
      .update({
        status: "live",
        ends_at: new Date(Date.now() + data.days * 24 * 60 * 60 * 1000).toISOString(),
        current_bid: 0,
        bid_count: 0,
        leading_bidder: null,
        payment_due_at: null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** End bidding on a live lot now; it settles as sold (reserve met) or no sale. */
export const adminCloseAuctionLot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAuctionAdmin(context.userId);
    const admin = await __get_admin();
    const { error } = await admin
      .from("auction_lots")
      .update({ ends_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("status", "live");
    if (error) throw new Error(error.message);
    await admin.rpc("settle_expired_auction_lots");
    return { ok: true };
  });
