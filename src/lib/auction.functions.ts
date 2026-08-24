import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Lot, LotStatus } from "@/lib/auction-engine";

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
    image: row.image_url,
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

export const listAuctionLots = createServerFn({ method: "GET" }).handler(async () => {
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

    return (rows ?? []).map((r) => ({
      id: r.id,
      lotId: r.lot_id,
      bidderId: r.bidder,
      bidderName: r.bidder ? (names.get(r.bidder) ?? "Bidder") : "—",
      amount: Number(r.amount),
      at: new Date(r.created_at).getTime(),
    }));
  });

export const placeAuctionBid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ lotId: z.string().uuid(), amount: z.number().int().positive() }).parse(d),
  )
  .handler(async ({ data, context }) => {
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

    const hammer = Number(lot.current_bid);
    const premium = Math.round(hammer * 0.2);
    const total = hammer + premium;

    return { lotId: lot.id, hammer, premium, total, title: lot.title };
  });
