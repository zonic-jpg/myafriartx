import { jsx, jsxs } from "react/jsx-runtime";
import { useNavigate, Link } from "@tanstack/react-router";
import { u as useServerFn, l as listMyReels } from "./router-9tDYEkuI.js";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
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
function InboxPage() {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState(null);
  useEffect(() => {
    const {
      data: sub
    } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));
    supabase.auth.getSession().then(({
      data: data2
    }) => setAuthed(!!data2.session));
    return () => sub.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (authed === false) navigate({
      to: "/login"
    });
  }, [authed, navigate]);
  const list = useServerFn(listMyReels);
  const {
    data
  } = useQuery({
    queryKey: ["notify", "reels"],
    queryFn: () => list(),
    enabled: !!authed
  });
  if (!authed) return /* @__PURE__ */ jsx("div", { className: "flex min-h-screen items-center justify-center text-muted-foreground", children: "Loading…" });
  const reels = data?.reels ?? [];
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-background", children: [
    /* @__PURE__ */ jsx("header", { className: "border-b border-border", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto flex max-w-3xl items-center justify-between px-6 py-4", children: [
      /* @__PURE__ */ jsx(Link, { to: "/", className: "font-display text-xl", children: "MyAfriart" }),
      /* @__PURE__ */ jsxs("nav", { className: "flex items-center gap-4 text-sm", children: [
        /* @__PURE__ */ jsx(Link, { to: "/notify", className: "text-muted-foreground hover:text-foreground", children: "Settings" }),
        /* @__PURE__ */ jsx(Link, { to: "/studio", className: "text-muted-foreground hover:text-foreground", children: "Studio" })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxs("main", { className: "mx-auto max-w-3xl px-6 py-10", children: [
      /* @__PURE__ */ jsx("h1", { className: "font-display text-3xl", children: "Your reels" }),
      reels.length === 0 ? /* @__PURE__ */ jsxs("p", { className: "mt-6 text-sm text-muted-foreground", children: [
        "No reels yet.",
        " ",
        /* @__PURE__ */ jsx(Link, { to: "/notify", className: "underline", children: "Set up NotifyMe" }),
        " ",
        "to start receiving curated picks."
      ] }) : /* @__PURE__ */ jsx("ul", { className: "mt-6 divide-y divide-border rounded-lg border border-border", children: reels.map((r) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(Link, { to: "/notify/reel/$id", params: {
        id: r.id
      }, className: "flex items-center justify-between gap-4 px-5 py-4 hover:bg-accent", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("div", { className: "font-medium", children: "Reel · 12 panes" }),
          /* @__PURE__ */ jsxs("div", { className: "text-xs text-muted-foreground", children: [
            new Date(r.created_at).toLocaleString(),
            " · ",
            r.status
          ] })
        ] }),
        !r.viewed_at && /* @__PURE__ */ jsx("span", { className: "rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground", children: "new" })
      ] }) }, r.id)) })
    ] })
  ] });
}
export {
  InboxPage as component
};
