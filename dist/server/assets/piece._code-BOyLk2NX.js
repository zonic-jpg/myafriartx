import { jsxs, jsx } from "react/jsx-runtime";
import { j as Route, p as pieceQuery, u as useServerFn, k as bumpView } from "./router-9tDYEkuI.js";
import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { i as initializePayment } from "./payments.functions-BxN3htHl.js";
import { s as supabase } from "./client-BWo_yy_6.js";
import "sonner";
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
function PieceDetailPage() {
  const {
    code
  } = Route.useParams();
  const {
    data
  } = useSuspenseQuery(pieceQuery(code));
  const bump = useServerFn(bumpView);
  const payFn = useServerFn(initializePayment);
  const [buyMsg, setBuyMsg] = useState("");
  const [buying, setBuying] = useState(false);
  useEffect(() => {
    if (data?.piece?.id) bump({
      data: {
        target: "artworks",
        id: data.piece.id
      }
    }).catch(() => {
    });
  }, [data?.piece?.id]);
  const p = data?.piece;
  if (!p) {
    return /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-2xl p-8 text-center", children: [
      /* @__PURE__ */ jsxs("p", { className: "text-muted-foreground", children: [
        'No piece matches "',
        code,
        '".'
      ] }),
      /* @__PURE__ */ jsx(Link, { to: "/", className: "mt-4 inline-block text-sm underline", children: "Back to catalogue" })
    ] });
  }
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-background text-foreground", children: [
    /* @__PURE__ */ jsx("header", { className: "border-b border-border bg-gradient-to-r from-purple-600 to-red-500 text-white", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6", children: [
      /* @__PURE__ */ jsx(Link, { to: "/", className: "font-display text-lg", children: "MyAfriart" }),
      /* @__PURE__ */ jsx(Link, { to: "/", className: "text-sm text-white/80 hover:text-white", children: "← Back to catalogue" })
    ] }) }),
    /* @__PURE__ */ jsxs("main", { className: "mx-auto grid max-w-5xl gap-8 px-4 py-8 sm:px-6 md:grid-cols-2", children: [
      /* @__PURE__ */ jsx("div", { className: "aspect-[4/5] overflow-hidden rounded-lg border border-border bg-muted md:aspect-auto md:max-h-[75vh]", children: p.image_url && /* @__PURE__ */ jsx("img", { src: p.image_url, alt: p.title, className: "h-full w-full object-contain" }) }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs("p", { className: "text-xs uppercase tracking-wider text-muted-foreground", children: [
            p.short_code,
            " · UUID ",
            p.id
          ] }),
          /* @__PURE__ */ jsx("h1", { className: "font-display text-3xl", children: p.title }),
          p.artist && /* @__PURE__ */ jsxs(Link, { to: "/artist/$code", params: {
            code: p.artist.short_code ?? ""
          }, className: "mt-1 inline-block text-sm text-primary underline", children: [
            "by ",
            p.artist.name,
            " (",
            p.artist.country,
            ")"
          ] })
        ] }),
        /* @__PURE__ */ jsxs("dl", { className: "grid grid-cols-2 gap-3 text-sm", children: [
          /* @__PURE__ */ jsx(Row, { label: "Status", value: p.lifecycle_status }),
          /* @__PURE__ */ jsx(Row, { label: "Medium", value: p.medium }),
          /* @__PURE__ */ jsx(Row, { label: "Year", value: p.year ?? "—" }),
          /* @__PURE__ */ jsx(Row, { label: "Price", value: p.price != null ? `${p.currency} ${Number(p.price).toLocaleString()}` : "—" }),
          /* @__PURE__ */ jsx(Row, { label: "Views", value: String(p.view_count ?? 0) }),
          /* @__PURE__ */ jsx(Row, { label: "Date loaded", value: p.created_at ? new Date(p.created_at).toLocaleDateString() : "—" }),
          /* @__PURE__ */ jsx(Row, { label: "Last updated", value: p.updated_at ? new Date(p.updated_at).toLocaleDateString() : "—" }),
          /* @__PURE__ */ jsx(Row, { label: "Source", value: p.content_source })
        ] }),
        p.description && /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-xs font-semibold uppercase tracking-wider text-muted-foreground", children: "Description" }),
          /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm leading-relaxed", children: p.description })
        ] }),
        p.is_pledged && /* @__PURE__ */ jsx("div", { className: "rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900", children: "This work is pledged as collateral and cannot be purchased until the lien is released." }),
        p.price != null && Number(p.price) > 0 && !p.is_pledged && /* @__PURE__ */ jsxs("div", { className: "space-y-2 rounded-xl border border-border p-4", children: [
          /* @__PURE__ */ jsx("p", { className: "text-sm font-medium", children: "Acquire this work" }),
          /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-2", children: [
            /* @__PURE__ */ jsx("button", { type: "button", disabled: buying, className: "rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50", onClick: async () => {
              const {
                data: sess
              } = await supabase.auth.getSession();
              if (!sess.session) {
                setBuyMsg("Sign in to purchase.");
                return;
              }
              setBuying(true);
              setBuyMsg("");
              try {
                const amount = Math.round(Number(p.price));
                const res = await payFn({
                  data: {
                    purpose: "artwork_purchase",
                    amountNgn: amount,
                    metadata: {
                      artwork_id: p.id,
                      short_code: p.short_code ?? code,
                      title: p.title
                    }
                  }
                });
                if (res.authorizationUrl) window.location.href = res.authorizationUrl;
              } catch (e) {
                setBuyMsg(e instanceof Error ? e.message : "Checkout failed");
              } finally {
                setBuying(false);
              }
            }, children: buying ? "Redirecting…" : `Buy now · ${p.currency} ${Number(p.price).toLocaleString()}` }),
            /* @__PURE__ */ jsx(Link, { to: "/lounge", search: {
              tab: "sell"
            }, className: "rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted", children: "Private sale via Lounge" }),
            /* @__PURE__ */ jsx(Link, { to: "/collateral", className: "rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted", children: "Use as collateral" })
          ] }),
          buyMsg && /* @__PURE__ */ jsx("p", { className: "text-xs text-destructive", children: buyMsg })
        ] }),
        Array.isArray(p.dominant_palette) && p.dominant_palette.length > 0 && /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-xs font-semibold uppercase tracking-wider text-muted-foreground", children: "Palette" }),
          /* @__PURE__ */ jsx("div", { className: "mt-1 flex gap-1", children: p.dominant_palette.map((c, i) => /* @__PURE__ */ jsx("span", { className: "h-6 w-6 rounded border border-border", style: {
            backgroundColor: c
          }, title: c }, i)) })
        ] })
      ] })
    ] })
  ] });
}
function Row({
  label,
  value
}) {
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsx("dt", { className: "text-xs uppercase tracking-wider text-muted-foreground", children: label }),
    /* @__PURE__ */ jsx("dd", { className: "mt-0.5 font-medium", children: value })
  ] });
}
export {
  PieceDetailPage as component
};
