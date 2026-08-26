import { jsxs, jsx } from "react/jsx-runtime";
import { m as Route, n as artistQuery, u as useServerFn, k as bumpView } from "./router-9tDYEkuI.js";
import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import "sonner";
import "./client-BWo_yy_6.js";
import "@supabase/supabase-js";
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
import "@tanstack/zod-adapter";
import "ai";
import "@ai-sdk/openai-compatible";
import "node:crypto";
import "jose";
import "./client.server-D5ro3rAQ.js";
function ArtistDetailPage() {
  const {
    code
  } = Route.useParams();
  const {
    data
  } = useSuspenseQuery(artistQuery(code));
  const bump = useServerFn(bumpView);
  useEffect(() => {
    if (data?.artist?.id) bump({
      data: {
        target: "artists",
        id: data.artist.id
      }
    }).catch(() => {
    });
  }, [data?.artist?.id]);
  const a = data?.artist;
  const works = data?.works ?? [];
  if (!a) {
    return /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-2xl p-8 text-center", children: [
      /* @__PURE__ */ jsxs("p", { className: "text-muted-foreground", children: [
        'No artist matches "',
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
    /* @__PURE__ */ jsxs("main", { className: "mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6", children: [
      /* @__PURE__ */ jsxs("section", { className: "grid gap-6 md:grid-cols-[200px,1fr]", children: [
        /* @__PURE__ */ jsx("div", { className: "aspect-square overflow-hidden rounded-lg border border-border bg-muted", children: a.portrait_url && /* @__PURE__ */ jsx("img", { src: a.portrait_url, alt: a.name, className: "h-full w-full object-contain" }) }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsxs("p", { className: "text-xs uppercase tracking-wider text-muted-foreground", children: [
            a.short_code,
            " · UUID ",
            a.id
          ] }),
          /* @__PURE__ */ jsx("h1", { className: "font-display text-3xl", children: a.name }),
          /* @__PURE__ */ jsxs("p", { className: "text-sm text-muted-foreground", children: [
            [a.country, a.domicile_city].filter(Boolean).join(" · "),
            a.date_of_birth ? ` · b. ${new Date(a.date_of_birth).getFullYear()}` : ""
          ] }),
          a.bio && /* @__PURE__ */ jsx("p", { className: "text-sm leading-relaxed", children: a.bio }),
          /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground", children: [
            "Views: ",
            a.view_count ?? 0
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("section", { children: [
        /* @__PURE__ */ jsxs("h2", { className: "font-display text-2xl", children: [
          "Works (",
          works.length,
          ")"
        ] }),
        works.length === 0 ? /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: "No works listed for this artist yet." }) : /* @__PURE__ */ jsx("div", { className: "mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4", children: works.map((w) => /* @__PURE__ */ jsxs(Link, { to: "/piece/$code", params: {
          code: w.short_code
        }, className: "group block", children: [
          /* @__PURE__ */ jsx("div", { className: "aspect-[4/5] overflow-hidden rounded-md border border-border bg-muted", children: w.image_url && /* @__PURE__ */ jsx("img", { src: w.image_url, alt: w.title, className: "h-full w-full object-contain transition" }) }),
          /* @__PURE__ */ jsx("p", { className: "mt-1 truncate text-sm font-medium", children: w.title }),
          /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground", children: [
            w.short_code,
            " · ",
            w.lifecycle_status
          ] })
        ] }, w.id)) })
      ] })
    ] })
  ] });
}
export {
  ArtistDetailPage as component
};
