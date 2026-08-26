import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import { Link } from "@tanstack/react-router";
import { u as useServerFn, S as SiteFooter } from "./router-9tDYEkuI.js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { s as supabase } from "./client-BWo_yy_6.js";
import { c as createSsrRpc } from "./createSsrRpc-Def-olcZ.js";
import { c as createServerFn } from "./server-xISFJUTE.js";
import { z } from "zod";
import { r as requireSupabaseAuth } from "./auth-middleware-DPJJ5M9W.js";
import { i as initializePayment } from "./payments.functions-BxN3htHl.js";
import "sonner";
import "@tanstack/zod-adapter";
import "ai";
import "@ai-sdk/openai-compatible";
import "node:crypto";
import "jose";
import "./client.server-D5ro3rAQ.js";
import "@supabase/supabase-js";
import "node:async_hooks";
import "h3-v2";
import "@tanstack/router-core";
import "seroval";
import "@tanstack/history";
import "@tanstack/router-core/ssr/client";
import "@tanstack/router-core/ssr/server";
import "@tanstack/react-router/ssr/server";
const listAuctionLots = createServerFn({
  method: "GET"
}).handler(createSsrRpc("3d2c7178bb082798b16c1e8330938c5f51516a12ccf31968b9b66ce9a567485e"));
const listLotBids = createServerFn({
  method: "GET"
}).inputValidator((d) => z.object({
  lotId: z.string().uuid()
}).parse(d)).handler(createSsrRpc("627001f8916b473b12f6c038dc36fc2a72b49020d7b25bbed1bd89c2a1503dfb"));
const placeAuctionBid = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  lotId: z.string().uuid(),
  amount: z.number().int().positive()
}).parse(d)).handler(createSsrRpc("e7e50c8da85c663ba2f345bfeebba4dbb2cdfac76acbc4ce1b9b320778691823"));
const getAuctionWinCheckout = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  lotId: z.string().uuid()
}).parse(d)).handler(createSsrRpc("ef542700cac383e8ea63bd243e0765a046f16bc9234884a8fd0ad684e1057910"));
const CURRENCY = "₦";
const BUYERS_PREMIUM = 0.2;
const fmt = new Intl.NumberFormat("en-NG");
const money = (n) => CURRENCY + fmt.format(Math.round(n));
function increment(current) {
  if (current < 1e5) return 5e3;
  if (current < 5e5) return 1e4;
  if (current < 1e6) return 25e3;
  if (current < 5e6) return 5e4;
  if (current < 2e7) return 1e5;
  return 25e4;
}
function minNextBid(lot) {
  if (lot.bidCount === 0) return lot.startingBid;
  return lot.currentBid + increment(lot.currentBid);
}
function reserveMet(lot) {
  if ("reserveMet" in lot && lot.reserveMet !== void 0) return lot.reserveMet;
  return lot.bidCount > 0 && lot.currentBid >= lot.reserve;
}
function buyersPremium(hammer) {
  const premium = Math.round(hammer * BUYERS_PREMIUM);
  return { hammer, premium, total: hammer + premium };
}
function countdown(endsAt, now = Date.now()) {
  let s = Math.max(0, Math.floor((endsAt - now) / 1e3));
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
function AuctionFloor() {
  const fetchLots = useServerFn(listAuctionLots);
  const {
    data,
    isLoading,
    refetch
  } = useQuery({
    queryKey: ["auction-lots"],
    queryFn: () => fetchLots(),
    refetchInterval: 15e3
  });
  const [openId, setOpenId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [displayName, setDisplayName] = useState("You");
  useEffect(() => {
    const {
      data: sub
    } = supabase.auth.onAuthStateChange(async (_e, s) => {
      setUserId(s?.user?.id ?? null);
      if (s?.user?.id) {
        const {
          data: prof
        } = await supabase.from("profiles").select("display_name").eq("id", s.user.id).maybeSingle();
        setDisplayName(prof?.display_name ?? "You");
      }
    });
    supabase.auth.getSession().then(async ({
      data: sess
    }) => {
      setUserId(sess.session?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  const lots = data?.lots ?? [];
  const open = lots.find((l) => l.id === openId) ?? null;
  return /* @__PURE__ */ jsxs("div", { className: "auc", children: [
    /* @__PURE__ */ jsxs("header", { className: "auc-top", children: [
      /* @__PURE__ */ jsx("div", { className: "auc-kicker", children: "Live auction" }),
      /* @__PURE__ */ jsx("h1", { children: "Friday Evening Sale" }),
      /* @__PURE__ */ jsxs("p", { children: [
        "Timed bidding with reserves, ",
        Math.round(BUYERS_PREMIUM * 100),
        "% buyer's premium, and two-minute anti-sniping — persisted to Supabase."
      ] }),
      !userId && /* @__PURE__ */ jsxs("p", { className: "mt-2 text-sm", children: [
        /* @__PURE__ */ jsx(Link, { to: "/login", className: "underline", children: "Sign in" }),
        " ",
        "to place bids."
      ] })
    ] }),
    isLoading ? /* @__PURE__ */ jsx("p", { className: "p-8 text-center text-muted-foreground", children: "Loading lots…" }) : !open ? /* @__PURE__ */ jsx("div", { className: "auc-grid", children: lots.map((l) => /* @__PURE__ */ jsxs("button", { className: `lot ${l.status}`, onClick: () => setOpenId(l.id), children: [
      /* @__PURE__ */ jsxs("div", { className: "lot-img", children: [
        l.image ? /* @__PURE__ */ jsx("img", { src: l.image, alt: "", className: "h-full w-full object-cover" }) : /* @__PURE__ */ jsx("b", { children: l.title[0] }),
        /* @__PURE__ */ jsx("span", { className: "lot-code", children: l.code }),
        /* @__PURE__ */ jsx("span", { className: `lot-status s-${l.status}`, children: l.status === "live" ? "● Live" : l.status })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "lot-body", children: [
        /* @__PURE__ */ jsx("div", { className: "lot-artist", children: l.artist }),
        /* @__PURE__ */ jsx("div", { className: "lot-title", children: l.title }),
        /* @__PURE__ */ jsxs("div", { className: "lot-est", children: [
          "Est. ",
          money(l.estimateLow),
          " – ",
          money(l.estimateHigh)
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "lot-bid-row", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("small", { children: l.bidCount ? "Current bid" : "Starting bid" }),
            /* @__PURE__ */ jsx("b", { children: money(l.bidCount ? l.currentBid : l.startingBid) })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "lot-time", children: l.status === "live" ? countdown(l.endsAt) : l.status })
        ] })
      ] })
    ] }, l.id)) }) : /* @__PURE__ */ jsx(LotDetail, { lot: open, userId, displayName, onBack: () => setOpenId(null), onRefresh: () => refetch() }),
    /* @__PURE__ */ jsx(SiteFooter, {})
  ] });
}
function LotDetail({
  lot,
  userId,
  displayName,
  onBack,
  onRefresh
}) {
  const qc = useQueryClient();
  const fetchBids = useServerFn(listLotBids);
  const bidFn = useServerFn(placeAuctionBid);
  const winCheckout = useServerFn(getAuctionWinCheckout);
  const payFn = useServerFn(initializePayment);
  const {
    data: bidData
  } = useQuery({
    queryKey: ["auction-bids", lot.id],
    queryFn: () => fetchBids({
      data: {
        lotId: lot.id
      }
    }),
    refetchInterval: 1e4
  });
  const min = minNextBid(lot);
  const [amount, setAmount] = useState(min);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 1e3);
    return () => clearInterval(t);
  }, []);
  useEffect(() => setAmount(minNextBid(lot)), [lot.currentBid, lot.bidCount, lot.id]);
  const leading = userId && lot.leadingBidderId === userId;
  const met = reserveMet(lot);
  const prem = buyersPremium(lot.currentBid || lot.startingBid);
  const closed = lot.status === "sold" || lot.status === "passed" || Date.now() >= lot.endsAt;
  const bids = bidData ?? [];
  const submit = async () => {
    if (!userId) {
      setMsg("Sign in to bid.");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await bidFn({
        data: {
          lotId: lot.id,
          amount
        }
      });
      setMsg(res.extended ? "Bid placed — lot extended by 2 minutes (anti-sniping)." : "Bid placed successfully.");
      onRefresh();
      qc.invalidateQueries({
        queryKey: ["auction-bids", lot.id]
      });
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Bid failed");
    } finally {
      setBusy(false);
    }
  };
  const payHammer = async () => {
    if (!userId) return;
    setBusy(true);
    try {
      const win = await winCheckout({
        data: {
          lotId: lot.id
        }
      });
      const pay = await payFn({
        data: {
          purpose: "auction_settlement",
          amountNgn: win.total,
          metadata: {
            lot_id: lot.id,
            title: win.title
          }
        }
      });
      if (pay.authorizationUrl) window.location.href = pay.authorizationUrl;
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setBusy(false);
    }
  };
  return /* @__PURE__ */ jsxs("div", { className: "lotdetail", children: [
    /* @__PURE__ */ jsx("button", { className: "auc-back", onClick: onBack, children: "‹ All lots" }),
    /* @__PURE__ */ jsxs("div", { className: "ld-grid", children: [
      /* @__PURE__ */ jsxs("div", { className: "ld-img", children: [
        lot.image ? /* @__PURE__ */ jsx("img", { src: lot.image, alt: "", className: "h-full w-full object-cover" }) : /* @__PURE__ */ jsx("b", { children: lot.title[0] }),
        /* @__PURE__ */ jsx("span", { className: "lot-code", children: lot.code })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "ld-info", children: [
        /* @__PURE__ */ jsx("div", { className: "ld-artist", children: lot.artist }),
        /* @__PURE__ */ jsx("h2", { children: lot.title }),
        /* @__PURE__ */ jsx("div", { className: "ld-medium", children: lot.medium }),
        /* @__PURE__ */ jsx("p", { className: "ld-desc", children: lot.description }),
        /* @__PURE__ */ jsxs("div", { className: "ld-panel", children: [
          /* @__PURE__ */ jsxs("div", { className: "ld-row", children: [
            /* @__PURE__ */ jsx("span", { children: lot.bidCount ? "Current bid" : "Starting bid" }),
            /* @__PURE__ */ jsx("b", { children: money(lot.bidCount ? lot.currentBid : lot.startingBid) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "ld-row sub", children: [
            /* @__PURE__ */ jsx("span", { className: `reserve ${met ? "met" : ""}`, children: met ? "Reserve met" : "Reserve not met" }),
            /* @__PURE__ */ jsx("b", { className: closed ? "" : "live-time", children: closed ? "Closed" : countdown(lot.endsAt) })
          ] }),
          !closed && lot.status === "live" && /* @__PURE__ */ jsxs(Fragment, { children: [
            leading && /* @__PURE__ */ jsx("div", { className: "ld-leading", children: "✓ You are the highest bidder" }),
            /* @__PURE__ */ jsxs("div", { className: "ld-bidbox", children: [
              /* @__PURE__ */ jsxs("div", { className: "ld-steppers", children: [
                /* @__PURE__ */ jsx("button", { type: "button", onClick: () => setAmount((a) => Math.max(min, a - increment(lot.currentBid || lot.startingBid))), children: "−" }),
                /* @__PURE__ */ jsx("div", { className: "ld-amt", children: money(amount) }),
                /* @__PURE__ */ jsx("button", { type: "button", onClick: () => setAmount((a) => a + increment(lot.currentBid || lot.startingBid)), children: "+" })
              ] }),
              /* @__PURE__ */ jsx("button", { className: "ld-place", disabled: leading || busy, onClick: submit, children: "Place bid" })
            ] })
          ] }),
          lot.status === "sold" && leading && /* @__PURE__ */ jsxs("button", { className: "ld-place mt-3", type: "button", disabled: busy, onClick: payHammer, children: [
            "Pay hammer + premium (",
            money(prem.total),
            ")"
          ] }),
          msg && /* @__PURE__ */ jsx("div", { className: "ld-msg", children: msg }),
          /* @__PURE__ */ jsx("div", { className: "ld-premium", children: /* @__PURE__ */ jsxs("div", { className: "ld-row total", children: [
            /* @__PURE__ */ jsx("span", { children: "Total to pay (if you win)" }),
            /* @__PURE__ */ jsx("b", { children: money(prem.total) })
          ] }) })
        ] }),
        bids.length > 0 && /* @__PURE__ */ jsxs("div", { className: "ld-history", children: [
          /* @__PURE__ */ jsx("div", { className: "ld-history-t", children: "Bid history" }),
          bids.map((b) => /* @__PURE__ */ jsxs("div", { className: "ld-hist-row", children: [
            /* @__PURE__ */ jsx("span", { children: b.bidderName }),
            /* @__PURE__ */ jsx("span", { children: money(b.amount) })
          ] }, b.id))
        ] })
      ] })
    ] })
  ] });
}
export {
  AuctionFloor as component
};
