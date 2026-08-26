import { jsxs, jsx } from "react/jsx-runtime";
import { useNavigate, Link } from "@tanstack/react-router";
import { R as Route, u as useServerFn } from "./router-9tDYEkuI.js";
import { useState, useEffect, useMemo } from "react";
import { s as supabase } from "./client-BWo_yy_6.js";
import { r as recordEntryClick } from "./entry-clicks.functions-BBu2nu3J.js";
import { u as useSessionId } from "./use-session-id-CT-VEwIH.js";
import { l as localImageForKey } from "./local-image-assets-D5XLRts7.js";
import { l as listListings, a as listMyThreads, o as openThread, c as closeListing, g as getThread, s as sendMessage, r as requestBrokerage, b as getBrokerFee, d as createListing } from "./lounge.functions-CDxFxdXa.js";
import { c as createSsrRpc } from "./createSsrRpc-Def-olcZ.js";
import { c as createServerFn } from "./server-xISFJUTE.js";
import { z } from "zod";
import { r as requireSupabaseAuth } from "./auth-middleware-DPJJ5M9W.js";
import { i as initializePayment } from "./payments.functions-BxN3htHl.js";
import { toast } from "sonner";
import "@tanstack/react-query";
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
const getThreadEscrow = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  threadId: z.string().uuid()
}).parse(d)).handler(createSsrRpc("33dc219817f7d40be8233f2d5bda09c52568e9c84b28d741d541c46595e3f451"));
createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  escrowId: z.string().uuid(),
  reason: z.string().max(500).optional()
}).parse(d)).handler(createSsrRpc("241347fef28da0e4d9ff284121bb809a9c40b4cf2563ca2e58673f8749c48abd"));
createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).handler(createSsrRpc("245b08c040b18592f107767052e20c202003e4712820222ecbe54ce785e5a7e3"));
function LoungePage() {
  const search = Route.useSearch();
  const [authed, setAuthed] = useState(null);
  const [userId, setUserId] = useState(null);
  const [entered, setEntered] = useState(false);
  const navigate = useNavigate();
  const sessionId = useSessionId();
  const recordClick = useServerFn(recordEntryClick);
  useEffect(() => {
    const {
      data: sub
    } = supabase.auth.onAuthStateChange((_e, s) => {
      setAuthed(!!s);
      setUserId(s?.user?.id ?? null);
    });
    supabase.auth.getSession().then(({
      data
    }) => {
      setAuthed(!!data.session);
      setUserId(data.session?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 50);
    return () => clearTimeout(t);
  }, []);
  return /* @__PURE__ */ jsxs("div", { className: "fixed inset-0 z-0 overflow-hidden bg-black", children: [
    /* @__PURE__ */ jsx("div", { className: `absolute inset-y-0 left-0 z-20 w-1/2 border-r border-amber-500/30 bg-gradient-to-r from-black via-zinc-900 to-stone-800 transition-transform duration-[1200ms] ease-[cubic-bezier(0.65,0,0.35,1)] ${entered ? "-translate-x-full" : "translate-x-0"}`, children: /* @__PURE__ */ jsx("div", { className: "absolute right-0 top-1/2 h-24 w-1 -translate-y-1/2 rounded-l bg-amber-400/60" }) }),
    /* @__PURE__ */ jsx("div", { className: `absolute inset-y-0 right-0 z-20 w-1/2 border-l border-amber-500/30 bg-gradient-to-l from-black via-zinc-900 to-stone-800 transition-transform duration-[1200ms] ease-[cubic-bezier(0.65,0,0.35,1)] ${entered ? "translate-x-full" : "translate-x-0"}`, children: /* @__PURE__ */ jsx("div", { className: "absolute left-0 top-1/2 h-24 w-1 -translate-y-1/2 rounded-r bg-amber-400/60" }) }),
    /* @__PURE__ */ jsxs("div", { className: `relative z-10 h-full w-full overflow-auto bg-gradient-to-b from-stone-900 via-zinc-950 to-black text-stone-100 transition-opacity duration-700 ${entered ? "opacity-100" : "opacity-0"}`, children: [
      /* @__PURE__ */ jsxs("div", { className: "sticky top-0 z-30 flex items-center justify-between border-b border-amber-400/20 bg-black/70 px-3 py-2.5 backdrop-blur sm:px-4 sm:py-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
          /* @__PURE__ */ jsx("p", { className: "text-[10px] uppercase tracking-[0.3em] text-amber-400 sm:text-[11px]", children: "Sale Lounge" }),
          /* @__PURE__ */ jsx("h1", { className: "font-display text-lg text-amber-100 sm:text-xl md:text-2xl truncate", children: "Welcome inside." })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-2", children: [
          /* @__PURE__ */ jsx("button", { onClick: () => window.location.reload(), className: "rounded-md border border-amber-400/40 px-3 py-1.5 text-[11px] text-amber-200 hover:bg-amber-400/10", title: "Reload page", children: "↻ Refresh" }),
          /* @__PURE__ */ jsx(Link, { to: "/studio", onClick: () => {
            if (!sessionId) return;
            recordClick({
              data: {
                entry_point: "stage_virtually",
                location: "lounge_header",
                session_id: sessionId,
                user_id: userId
              }
            }).catch(() => {
            });
          }, className: "rounded-md border border-emerald-400/40 bg-emerald-400/5 px-3 py-2 text-xs font-medium text-emerald-200 hover:bg-emerald-400/10 min-h-[40px] flex items-center sm:min-h-0", children: "Stage virtually →" }),
          /* @__PURE__ */ jsx(Link, { to: "/", className: "rounded-md border border-amber-400/40 px-3 py-1.5 text-[11px] text-amber-200 hover:bg-amber-400/10", children: "← Back" })
        ] })
      ] }),
      authed === null ? /* @__PURE__ */ jsx("div", { className: "p-10 text-center text-stone-400", children: "Opening doors…" }) : !authed ? /* @__PURE__ */ jsx(SignInGate, { onSignIn: () => navigate({
        to: "/login"
      }) }) : /* @__PURE__ */ jsx(LoungeInterior, { initialTab: search.tab })
    ] })
  ] });
}
function SignInGate({
  onSignIn
}) {
  return /* @__PURE__ */ jsxs("div", { className: "mx-auto mt-16 max-w-md rounded-lg border border-amber-400/20 bg-white/5 p-8 text-center backdrop-blur", children: [
    /* @__PURE__ */ jsx("h2", { className: "font-display text-2xl text-amber-100", children: "Members only" }),
    /* @__PURE__ */ jsx("p", { className: "mt-3 text-sm text-stone-300", children: "The lounge is reserved for registered members buying or selling art. Sign in to view private listings, message owners, and request brokerage with verification, delivery monitoring, and a certificate of authenticity." }),
    /* @__PURE__ */ jsx("button", { onClick: onSignIn, className: "mt-6 rounded-md bg-amber-400 px-5 py-2.5 text-sm font-medium text-black hover:bg-amber-300", children: "Sign in to enter" })
  ] });
}
function LoungeInterior({
  initialTab
}) {
  const fetchListings = useServerFn(listListings);
  const fetchThreads = useServerFn(listMyThreads);
  const openThreadFn = useServerFn(openThread);
  const closeListingFn = useServerFn(closeListing);
  const [tab, setTab] = useState("sell");
  const [listings, setListings] = useState([]);
  const [threads, setThreads] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [showCreate, setShowCreate] = useState(null);
  const [me, setMe] = useState(null);
  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);
  useEffect(() => {
    supabase.auth.getUser().then(({
      data
    }) => setMe(data.user?.id ?? null));
  }, []);
  const refreshListings = () => {
    fetchListings({
      data: {
        type: tab === "threads" ? "all" : tab
      }
    }).then(setListings).catch(() => {
    });
  };
  const refreshThreads = () => {
    fetchThreads().then(setThreads).catch(() => {
    });
  };
  useEffect(() => {
    if (tab === "threads") refreshThreads();
    else refreshListings();
  }, [tab]);
  const filtered = useMemo(() => listings.filter((l) => tab === "threads" || l.type === tab), [listings, tab]);
  return /* @__PURE__ */ jsxs("div", { className: "grid h-[calc(100vh-72px)] grid-cols-1 md:grid-cols-[360px_1fr]", children: [
    /* @__PURE__ */ jsxs("aside", { className: "overflow-y-auto border-r border-amber-400/10 bg-black/40 p-3", children: [
      /* @__PURE__ */ jsx("div", { className: "mb-3 flex gap-1 rounded-md border border-amber-400/20 p-1 text-xs", children: [["sell", "Selling"], ["buy", "Buying"], ["threads", "My chats"]].map(([k, label]) => /* @__PURE__ */ jsx("button", { onClick: () => setTab(k), className: `flex-1 rounded px-2 py-1.5 ${tab === k ? "bg-amber-400 text-black" : "text-stone-300 hover:bg-white/5"}`, children: label }, k)) }),
      tab !== "threads" && /* @__PURE__ */ jsxs("button", { onClick: () => setShowCreate(tab), className: "mb-3 w-full rounded-md border border-amber-400/40 px-3 py-2 text-xs font-medium text-amber-200 hover:bg-amber-400/10", children: [
        "+ Post ",
        tab === "sell" ? "a piece for sale" : "a piece you're looking for"
      ] }),
      tab === "threads" ? /* @__PURE__ */ jsx(ThreadList, { threads, activeId: activeThreadId, onPick: setActiveThreadId }) : /* @__PURE__ */ jsx(ListingList, { listings: filtered, me, onMessage: async (listingId) => {
        try {
          const {
            id
          } = await openThreadFn({
            data: {
              listing_id: listingId
            }
          });
          setActiveThreadId(id);
          setTab("threads");
          refreshThreads();
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Something went wrong");
        }
      }, onClose: async (id) => {
        try {
          await closeListingFn({
            data: {
              id
            }
          });
          refreshListings();
          toast.success("Listing closed");
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Something went wrong");
        }
      } })
    ] }),
    /* @__PURE__ */ jsx("section", { className: "overflow-hidden bg-zinc-950/40", children: activeThreadId && tab === "threads" ? /* @__PURE__ */ jsx(ThreadView, { threadId: activeThreadId, onChanged: refreshThreads }) : /* @__PURE__ */ jsx(EmptyState, {}) }),
    showCreate && /* @__PURE__ */ jsx(CreateListingModal, { kind: showCreate, onClose: () => setShowCreate(null), onCreated: () => {
      setShowCreate(null);
      refreshListings();
    } })
  ] });
}
function EmptyState() {
  return /* @__PURE__ */ jsx("div", { className: "flex h-full items-center justify-center p-10 text-center text-sm text-stone-500", children: "Pick a listing on the left to start a private chat, or open “My chats” to continue an existing conversation." });
}
function ListingList({
  listings,
  me,
  onMessage,
  onClose
}) {
  if (!listings.length) return /* @__PURE__ */ jsx("p", { className: "px-2 py-6 text-center text-xs text-stone-500", children: "No open listings yet." });
  return /* @__PURE__ */ jsx("ul", { className: "space-y-2", children: listings.map((l, index) => /* @__PURE__ */ jsx("li", { className: "rounded-md border border-white/5 bg-white/[0.03] p-3", children: /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-3", children: [
    /* @__PURE__ */ jsx("img", { src: localImageForKey(l.id || l.title, index), alt: "", className: "h-14 w-14 rounded object-cover" }),
    /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx("span", { className: `rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${l.type === "sell" ? "bg-emerald-500/20 text-emerald-300" : "bg-sky-500/20 text-sky-300"}`, children: l.type === "sell" ? "Selling" : "Looking" }),
        /* @__PURE__ */ jsx("span", { className: "truncate font-display text-sm text-amber-100", children: l.title })
      ] }),
      /* @__PURE__ */ jsxs("p", { className: "mt-1 text-xs text-stone-400", children: [
        l.member_name,
        " · ",
        l.medium || "—",
        " ·",
        " ",
        l.price != null ? `${l.currency} ${l.price}` : "open"
      ] }),
      l.notes && /* @__PURE__ */ jsx("p", { className: "mt-1 line-clamp-2 text-xs text-stone-400", children: l.notes }),
      /* @__PURE__ */ jsx("div", { className: "mt-2 flex gap-2", children: l.member_id === me ? /* @__PURE__ */ jsx("button", { onClick: () => onClose(l.id), className: "rounded border border-stone-600 px-2 py-1 text-[11px] text-stone-300 hover:bg-white/5", children: "Close listing" }) : /* @__PURE__ */ jsx("button", { onClick: () => onMessage(l.id), className: "rounded bg-amber-400 px-2.5 py-1 text-[11px] font-medium text-black hover:bg-amber-300", children: "Message" }) })
    ] })
  ] }) }, l.id)) });
}
function ThreadList({
  threads,
  activeId,
  onPick
}) {
  if (!threads.length) return /* @__PURE__ */ jsx("p", { className: "px-2 py-6 text-center text-xs text-stone-500", children: "No conversations yet." });
  return /* @__PURE__ */ jsx("ul", { className: "space-y-1", children: threads.map((t) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs("button", { onClick: () => onPick(t.id), className: `w-full rounded-md border px-3 py-2 text-left text-xs ${activeId === t.id ? "border-amber-400/60 bg-amber-400/10" : "border-white/5 bg-white/[0.03] hover:bg-white/5"}`, children: [
    /* @__PURE__ */ jsx("div", { className: "font-display text-sm text-amber-100", children: t.listing?.title ?? "(listing removed)" }),
    /* @__PURE__ */ jsxs("div", { className: "text-stone-400", children: [
      "with ",
      t.other_name,
      " · you are ",
      t.you_are
    ] })
  ] }) }, t.id)) });
}
function CreateListingModal({
  kind,
  onClose,
  onCreated
}) {
  const create = useServerFn(createListing);
  const [title, setTitle] = useState("");
  const [medium, setMedium] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await create({
        data: {
          type: kind,
          title,
          medium: medium || null,
          price: price ? Number(price) : null,
          currency,
          notes: notes || null
        }
      });
      toast.success("Listing posted");
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };
  return /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4", onClick: onClose, children: /* @__PURE__ */ jsxs("form", { onClick: (e) => e.stopPropagation(), onSubmit: submit, className: "w-full max-w-md space-y-3 rounded-lg border border-amber-400/30 bg-stone-900 p-5 text-sm text-stone-100", children: [
    /* @__PURE__ */ jsx("h3", { className: "font-display text-lg text-amber-100", children: kind === "sell" ? "Post a piece for sale" : "Post a piece you're looking for" }),
    /* @__PURE__ */ jsx("input", { required: true, value: title, onChange: (e) => setTitle(e.target.value), placeholder: "Title", className: "w-full rounded border border-white/10 bg-black/40 px-3 py-2" }),
    /* @__PURE__ */ jsx("input", { value: medium, onChange: (e) => setMedium(e.target.value), placeholder: "Medium (e.g. Oil on canvas)", className: "w-full rounded border border-white/10 bg-black/40 px-3 py-2" }),
    /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
      /* @__PURE__ */ jsx("input", { value: price, onChange: (e) => setPrice(e.target.value), type: "number", min: "0", placeholder: kind === "sell" ? "Asking price" : "Budget", className: "flex-1 rounded border border-white/10 bg-black/40 px-3 py-2" }),
      /* @__PURE__ */ jsx("input", { value: currency, onChange: (e) => setCurrency(e.target.value.toUpperCase()), maxLength: 4, className: "w-20 rounded border border-white/10 bg-black/40 px-3 py-2" })
    ] }),
    /* @__PURE__ */ jsx("textarea", { value: notes, onChange: (e) => setNotes(e.target.value), placeholder: "Notes (provenance, condition, what you're after…)", rows: 3, className: "w-full rounded border border-white/10 bg-black/40 px-3 py-2" }),
    /* @__PURE__ */ jsxs("div", { className: "flex justify-end gap-2", children: [
      /* @__PURE__ */ jsx("button", { type: "button", onClick: onClose, className: "rounded border border-white/20 px-3 py-1.5 text-xs", children: "Cancel" }),
      /* @__PURE__ */ jsx("button", { disabled: busy, className: "rounded bg-amber-400 px-3 py-1.5 text-xs font-medium text-black disabled:opacity-50", children: busy ? "Posting…" : "Post" })
    ] })
  ] }) });
}
function ThreadView({
  threadId,
  onChanged
}) {
  const fetchThread = useServerFn(getThread);
  const send = useServerFn(sendMessage);
  const reqBroker = useServerFn(requestBrokerage);
  const fetchFee = useServerFn(getBrokerFee);
  const fetchEscrow = useServerFn(getThreadEscrow);
  const payFn = useServerFn(initializePayment);
  const [detail, setDetail] = useState(null);
  const [escrow, setEscrow] = useState(null);
  const [body, setBody] = useState("");
  const [showBrokerForm, setShowBrokerForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [fee, setFee] = useState(5);
  const [paying, setPaying] = useState(false);
  const refresh = () => fetchThread({
    data: {
      thread_id: threadId
    }
  }).then(setDetail).catch(() => {
  });
  const refreshEscrow = () => fetchEscrow({
    data: {
      threadId
    }
  }).then(setEscrow).catch(() => setEscrow(null));
  useEffect(() => {
    refresh();
    refreshEscrow();
    fetchFee().then((f) => setFee(f.fee_percent));
  }, [threadId]);
  useEffect(() => {
    const ch = supabase.channel(`thread:${threadId}`).on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "messages",
      filter: `thread_id=eq.${threadId}`
    }, () => refresh()).on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "broker_requests",
      filter: `thread_id=eq.${threadId}`
    }, () => refresh()).subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [threadId]);
  if (!detail) return /* @__PURE__ */ jsx("div", { className: "p-10 text-center text-sm text-stone-500", children: "Loading…" });
  const {
    listing,
    messages,
    broker_request,
    other_name
  } = detail;
  const meId = detail.thread.buyer_id === detail.thread.seller_id ? null : detail.thread.you_are === "buyer" ? detail.thread.buyer_id : detail.thread.seller_id;
  const isBuyer = detail.thread.you_are === "buyer";
  const canEscrow = isBuyer && listing?.type === "sell" && listing.price != null && Number(listing.price) > 0 && !escrow;
  const onEscrowPay = async () => {
    if (!listing?.price || !listing.id) return;
    setPaying(true);
    try {
      const amountNgn = Math.round(Number(listing.price));
      const res = await payFn({
        data: {
          purpose: "artwork_purchase",
          amountNgn,
          metadata: {
            escrow: "true",
            thread_id: threadId,
            listing_id: listing.id,
            seller_id: detail.thread.seller_id,
            title: listing.title ?? ""
          }
        }
      });
      if (res.authorizationUrl) window.location.href = res.authorizationUrl;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Escrow payment failed");
    } finally {
      setPaying(false);
    }
  };
  const onSend = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    const text = body;
    setBody("");
    try {
      await send({
        data: {
          thread_id: threadId,
          body: text
        }
      });
      refresh();
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
      setBody(text);
    }
  };
  const submitBroker = async (e) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("Enter a positive amount");
    try {
      await reqBroker({
        data: {
          thread_id: threadId,
          transaction_amount: amt,
          currency: listing?.currency || "USD"
        }
      });
      toast.success("Brokerage requested — an admin will review.");
      setShowBrokerForm(false);
      setAmount("");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  };
  return /* @__PURE__ */ jsxs("div", { className: "flex h-full flex-col", children: [
    /* @__PURE__ */ jsxs("header", { className: "border-b border-white/10 p-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-3", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-[10px] uppercase tracking-widest text-amber-400", children: "Conversation" }),
          /* @__PURE__ */ jsx("h2", { className: "font-display text-lg text-amber-100", children: listing?.title ?? "(listing removed)" }),
          /* @__PURE__ */ jsxs("p", { className: "text-xs text-stone-400", children: [
            "with ",
            other_name,
            " ·",
            " ",
            listing ? `${listing.type === "sell" ? "Selling" : "Looking"} · ${listing.price != null ? `${listing.currency} ${listing.price}` : "open price"}` : ""
          ] })
        ] }),
        /* @__PURE__ */ jsx(BrokerPanel, { request: broker_request, fee, onAsk: () => setShowBrokerForm(true) })
      ] }),
      escrow && /* @__PURE__ */ jsxs("div", { className: "mt-3 rounded border border-emerald-400/30 bg-emerald-400/5 p-3 text-xs text-emerald-100", children: [
        "Escrow hold: ₦",
        Number(escrow.amount_ngn).toLocaleString(),
        " · ",
        String(escrow.status)
      ] }),
      canEscrow && /* @__PURE__ */ jsxs("div", { className: "mt-3 flex items-center gap-2", children: [
        /* @__PURE__ */ jsx("button", { type: "button", disabled: paying, onClick: onEscrowPay, className: "rounded bg-emerald-500 px-3 py-1.5 text-xs font-medium text-black disabled:opacity-50", children: paying ? "Redirecting…" : `Pay via escrow · ${listing?.currency} ${listing?.price}` }),
        /* @__PURE__ */ jsx("span", { className: "text-[10px] text-stone-500", children: "Funds held until admin release" })
      ] }),
      showBrokerForm && /* @__PURE__ */ jsxs("form", { onSubmit: submitBroker, className: "mt-3 flex flex-wrap items-end gap-2 rounded border border-amber-400/30 bg-amber-400/5 p-3 text-xs", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "block text-[10px] uppercase tracking-wider text-amber-300", children: "Agreed amount" }),
          /* @__PURE__ */ jsx("input", { type: "number", min: "0", value: amount, onChange: (e) => setAmount(e.target.value), className: "mt-1 rounded border border-white/10 bg-black/40 px-2 py-1 text-sm", placeholder: "0.00" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "text-stone-300", children: [
          "Fee at ",
          /* @__PURE__ */ jsxs("strong", { children: [
            fee,
            "%"
          ] }),
          " = ",
          listing?.currency || "USD",
          " ",
          (Number(amount || 0) * fee / 100).toFixed(2)
        ] }),
        /* @__PURE__ */ jsx("button", { className: "ml-auto rounded bg-amber-400 px-3 py-1.5 text-black", children: "Submit request" }),
        /* @__PURE__ */ jsx("button", { type: "button", onClick: () => setShowBrokerForm(false), className: "rounded border border-white/20 px-3 py-1.5", children: "Cancel" })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "flex-1 overflow-y-auto p-4", children: /* @__PURE__ */ jsxs("ul", { className: "space-y-2", children: [
      messages.map((m) => {
        const mine = m.sender_id === meId;
        return /* @__PURE__ */ jsx("li", { className: `flex ${mine ? "justify-end" : "justify-start"}`, children: /* @__PURE__ */ jsxs("div", { className: `max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-amber-400 text-black" : "bg-white/10 text-stone-100"}`, children: [
          m.body,
          /* @__PURE__ */ jsx("div", { className: `mt-1 text-[10px] ${mine ? "text-black/60" : "text-stone-400"}`, children: new Date(m.created_at).toLocaleString() })
        ] }) }, m.id);
      }),
      !messages.length && /* @__PURE__ */ jsx("p", { className: "py-10 text-center text-xs text-stone-500", children: "No messages yet — say hello." })
    ] }) }),
    /* @__PURE__ */ jsx("form", { onSubmit: onSend, className: "border-t border-white/10 p-3", children: /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
      /* @__PURE__ */ jsx("input", { value: body, onChange: (e) => setBody(e.target.value), placeholder: "Write a message…", className: "flex-1 rounded border border-white/10 bg-black/40 px-3 py-2 text-sm" }),
      /* @__PURE__ */ jsx("button", { className: "rounded bg-amber-400 px-4 py-2 text-sm font-medium text-black", children: "Send" })
    ] }) })
  ] });
}
function BrokerPanel({
  request,
  fee,
  onAsk
}) {
  if (!request) {
    return /* @__PURE__ */ jsxs("div", { className: "text-right", children: [
      /* @__PURE__ */ jsx("button", { onClick: onAsk, className: "rounded border border-amber-400/40 px-3 py-1.5 text-xs text-amber-200 hover:bg-amber-400/10", children: "Request brokerage" }),
      /* @__PURE__ */ jsxs("p", { className: "mt-1 text-[10px] text-stone-500", children: [
        "Verification · delivery · certificate · ",
        fee,
        "% fee"
      ] })
    ] });
  }
  const labels = {
    requested: "Requested — awaiting admin",
    accepted: "Accepted",
    rejected: "Rejected",
    verified: "Verified",
    in_transit: "In transit",
    delivered: "Delivered",
    certified: "Certified",
    closed: "Closed"
  };
  return /* @__PURE__ */ jsxs("div", { className: "rounded border border-amber-400/30 bg-amber-400/5 p-2 text-right text-xs text-amber-100", children: [
    /* @__PURE__ */ jsx("div", { className: "font-medium", children: labels[request.status] }),
    /* @__PURE__ */ jsxs("div", { className: "text-stone-300", children: [
      request.currency,
      " ",
      Number(request.transaction_amount ?? 0).toFixed(2),
      " · fee",
      " ",
      Number(request.fee_percent ?? 0),
      "% = ",
      Number(request.fee_amount ?? 0).toFixed(2)
    ] }),
    request.carrier && /* @__PURE__ */ jsxs("div", { className: "text-stone-400", children: [
      request.carrier,
      " ",
      request.tracking_ref
    ] }),
    request.certificate_url && /* @__PURE__ */ jsx("a", { href: request.certificate_url, target: "_blank", rel: "noreferrer", className: "mt-1 inline-block rounded bg-amber-400 px-2 py-1 text-[11px] text-black", children: "Download certificate" })
  ] });
}
export {
  LoungePage as component
};
