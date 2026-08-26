import { jsx, jsxs } from "react/jsx-runtime";
import { useNavigate, Link } from "@tanstack/react-router";
import { u as useServerFn } from "./router-9tDYEkuI.js";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { s as supabase } from "./client-BWo_yy_6.js";
import { l as listMyDisputablePayments, o as openDispute } from "./disputes.functions-nHQEURn8.js";
import "@tanstack/react-query";
import "./createSsrRpc-Def-olcZ.js";
import "./server-xISFJUTE.js";
import "node:async_hooks";
import "h3-v2";
import "@tanstack/router-core";
import "seroval";
import "@tanstack/history";
import "@tanstack/router-core/ssr/client";
import "@tanstack/router-core/ssr/server";
import "@tanstack/react-router/ssr/server";
import "zod";
import "./auth-middleware-DPJJ5M9W.js";
import "@supabase/supabase-js";
import "@tanstack/zod-adapter";
import "ai";
import "@ai-sdk/openai-compatible";
import "node:crypto";
import "jose";
import "./client.server-D5ro3rAQ.js";
const PURPOSE_LABELS = {
  artwork_purchase: "Artwork purchase",
  auction_settlement: "Auction settlement",
  brokerage_fee: "Brokerage fee",
  collateral_fee: "Collateral fee"
};
function DisputesPage() {
  const navigate = useNavigate();
  const listFn = useServerFn(listMyDisputablePayments);
  const openFn = useServerFn(openDispute);
  const [authed, setAuthed] = useState(null);
  const [payments, setPayments] = useState(null);
  const [disputing, setDisputing] = useState(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({
      data
    }) => {
      setAuthed(!!data.session);
      if (!data.session) navigate({
        to: "/login"
      });
    });
  }, [navigate]);
  const refresh = () => listFn().then(setPayments).catch(() => setPayments([]));
  useEffect(() => {
    if (authed) refresh();
  }, [authed]);
  const submit = async (paymentId) => {
    setBusy(true);
    try {
      await openFn({
        data: {
          paymentId,
          reason
        }
      });
      toast.success("Dispute opened — our team will review and contact you.");
      setDisputing(null);
      setReason("");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not open dispute");
    } finally {
      setBusy(false);
    }
  };
  if (authed === null || authed && payments === null) {
    return /* @__PURE__ */ jsx("div", { className: "p-10 text-center text-muted-foreground", children: "Loading…" });
  }
  return /* @__PURE__ */ jsxs("div", { className: "mx-auto min-h-screen max-w-2xl px-6 py-10", children: [
    /* @__PURE__ */ jsx(Link, { to: "/", className: "text-sm text-primary underline", children: "← MyAfriart" }),
    /* @__PURE__ */ jsx("h1", { className: "mt-6 font-display text-3xl", children: "Payments & disputes" }),
    /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: "If a purchase went wrong — the work never arrived, arrived damaged, or isn't as described — open a dispute. Escrow funds are frozen while a dispute is under review." }),
    /* @__PURE__ */ jsxs("div", { className: "mt-8 space-y-4", children: [
      (payments ?? []).map((p) => {
        const meta = p.metadata ?? {};
        return /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-border p-4 text-sm", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-start justify-between gap-2", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsxs("p", { className: "font-medium", children: [
                PURPOSE_LABELS[p.purpose] ?? p.purpose,
                meta.title ? ` — ${meta.title}` : ""
              ] }),
              /* @__PURE__ */ jsxs("p", { className: "text-muted-foreground", children: [
                "₦",
                Number(p.amount_ngn).toLocaleString(),
                " ·",
                " ",
                new Date(p.created_at).toLocaleDateString(),
                " · ref ",
                p.provider_ref
              ] })
            ] }),
            /* @__PURE__ */ jsx("span", { className: `rounded px-2 py-0.5 text-xs uppercase tracking-wide ${p.status === "refunded" ? "bg-sky-500/15 text-sky-700" : "bg-emerald-500/15 text-emerald-700"}`, children: p.status })
          ] }),
          p.dispute ? /* @__PURE__ */ jsxs("div", { className: "mt-3 rounded border border-border bg-muted/40 p-3", children: [
            /* @__PURE__ */ jsxs("p", { className: "text-xs font-semibold uppercase tracking-wide text-muted-foreground", children: [
              "Dispute · ",
              p.dispute.status
            ] }),
            /* @__PURE__ */ jsx("p", { className: "mt-1", children: p.dispute.reason }),
            p.dispute.resolution && /* @__PURE__ */ jsxs("p", { className: "mt-2 text-muted-foreground", children: [
              /* @__PURE__ */ jsx("strong", { children: "Outcome:" }),
              " ",
              p.dispute.resolution
            ] })
          ] }) : p.status === "succeeded" ? disputing === p.id ? /* @__PURE__ */ jsxs("div", { className: "mt-3 space-y-2", children: [
            /* @__PURE__ */ jsx("textarea", { value: reason, onChange: (e) => setReason(e.target.value), rows: 3, placeholder: "What went wrong? Include dates, condition on arrival, and what outcome you want (min 20 characters).", className: "w-full rounded-md border border-input bg-background px-3 py-2 text-sm" }),
            /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
              /* @__PURE__ */ jsx("button", { disabled: busy || reason.trim().length < 20, onClick: () => submit(p.id), className: "rounded-md bg-destructive px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50", children: busy ? "Submitting…" : "Open dispute" }),
              /* @__PURE__ */ jsx("button", { onClick: () => {
                setDisputing(null);
                setReason("");
              }, className: "rounded-md border border-border px-3 py-1.5 text-xs", children: "Cancel" })
            ] })
          ] }) : /* @__PURE__ */ jsx("button", { onClick: () => setDisputing(p.id), className: "mt-3 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted", children: "Report a problem" }) : null
        ] }, p.id);
      }),
      (payments ?? []).length === 0 && /* @__PURE__ */ jsx("p", { className: "rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground", children: "No completed payments yet. Purchases you make will appear here." })
    ] })
  ] });
}
export {
  DisputesPage as component
};
