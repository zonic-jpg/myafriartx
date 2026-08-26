import { jsx, jsxs } from "react/jsx-runtime";
import { useNavigate, Link } from "@tanstack/react-router";
import { u as useServerFn } from "./router-9tDYEkuI.js";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { s as supabase } from "./client-BWo_yy_6.js";
import { b as getMyRenders } from "./studio-catalog.functions-CC71VM2Z.js";
import { l as localImageForKey } from "./local-image-assets-D5XLRts7.js";
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
function RendersPage() {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState(null);
  useEffect(() => {
    supabase.auth.getSession().then(({
      data
    }) => setAuthed(!!data.session));
  }, []);
  useEffect(() => {
    if (authed === false) navigate({
      to: "/login"
    });
  }, [authed, navigate]);
  if (!authed) return /* @__PURE__ */ jsx("div", { className: "flex min-h-screen items-center justify-center text-muted-foreground", children: "Loading…" });
  return /* @__PURE__ */ jsx(List, {});
}
function List() {
  const fn = useServerFn(getMyRenders);
  const {
    data,
    isLoading
  } = useQuery({
    queryKey: ["my-renders"],
    queryFn: () => fn()
  });
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-background", children: [
    /* @__PURE__ */ jsx("header", { className: "border-b border-border", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto flex max-w-6xl items-center justify-between px-6 py-4", children: [
      /* @__PURE__ */ jsx(Link, { to: "/", className: "font-display text-xl", children: "MyAfriart" }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 text-sm", children: [
        /* @__PURE__ */ jsx("button", { onClick: () => window.location.reload(), className: "text-muted-foreground hover:text-foreground", title: "Reload page", children: "↻ Refresh" }),
        /* @__PURE__ */ jsx(Link, { to: "/studio", className: "text-muted-foreground hover:text-foreground", children: "Studio →" })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxs("main", { className: "mx-auto max-w-6xl px-6 py-10", children: [
      /* @__PURE__ */ jsx("h1", { className: "font-display text-3xl", children: "My renders" }),
      isLoading ? /* @__PURE__ */ jsx("p", { className: "mt-6 text-sm text-muted-foreground", children: "Loading…" }) : (data?.renders ?? []).length === 0 ? /* @__PURE__ */ jsxs("p", { className: "mt-6 text-sm text-muted-foreground", children: [
        "No renders yet.",
        " ",
        /* @__PURE__ */ jsx(Link, { to: "/studio", className: "underline", children: "Stage a room →" })
      ] }) : /* @__PURE__ */ jsx("div", { className: "mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3", children: data.renders.map((r) => /* @__PURE__ */ jsxs("div", { className: "overflow-hidden rounded-md border border-border bg-card", children: [
        r.result_image_url ? /* @__PURE__ */ jsx("img", { src: localImageForKey(r.id), alt: "Render", className: "aspect-[4/3] w-full object-cover" }) : /* @__PURE__ */ jsx("div", { className: "flex aspect-[4/3] w-full items-center justify-center bg-muted text-xs uppercase tracking-wider text-muted-foreground", children: r.status }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between px-3 py-2 text-xs text-muted-foreground", children: [
          /* @__PURE__ */ jsx("span", { children: new Date(r.created_at).toLocaleString() }),
          /* @__PURE__ */ jsx("span", { className: "capitalize", children: r.status })
        ] })
      ] }, r.id)) })
    ] })
  ] });
}
export {
  RendersPage as component
};
