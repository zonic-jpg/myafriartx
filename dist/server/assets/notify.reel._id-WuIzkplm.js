import { jsx, jsxs } from "react/jsx-runtime";
import { useParams, useNavigate, Link } from "@tanstack/react-router";
import { u as useServerFn, q as getReel, r as markReelViewed } from "./router-9tDYEkuI.js";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
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
function ReelPage() {
  const {
    id
  } = useParams({
    from: "/notify/reel/$id"
  });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [authed, setAuthed] = useState(null);
  const [idx, setIdx] = useState(0);
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
  const fetchReel = useServerFn(getReel);
  const markViewed = useServerFn(markReelViewed);
  const {
    data
  } = useQuery({
    queryKey: ["notify", "reel", id],
    queryFn: () => fetchReel({
      data: {
        id
      }
    }),
    enabled: !!authed
  });
  const mark = useMutation({
    mutationFn: () => markViewed({
      data: {
        id
      }
    }),
    onSuccess: () => qc.invalidateQueries({
      queryKey: ["notify"]
    })
  });
  useEffect(() => {
    if (data?.reel && !data.reel.viewed_at) mark.mutate();
  }, [data?.reel?.id]);
  if (!authed || !data) return /* @__PURE__ */ jsx("div", { className: "flex min-h-screen items-center justify-center text-muted-foreground", children: "Loading…" });
  if (!data.reel) return /* @__PURE__ */ jsx("div", { className: "flex min-h-screen items-center justify-center text-muted-foreground", children: "Reel not found." });
  const panes = data.panes;
  const total = panes.length;
  const current = panes[idx];
  return /* @__PURE__ */ jsxs("div", { className: "flex min-h-screen flex-col bg-black text-white", children: [
    /* @__PURE__ */ jsxs("header", { className: "flex items-center justify-between border-b border-white/10 px-5 py-3", children: [
      /* @__PURE__ */ jsx(Link, { to: "/notify/inbox", className: "text-sm text-white/70 hover:text-white", children: "← Inbox" }),
      /* @__PURE__ */ jsxs("div", { className: "text-xs text-white/60", children: [
        idx + 1,
        " / ",
        total
      ] }),
      /* @__PURE__ */ jsx(Link, { to: "/notify", className: "text-sm text-white/70 hover:text-white", children: "Settings" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "relative flex flex-1 items-center justify-center overflow-hidden", children: [
      current?.kind === "artwork" && current.artwork && /* @__PURE__ */ jsxs(Link, { to: "/piece/$code", params: {
        code: current.artwork.short_code ?? current.artwork.id
      }, className: "block max-h-full max-w-full", children: [
        /* @__PURE__ */ jsx("img", { src: current.artwork.image_url, alt: current.artwork.title, className: "max-h-[75vh] max-w-[90vw] object-contain" }),
        /* @__PURE__ */ jsxs("div", { className: "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-6", children: [
          /* @__PURE__ */ jsx("div", { className: "font-display text-2xl", children: current.artwork.title }),
          /* @__PURE__ */ jsxs("div", { className: "mt-1 text-sm text-white/80", children: [
            current.artwork.artist?.name,
            " ",
            current.artwork.artist?.country ? `· ${current.artwork.artist.country}` : ""
          ] }),
          current.artwork.price != null && /* @__PURE__ */ jsxs("div", { className: "mt-1 text-sm text-white/80", children: [
            current.artwork.currency,
            " ",
            Number(current.artwork.price).toLocaleString()
          ] })
        ] })
      ] }),
      current?.kind === "sponsor" && current.sponsor && /* @__PURE__ */ jsxs("a", { href: current.sponsor.link_url ?? "#", target: current.sponsor.link_url ? "_blank" : void 0, rel: "noreferrer", className: "relative block max-h-full max-w-full", children: [
        /* @__PURE__ */ jsx("img", { src: current.sponsor.image_url, alt: current.sponsor.headline ?? "Sponsor", className: "max-h-[75vh] max-w-[90vw] object-contain" }),
        /* @__PURE__ */ jsx("span", { className: "absolute left-4 top-4 rounded bg-white/10 px-2 py-1 text-[10px] uppercase tracking-wider text-white/80", children: "Sponsored" }),
        current.sponsor.headline && /* @__PURE__ */ jsx("div", { className: "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-6", children: /* @__PURE__ */ jsx("div", { className: "font-display text-2xl", children: current.sponsor.headline }) })
      ] }),
      /* @__PURE__ */ jsx("button", { onClick: () => setIdx((i) => Math.max(0, i - 1)), className: "absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-xl hover:bg-white/20 disabled:opacity-30", disabled: idx === 0, children: "‹" }),
      /* @__PURE__ */ jsx("button", { onClick: () => setIdx((i) => Math.min(total - 1, i + 1)), className: "absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-xl hover:bg-white/20 disabled:opacity-30", disabled: idx >= total - 1, children: "›" })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "flex gap-1 px-5 py-3", children: panes.map((p, i) => /* @__PURE__ */ jsx("div", { className: `h-1 flex-1 rounded ${i <= idx ? "bg-white" : "bg-white/20"}` }, p.position)) })
  ] });
}
export {
  ReelPage as component
};
