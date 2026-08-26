import { c as createServerRpc } from "./createServerRpc-BDiocLCN.js";
import { c as createServerFn } from "./server-xISFJUTE.js";
import { z } from "zod";
import { r as requireSupabaseAuth } from "./auth-middleware-DPJJ5M9W.js";
import "node:async_hooks";
import "h3-v2";
import "@tanstack/router-core";
import "seroval";
import "@tanstack/history";
import "@tanstack/router-core/ssr/client";
import "@tanstack/router-core/ssr/server";
import "react";
import "@tanstack/react-router";
import "react/jsx-runtime";
import "@tanstack/react-router/ssr/server";
import "@supabase/supabase-js";
const __get_admin = () => import("./client.server-D5ro3rAQ.js").then((m) => m.supabaseAdmin);
async function leaderNames(ids) {
  if (!ids.length) return /* @__PURE__ */ new Map();
  const {
    data
  } = await (await __get_admin()).from("profiles").select("id, display_name").in("id", ids);
  return new Map((data ?? []).map((p) => [p.id, p.display_name ?? "Bidder"]));
}
function mapDbLot(row, leaderName) {
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
    status: row.status,
    endsAt: new Date(row.ends_at).getTime(),
    reserveMet: bidCount > 0 && currentBid >= reserve
  };
}
const listAuctionLots_createServerFn_handler = createServerRpc({
  id: "3d2c7178bb082798b16c1e8330938c5f51516a12ccf31968b9b66ce9a567485e",
  name: "listAuctionLots",
  filename: "src/lib/auction.functions.ts"
}, (opts) => listAuctionLots.__executeServer(opts));
const listAuctionLots = createServerFn({
  method: "GET"
}).handler(listAuctionLots_createServerFn_handler, async () => {
  const admin = await __get_admin();
  await admin.rpc("settle_expired_auction_lots");
  const {
    data,
    error
  } = await admin.from("auction_lots").select("*").in("status", ["upcoming", "live", "sold", "passed"]).order("ends_at", {
    ascending: true
  });
  if (error) throw new Error(error.message);
  const leaderIds = Array.from(new Set((data ?? []).map((r) => r.leading_bidder).filter(Boolean)));
  const names = await leaderNames(leaderIds);
  return {
    lots: (data ?? []).map((r) => mapDbLot(r, r.leading_bidder ? names.get(r.leading_bidder) ?? "Bidder" : null))
  };
});
const listLotBids_createServerFn_handler = createServerRpc({
  id: "627001f8916b473b12f6c038dc36fc2a72b49020d7b25bbed1bd89c2a1503dfb",
  name: "listLotBids",
  filename: "src/lib/auction.functions.ts"
}, (opts) => listLotBids.__executeServer(opts));
const listLotBids = createServerFn({
  method: "GET"
}).inputValidator((d) => z.object({
  lotId: z.string().uuid()
}).parse(d)).handler(listLotBids_createServerFn_handler, async ({
  data
}) => {
  const {
    data: rows,
    error
  } = await (await __get_admin()).from("auction_bids").select("id, lot_id, bidder, amount, created_at").eq("lot_id", data.lotId).order("created_at", {
    ascending: false
  }).limit(50);
  if (error) throw new Error(error.message);
  const bidderIds = Array.from(new Set((rows ?? []).map((r) => r.bidder).filter(Boolean)));
  const names = await leaderNames(bidderIds);
  return (rows ?? []).map((r) => ({
    id: r.id,
    lotId: r.lot_id,
    bidderId: r.bidder,
    bidderName: r.bidder ? names.get(r.bidder) ?? "Bidder" : "—",
    amount: Number(r.amount),
    at: new Date(r.created_at).getTime()
  }));
});
const placeAuctionBid_createServerFn_handler = createServerRpc({
  id: "e7e50c8da85c663ba2f345bfeebba4dbb2cdfac76acbc4ce1b9b320778691823",
  name: "placeAuctionBid",
  filename: "src/lib/auction.functions.ts"
}, (opts) => placeAuctionBid.__executeServer(opts));
const placeAuctionBid = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  lotId: z.string().uuid(),
  amount: z.number().int().positive()
}).parse(d)).handler(placeAuctionBid_createServerFn_handler, async ({
  data,
  context
}) => {
  const {
    data: lot,
    error
  } = await context.supabase.rpc("place_bid", {
    p_lot: data.lotId,
    p_amount: data.amount
  });
  if (error) throw new Error(error.message);
  const row = lot;
  let leaderName = null;
  if (row.leading_bidder) {
    const {
      data: prof
    } = await (await __get_admin()).from("profiles").select("display_name").eq("id", row.leading_bidder).maybeSingle();
    leaderName = prof?.display_name ?? "You";
  }
  return {
    lot: mapDbLot(row, leaderName),
    extended: new Date(row.ends_at).getTime() - Date.now() <= 12e4 && row.leading_bidder === context.userId
  };
});
const getAuctionWinCheckout_createServerFn_handler = createServerRpc({
  id: "ef542700cac383e8ea63bd243e0765a046f16bc9234884a8fd0ad684e1057910",
  name: "getAuctionWinCheckout",
  filename: "src/lib/auction.functions.ts"
}, (opts) => getAuctionWinCheckout.__executeServer(opts));
const getAuctionWinCheckout = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  lotId: z.string().uuid()
}).parse(d)).handler(getAuctionWinCheckout_createServerFn_handler, async ({
  data,
  context
}) => {
  const {
    data: lot,
    error
  } = await (await __get_admin()).from("auction_lots").select("*").eq("id", data.lotId).single();
  if (error || !lot) throw new Error("Lot not found");
  if (lot.status !== "sold") throw new Error("Lot is not sold");
  if (lot.leading_bidder !== context.userId) throw new Error("You did not win this lot");
  const hammer = Number(lot.current_bid);
  const premium = Math.round(hammer * 0.2);
  const total = hammer + premium;
  return {
    lotId: lot.id,
    hammer,
    premium,
    total,
    title: lot.title
  };
});
export {
  getAuctionWinCheckout_createServerFn_handler,
  listAuctionLots_createServerFn_handler,
  listLotBids_createServerFn_handler,
  placeAuctionBid_createServerFn_handler
};
