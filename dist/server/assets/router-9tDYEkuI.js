import { QueryClientProvider, queryOptions, QueryClient } from "@tanstack/react-query";
import { useRouter, isRedirect, useNavigate, createRootRouteWithContext, Link, Outlet, HeadContent, Scripts, createFileRoute, lazyRouteComponent, createRouter } from "@tanstack/react-router";
import { jsxs, Fragment, jsx } from "react/jsx-runtime";
import * as React from "react";
import { useState, useEffect } from "react";
import { Toaster as Toaster$1 } from "sonner";
import { s as supabase } from "./client-BWo_yy_6.js";
import { c as createSsrRpc } from "./createSsrRpc-Def-olcZ.js";
import { c as createServerFn } from "./server-xISFJUTE.js";
import { z } from "zod";
import { r as requireSupabaseAuth } from "./auth-middleware-DPJJ5M9W.js";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { streamText, convertToModelMessages } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createHmac, timingSafeEqual } from "node:crypto";
import { jwtVerify } from "jose";
import { supabaseAdmin } from "./client.server-D5ro3rAQ.js";
function useServerFn(serverFn) {
  const router2 = useRouter();
  return React.useCallback(async (...args) => {
    try {
      const res = await serverFn(...args);
      if (isRedirect(res)) throw res;
      return res;
    } catch (err) {
      if (isRedirect(err)) {
        err.options._fromLocation = router2.stores.location.get();
        return router2.navigate(router2.resolveRedirect(err).options);
      }
      throw err;
    }
  }, [router2, serverFn]);
}
const DEFAULT = {
  privacy: "MyAfriart respects your privacy. We collect only what's needed to show you art, process orders and run AI room-staging, never sell your personal data, and handle payments through regulated providers. You can request deletion of your data at any time.",
  contact: "MyAfriart (a ZonicMe company)\nFloor M2, Transcorp Hilton, Abuja, Nigeria\n\nSupport: hello@myafriart.com\nArtists: artists@myafriart.com",
  faqs: [
    {
      q: "What is room-staging?",
      a: "Upload a photo of your room and our AI places any artwork on your wall so you can see it in your space before buying."
    },
    {
      q: "How do I buy a piece?",
      a: "Open any artwork and follow the purchase link; the sale is between you and the artist, with MyAfriart handling secure payment."
    },
    {
      q: "Can artists list their work?",
      a: "Yes — apply through the Artists link and our team reviews submissions."
    }
  ]
};
const TITLES = {
  privacy: "Privacy",
  faqs: "Frequently asked questions",
  contact: "Contact us"
};
function SiteFooter({ content = DEFAULT }) {
  const [open, setOpen] = useState(null);
  const [faq, setFaq] = useState(0);
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("nav", { className: "flex justify-center gap-9 border-t border-neutral-200 bg-white px-4 py-6", children: ["privacy", "faqs", "contact"].map((k) => /* @__PURE__ */ jsx(
      "button",
      {
        onClick: () => setOpen(k),
        className: "text-sm font-semibold text-neutral-500 hover:text-neutral-900",
        children: k === "faqs" ? "FAQ" : TITLES[k]
      },
      k
    )) }),
    open && /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-[88] bg-black/40", onClick: () => setOpen(null) }),
    /* @__PURE__ */ jsxs(
      "section",
      {
        className: `fixed inset-x-0 bottom-0 z-[92] max-h-[82vh] overflow-auto rounded-t-2xl border-t border-neutral-200 bg-white shadow-2xl transition-transform duration-300 ${open ? "translate-y-0" : "translate-y-full"}`,
        children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => setOpen(null),
              className: "absolute right-5 top-4 text-2xl text-neutral-400",
              children: "×"
            }
          ),
          /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-3xl px-6 pb-12 pt-8", children: [
            /* @__PURE__ */ jsx("h2", { className: "mb-5 text-2xl font-extrabold tracking-tight text-neutral-900", children: open ? TITLES[open] : "" }),
            open === "faqs" ? /* @__PURE__ */ jsx("div", { children: content.faqs.map((f, i) => /* @__PURE__ */ jsxs("div", { className: "border-b border-neutral-200", children: [
              /* @__PURE__ */ jsxs(
                "button",
                {
                  onClick: () => setFaq(faq === i ? null : i),
                  className: "flex w-full items-center justify-between gap-4 py-4 text-left text-base font-bold text-neutral-900",
                  children: [
                    f.q,
                    /* @__PURE__ */ jsx("span", { className: "text-xl text-neutral-500", children: faq === i ? "−" : "+" })
                  ]
                }
              ),
              faq === i && /* @__PURE__ */ jsx("p", { className: "pb-4 text-[15px] leading-relaxed text-neutral-500", children: f.a })
            ] }, i)) }) : open ? /* @__PURE__ */ jsx("div", { className: "whitespace-pre-wrap text-[15px] leading-relaxed text-neutral-700", children: content[open] }) : null
          ] })
        ]
      }
    )
  ] });
}
const Toaster = ({ ...props }) => {
  return /* @__PURE__ */ jsx(
    Toaster$1,
    {
      className: "toaster group",
      toastOptions: {
        classNames: {
          toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground"
        }
      },
      ...props
    }
  );
};
const MEDIA = ["oil", "watercolor", "pastel", "sculpture", "photograph", "print", "mixed_media"];
const GENDERS = ["male", "female", "other"];
const getNotifyPreferences = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).handler(createSsrRpc("ac51762fec80d3e8f4e1cd5c7dea594661870536518f4d07ee50fd91fe59392a"));
const PrefsIn = z.object({
  enabled: z.boolean(),
  frequency_per_week: z.number().int().min(1).max(14),
  categories: z.array(z.enum(MEDIA)).max(7),
  countries: z.array(z.string().min(1).max(64)).max(40),
  genders: z.array(z.enum(GENDERS)).max(3),
  artist_age_min: z.number().int().min(0).max(120).nullable(),
  artist_age_max: z.number().int().min(0).max(120).nullable(),
  price_min: z.number().min(0).max(1e8).nullable(),
  price_max: z.number().min(0).max(1e8).nullable(),
  currency: z.string().regex(/^[A-Z]{3}$/).default("USD")
});
const upsertNotifyPreferences = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => PrefsIn.parse(d)).handler(createSsrRpc("ddf9fba802ff83dbee0427dbdf29052accf5e5857e78eee1bd18962fa36c68f2"));
const listMyReels = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).handler(createSsrRpc("bd2d313708740cb7554014d21d908e233e7d195b035e9bf1e1b1cc356a489915"));
const getReel = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  id: z.string().uuid()
}).parse(d)).handler(createSsrRpc("fc0b39049bbac09b37f649b19233047253e72b4433c52016a78bd763812200af"));
const markReelViewed = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  id: z.string().uuid()
}).parse(d)).handler(createSsrRpc("95dae1b9edea2df836737b17fadd222a3e1f2cf0ba71360974ecfc5efdb57c49"));
const markReelDelivered = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  id: z.string().uuid()
}).parse(d)).handler(createSsrRpc("49b1fbf6df4590641cfa3db5a958b711e8d202ccba3e393b6ba3cc4e25656b79"));
const getUndeliveredReel = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).handler(createSsrRpc("5620c13726ae4c20a762ebb3a9a5196d2867dc92068a420a61438be4c476f138"));
const generateMyReelNow = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).handler(createSsrRpc("90215d4dfd994cf5db2581d161816a644869fa9481495ad82250ff8701528494"));
createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).handler(createSsrRpc("1d516687698fbc23b53445da7684e3e1454f24de80e1162c4dae186a1bbd6854"));
const SponsorIn = z.object({
  id: z.string().uuid().optional(),
  image_url: z.string().url(),
  headline: z.string().max(200).nullable().optional(),
  link_url: z.string().url().nullable().optional(),
  is_active: z.boolean().default(true),
  weight: z.number().int().min(0).max(100).default(1),
  sort_order: z.number().int().min(0).max(999).default(0)
});
createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => SponsorIn.parse(d)).handler(createSsrRpc("da45cd9521206ab1743bf6933801c58b92188abaf12acb09b19bcbc791ca9f00"));
createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  id: z.string().uuid()
}).parse(d)).handler(createSsrRpc("d4920153138e7f7c904edb4aaf8a8e8097dc33caf286378b41a8ef8b5fe2bcb4"));
createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).handler(createSsrRpc("1a3f9d6ad1881d839deb62076c35ff73fcde86bab6a77f8bd2117c2902c510ed"));
createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  value: z.number().int().min(1).max(14)
}).parse(d)).handler(createSsrRpc("e9b19ca77bb47b7e8271ec36a559aec04cbd6be65624e46c08e317fa0a7958de"));
const SEEN_KEY = "notify_autoopen_seen_v1";
function NotifyAutoOpen() {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState(false);
  const fetchUndelivered = useServerFn(getUndeliveredReel);
  const markDelivered = useServerFn(markReelDelivered);
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    return () => sub.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!authed) return;
    let cancelled = false;
    (async () => {
      try {
        if (sessionStorage.getItem(SEEN_KEY)) return;
        if (window.location.pathname.startsWith("/notify")) return;
        const { reelId } = await fetchUndelivered();
        if (cancelled || !reelId) return;
        sessionStorage.setItem(SEEN_KEY, "1");
        await markDelivered({ data: { id: reelId } });
        navigate({ to: "/notify/reel/$id", params: { id: reelId } });
      } catch {
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authed, fetchUndelivered, markDelivered, navigate]);
  return null;
}
const appCss = "/assets/styles-BNF2P4tC.css";
function NotFoundComponent() {
  return /* @__PURE__ */ jsx("div", { className: "flex min-h-screen items-center justify-center bg-background px-4", children: /* @__PURE__ */ jsxs("div", { className: "max-w-md text-center", children: [
    /* @__PURE__ */ jsx("h1", { className: "text-7xl font-display text-foreground", children: "404" }),
    /* @__PURE__ */ jsx("p", { className: "mt-4 text-muted-foreground", children: "This page doesn't exist." }),
    /* @__PURE__ */ jsx(
      Link,
      {
        to: "/",
        className: "mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90",
        children: "Go home"
      }
    )
  ] }) });
}
function ErrorComponent({ error, reset }) {
  console.error(error);
  const router2 = useRouter();
  return /* @__PURE__ */ jsx("div", { className: "flex min-h-screen items-center justify-center bg-background px-4", children: /* @__PURE__ */ jsxs("div", { className: "max-w-md text-center", children: [
    /* @__PURE__ */ jsx("h1", { className: "font-display text-3xl", children: "Something went wrong" }),
    /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: "An unexpected error occurred. Please try again." }),
    /* @__PURE__ */ jsx(
      "button",
      {
        onClick: () => {
          router2.invalidate();
          reset();
        },
        className: "mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90",
        children: "Try again"
      }
    )
  ] }) });
}
const Route$m = createRootRouteWithContext()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "MyAfriArtX — Discover African Art" },
      {
        name: "description",
        content: "MyAfriart is a curated marketplace and discovery platform for African art. Explore artists, artworks, and stage pieces in your space with our artstage room tool."
      },
      { property: "og:title", content: "MyAfriArtX — Discover African Art" },
      { name: "twitter:title", content: "MyAfriArtX — Discover African Art" },
      {
        property: "og:description",
        content: "MyAfriart is a curated marketplace and discovery platform for African art. Explore artists, artworks, and stage pieces in your space with our artstage room tool."
      },
      {
        name: "twitter:description",
        content: "MyAfriart is a curated marketplace and discovery platform for African art. Explore artists, artworks, and stage pieces in your space with our artstage room tool."
      },
      { property: "og:image", content: "/og-image.png" },
      { name: "twitter:image", content: "/og-image.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" }
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" }
    ]
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent
});
function RootShell({ children }) {
  return /* @__PURE__ */ jsxs("html", { lang: "en", children: [
    /* @__PURE__ */ jsx("head", { children: /* @__PURE__ */ jsx(HeadContent, {}) }),
    /* @__PURE__ */ jsxs("body", { children: [
      children,
      /* @__PURE__ */ jsx(Scripts, {})
    ] })
  ] });
}
function RootComponent() {
  const { queryClient } = Route$m.useRouteContext();
  return /* @__PURE__ */ jsxs(QueryClientProvider, { client: queryClient, children: [
    /* @__PURE__ */ jsx(Outlet, {}),
    /* @__PURE__ */ jsx(SiteFooter, {}),
    /* @__PURE__ */ jsx(NotifyAutoOpen, {}),
    /* @__PURE__ */ jsx(Toaster, { richColors: true, position: "top-center" })
  ] });
}
const $$splitComponentImporter$h = () => import("./verification-CeyrLVFS.js");
const Route$l = createFileRoute("/verification")({
  component: lazyRouteComponent($$splitComponentImporter$h, "component"),
  head: () => ({
    meta: [{
      title: "Identity verification — MyAfriart"
    }]
  })
});
const $$splitComponentImporter$g = () => import("./studio-BKQz4Eg2.js");
const Route$k = createFileRoute("/studio")({
  head: () => ({
    meta: [{
      title: "Studio — MyAfriart"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$g, "component")
});
const $$splitComponentImporter$f = () => import("./renders-D0A13G4m.js");
const Route$j = createFileRoute("/renders")({
  head: () => ({
    meta: [{
      title: "My renders — MyAfriart"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$f, "component")
});
const $$splitComponentImporter$e = () => import("./notify-BuJdURsS.js");
const Route$i = createFileRoute("/notify")({
  head: () => ({
    meta: [{
      title: "NotifyMe — MyAfriart"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$e, "component")
});
const $$splitComponentImporter$d = () => import("./lounge-3SMNHAJv.js");
const loungeSearchSchema = z.object({
  tab: fallback(z.enum(["sell", "buy", "threads"]), "sell").default("sell")
});
const Route$h = createFileRoute("/lounge")({
  validateSearch: zodValidator(loungeSearchSchema),
  head: () => ({
    meta: [{
      title: "The Art Lounge — MyAfriart"
    }, {
      name: "description",
      content: "A private floor for registered buyers and sellers. Browse listings, message members, and use our broker service."
    }, {
      property: "og:title",
      content: "The Art Lounge — MyAfriart"
    }, {
      property: "og:description",
      content: "A private floor for registered buyers and sellers."
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$d, "component")
});
const $$splitComponentImporter$c = () => import("./login-DQqCzweO.js");
const Route$g = createFileRoute("/login")({
  head: () => ({
    meta: [{
      title: "Sign in — MyAfriart"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$c, "component")
});
const $$splitComponentImporter$b = () => import("./disputes-C5d2TaSA.js");
const Route$f = createFileRoute("/disputes")({
  component: lazyRouteComponent($$splitComponentImporter$b, "component"),
  head: () => ({
    meta: [{
      title: "Payment disputes — MyAfriart"
    }]
  })
});
const $$splitComponentImporter$a = () => import("./collateral-CMyOUTRb.js");
const Route$e = createFileRoute("/collateral")({
  component: lazyRouteComponent($$splitComponentImporter$a, "component"),
  head: () => ({
    meta: [{
      title: "Art Collateral — MyAfriart"
    }]
  })
});
const $$splitComponentImporter$9 = () => import("./auction-CK9J_1M6.js");
const Route$d = createFileRoute("/auction")({
  component: lazyRouteComponent($$splitComponentImporter$9, "component"),
  head: () => ({
    meta: [{
      title: "Live Auction — MyAfriart"
    }]
  })
});
const $$splitComponentImporter$8 = () => import("./admin-DbwEwWcR.js");
const Route$c = createFileRoute("/admin")({
  head: () => ({
    meta: [{
      title: "Admin — MyAfriart"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$8, "component")
});
const $$splitComponentImporter$7 = () => import("./index-qjEpHxif.js");
const csv = z.union([z.string(), z.array(z.string())]).transform((v) => {
  const values = Array.isArray(v) ? v : v.trim().startsWith("[") ? JSON.parse(v) : v ? v.split(",").filter(Boolean) : [];
  return (Array.isArray(values) ? values : []).map((s) => s.trim()).filter((s) => s && s !== "[]");
});
const numRange = z.union([z.string(), z.array(z.union([z.string(), z.number()])), z.null()]).transform((v) => {
  if (v == null) return null;
  const parts = Array.isArray(v) ? v : v.split(",");
  if (parts.length !== 2) return null;
  const a = Number(parts[0]);
  const b = Number(parts[1]);
  return Number.isFinite(a) && Number.isFinite(b) ? [a, b] : null;
});
const landingSearchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  scope: fallback(z.enum(["all", "artists", "artworks"]), "all").default("all"),
  focus: fallback(z.enum(["catalogue", "artists", "artworks"]), "catalogue").default("catalogue"),
  countries: fallback(csv, []).default([]),
  mediums: fallback(csv, []).default([]),
  genders: fallback(csv, []).default([]),
  cities: fallback(csv, []).default([]),
  artists: fallback(csv, []).default([]),
  age: fallback(numRange, null).default(null),
  price: fallback(numRange, null).default(null)
});
const Route$b = createFileRoute("/")({
  validateSearch: zodValidator(landingSearchSchema),
  head: () => ({
    meta: [{
      title: "MyAfriArtX — Discover, Buy, Bid & Stage African Art"
    }, {
      name: "description",
      content: "Discover African art. Buy and sell from leading artists, bid in live art auctions, and stage any piece virtually on your wall before you commit."
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$7, "component")
});
const getCataloguePieces = createServerFn({
  method: "GET"
}).handler(createSsrRpc("96fcaa13b2dd3b04931964447359b37bdfd873119a1654659dd33d9fa3fcc061"));
const getCatalogueArtists = createServerFn({
  method: "GET"
}).handler(createSsrRpc("d110404b12abf8c9c8c248f119dd1a4fa5267b762279af9a2f17c47e77d9cb39"));
const idSchema = z.object({
  idOrCode: z.string().min(1).max(64)
});
const getPieceDetail = createServerFn({
  method: "GET"
}).inputValidator((d) => idSchema.parse(d)).handler(createSsrRpc("c4e251dfa035685675fa525d14ba8e1a887e55c2f8a148ad7c168896a2232981"));
const getArtistDetail = createServerFn({
  method: "GET"
}).inputValidator((d) => idSchema.parse(d)).handler(createSsrRpc("b0d4c5f64d41298cb40a00b78d349bacd032bfac4401e11ded0d11b093966809"));
const bumpView = createServerFn({
  method: "POST"
}).inputValidator((d) => z.object({
  target: z.enum(["artworks", "artists"]),
  id: z.string().uuid()
}).parse(d)).handler(createSsrRpc("62a8ed3c6ea987317348157b711a00d954cf9b80c71c82f46e2e8ec493281ef8"));
const scopeSchema = z.enum(["pieces", "artists"]);
const getAllocations = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  scope: scopeSchema
}).parse(d)).handler(createSsrRpc("a1a8c571f3323150fb6e138244c77467a80e0502f52e30a30c1bd92b0328a241"));
const saveAllocations = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  scope: scopeSchema,
  rows: z.array(z.object({
    country: z.string().min(1).max(64),
    percent: z.number().min(0).max(100)
  })).max(80)
}).parse(d)).handler(createSsrRpc("afbf60c126d74fb0ab4c4b90ddec4c72ed61c2cfc117e13875324bf693adaa77"));
const lookupById = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  query: z.string().min(1).max(64)
}).parse(d)).handler(createSsrRpc("e87cf7d1c12aea0e1af617dd6906531df73c6e76373945a75bc22c862fe585b0"));
const listTransactions = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).handler(createSsrRpc("334769fd23ab837b04e9451aab367cb3e61067a51fe7bc9e62dace0479747ee5"));
const pieceQuery = (code) => queryOptions({
  queryKey: ["piece", code],
  queryFn: () => getPieceDetail({
    data: {
      idOrCode: code
    }
  })
});
const $$splitNotFoundComponentImporter$1 = () => import("./piece._code-BdS5Q2dX.js");
const $$splitErrorComponentImporter$1 = () => import("./piece._code-Bz50MFpc.js");
const $$splitComponentImporter$6 = () => import("./piece._code-BOyLk2NX.js");
const Route$a = createFileRoute("/piece/$code")({
  loader: ({
    context,
    params
  }) => context.queryClient.ensureQueryData(pieceQuery(params.code)),
  component: lazyRouteComponent($$splitComponentImporter$6, "component"),
  errorComponent: lazyRouteComponent($$splitErrorComponentImporter$1, "errorComponent"),
  notFoundComponent: lazyRouteComponent($$splitNotFoundComponentImporter$1, "notFoundComponent")
});
const $$splitComponentImporter$5 = () => import("./notify.inbox-BMCFsVuj.js");
const Route$9 = createFileRoute("/notify/inbox")({
  head: () => ({
    meta: [{
      title: "Inbox — NotifyMe"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$5, "component")
});
const $$splitComponentImporter$4 = () => import("./checkout.mock-BoJwYBBi.js");
const Route$8 = createFileRoute("/checkout/mock")({
  component: lazyRouteComponent($$splitComponentImporter$4, "component")
});
const $$splitComponentImporter$3 = () => import("./checkout.callback-BYnzqrsS.js");
const Route$7 = createFileRoute("/checkout/callback")({
  component: lazyRouteComponent($$splitComponentImporter$3, "component")
});
const artistQuery = (code) => queryOptions({
  queryKey: ["artist", code],
  queryFn: () => getArtistDetail({
    data: {
      idOrCode: code
    }
  })
});
const $$splitNotFoundComponentImporter = () => import("./artist._code-CwTVyZjX.js");
const $$splitErrorComponentImporter = () => import("./artist._code-CCrW1X7A.js");
const $$splitComponentImporter$2 = () => import("./artist._code-CxeNx4TQ.js");
const Route$6 = createFileRoute("/artist/$code")({
  loader: ({
    context,
    params
  }) => context.queryClient.ensureQueryData(artistQuery(params.code)),
  component: lazyRouteComponent($$splitComponentImporter$2, "component"),
  errorComponent: lazyRouteComponent($$splitErrorComponentImporter, "errorComponent"),
  notFoundComponent: lazyRouteComponent($$splitNotFoundComponentImporter, "notFoundComponent")
});
const AI_MODEL = process.env.AI_MODEL || "gpt-4o-mini";
function getAiProvider() {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const apiKey = process.env.AI_API_KEY || lovableKey || "";
  const baseURL = process.env.AI_API_URL || (lovableKey ? "https://ai.gateway.lovable.dev/v1" : "https://api.openai.com/v1");
  const headers = {};
  if (lovableKey && !process.env.AI_API_KEY) {
    headers["Lovable-API-Key"] = lovableKey;
    headers["X-Lovable-AIG-SDK"] = "vercel-ai-sdk";
  }
  const provider = createOpenAICompatible({
    name: "artstage-ai",
    baseURL,
    apiKey: apiKey || void 0,
    headers
  });
  return { provider, configured: Boolean(apiKey) };
}
const SYSTEM = "You are the MyAfriart concierge — a warm, knowledgeable assistant helping visitors discover African art, artists, events, auctions, and the artstage room-preview tool. Keep replies short, useful, and friendly. Use markdown sparingly.";
const Route$5 = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages } = await request.json();
        if (!Array.isArray(messages)) return new Response("Messages are required", { status: 400 });
        const { provider, configured } = getAiProvider();
        if (!configured) {
          const text = "I'm the MyAfriart concierge. The live assistant isn't configured yet — set AI_API_KEY (any OpenAI-compatible provider, e.g. OpenAI or Groq) to switch it on. Meanwhile you can browse Artists and Pieces from the landing page, open the Studio to stage a work on your wall, or check the Live Auction and Sale Lounge.";
          return new Response(text, {
            status: 200,
            headers: { "Content-Type": "text/plain; charset=utf-8" }
          });
        }
        const result = streamText({
          model: provider(AI_MODEL),
          system: SYSTEM,
          messages: await convertToModelMessages(messages)
        });
        return result.toUIMessageStreamResponse({ originalMessages: messages });
      }
    }
  }
});
const $$splitComponentImporter$1 = () => import("./verify.cert._code-Clrv-0VE.js");
const Route$4 = createFileRoute("/verify/cert/$code")({
  component: lazyRouteComponent($$splitComponentImporter$1, "component"),
  head: ({
    params
  }) => ({
    meta: [{
      title: `Certificate ${params.code} — MyAfriart`
    }]
  })
});
const $$splitComponentImporter = () => import("./notify.reel._id-WuIzkplm.js");
const Route$3 = createFileRoute("/notify/reel/$id")({
  head: () => ({
    meta: [{
      title: "Reel — NotifyMe"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter, "component")
});
async function getAdmin() {
  return (await import("./client.server-D5ro3rAQ.js")).supabaseAdmin;
}
async function fulfillPaymentByReference(reference) {
  const admin = await getAdmin();
  const { data: payment } = await admin.from("payments").select("id, status").eq("provider_ref", reference).maybeSingle();
  if (!payment) return { ok: false, error: "payment_not_found" };
  if (payment.status === "succeeded") return { ok: true, already: true };
  const { data, error } = await admin.rpc("fulfill_payment_record", {
    p_payment_id: payment.id,
    p_reference: reference
  });
  if (error) throw new Error(error.message);
  return data;
}
async function logWebhookEvent(provider, eventId, reference, payload) {
  const admin = await getAdmin();
  const { error } = await admin.from("payment_webhook_events").insert({
    provider,
    event_id: eventId,
    reference,
    payload
  });
  if (error?.code === "23505") throw error;
}
const Route$2 = createFileRoute("/api/webhooks/paystack")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.PAYSTACK_SECRET_KEY;
        if (!secret) {
          return new Response(JSON.stringify({ error: "Webhook not configured" }), { status: 503 });
        }
        const signature = request.headers.get("x-paystack-signature");
        const body = await request.text();
        if (!signature) {
          return new Response(JSON.stringify({ error: "Missing signature" }), { status: 401 });
        }
        const hash = createHmac("sha512", secret).update(body).digest("hex");
        const valid = hash.length === signature.length && timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
        if (!valid) {
          return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401 });
        }
        const event = JSON.parse(body);
        const eventId = String(event.data?.id ?? event.event + body.slice(0, 32));
        const reference = event.data?.reference;
        try {
          await logWebhookEvent("paystack", eventId, reference ?? null, event);
        } catch {
          return new Response(JSON.stringify({ ok: true, duplicate: true }));
        }
        if (event.event === "charge.success" && reference && event.data?.status === "success") {
          await fulfillPaymentByReference(reference);
        }
        return new Response(JSON.stringify({ ok: true }));
      }
    }
  }
});
const Route$1 = createFileRoute("/api/cron/auctions")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = process.env.CRON_SECRET;
        const auth = request.headers.get("authorization");
        if (!secret || auth !== `Bearer ${secret}`) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }
        const admin = await getAdmin();
        const { data: settled, error } = await admin.rpc("settle_expired_auction_lots");
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
        return new Response(JSON.stringify({ settled: settled ?? 0 }));
      }
    }
  }
});
const ALLOWED_REDIRECT_PATHS = /* @__PURE__ */ new Set(["/studio", "/renders"]);
function newCorrelationId() {
  return (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)).slice(0, 8);
}
function genericError(status, userMessage, cid) {
  return new Response(`${userMessage} (ref: ${cid})`, { status });
}
const Route = createFileRoute("/api/bridge/enter")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const cid = newCorrelationId();
        try {
          const url = new URL(request.url);
          const token = url.searchParams.get("token");
          const redirectTo = safeRedirectPath(url.searchParams.get("redirect"));
          const secret = process.env.PHP_BRIDGE_SECRET;
          if (!secret) {
            console.error(`[bridge ${cid}] PHP_BRIDGE_SECRET not configured`);
            return genericError(500, "Sign-in is temporarily unavailable.", cid);
          }
          if (!token) return genericError(400, "Sign-in request is invalid.", cid);
          let claims;
          try {
            const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
              algorithms: ["HS256"]
            });
            claims = payload;
          } catch (e) {
            console.error(`[bridge ${cid}] token verification failed:`, e);
            return genericError(401, "Sign-in link is invalid or has expired.", cid);
          }
          const phpUserId = String(claims.sub ?? "");
          const email = String(claims.email ?? "");
          const displayName = claims.name ?? null;
          if (!phpUserId || !email) {
            console.error(`[bridge ${cid}] token missing sub/email`, {
              hasSub: !!phpUserId,
              hasEmail: !!email
            });
            return genericError(400, "Sign-in request is invalid.", cid);
          }
          let userId;
          const { data: existing, error: lookupErr } = await supabaseAdmin.from("profiles").select("id").eq("external_user_id", phpUserId).maybeSingle();
          if (lookupErr) {
            console.error(`[bridge ${cid}] profile lookup error:`, lookupErr);
            return genericError(500, "Sign-in failed. Please try again.", cid);
          }
          if (existing?.id) {
            userId = existing.id;
          } else {
            const created = await supabaseAdmin.auth.admin.createUser({
              email,
              email_confirm: true,
              user_metadata: {
                display_name: displayName ?? email.split("@")[0],
                external_source: "php",
                external_user_id: phpUserId
              }
            });
            if (created.error && !created.error.message?.includes("already")) {
              console.error(`[bridge ${cid}] provisioning error:`, created.error);
              return genericError(500, "Sign-in failed. Please try again.", cid);
            }
            if (created.data?.user) {
              userId = created.data.user.id;
              const { error: upsertErr } = await supabaseAdmin.from("profiles").upsert(
                {
                  id: userId,
                  display_name: displayName ?? email.split("@")[0],
                  external_source: "php",
                  external_user_id: phpUserId
                },
                { onConflict: "id" }
              );
              if (upsertErr) {
                console.error(`[bridge ${cid}] profile upsert error:`, upsertErr);
                return genericError(500, "Sign-in failed. Please try again.", cid);
              }
            } else {
              console.error(`[bridge ${cid}] auth user exists but no linked profile`, {
                phpUserId
              });
              return genericError(409, "Sign-in failed. Please contact support.", cid);
            }
          }
          if (!userId) {
            console.error(`[bridge ${cid}] could not resolve user id`);
            return genericError(500, "Sign-in failed. Please try again.", cid);
          }
          const origin = `${url.protocol}//${url.host}`;
          const link = await supabaseAdmin.auth.admin.generateLink({
            type: "magiclink",
            email,
            options: { redirectTo: `${origin}${redirectTo}` }
          });
          if (link.error || !link.data.properties?.action_link) {
            console.error(`[bridge ${cid}] magic link error:`, link.error);
            return genericError(500, "Sign-in failed. Please try again.", cid);
          }
          return Response.redirect(link.data.properties.action_link, 302);
        } catch (e) {
          console.error(`[bridge ${cid}] unexpected error:`, e);
          return genericError(500, "Sign-in failed. Please try again.", cid);
        }
      }
    }
  }
});
function safeRedirectPath(raw) {
  if (!raw || raw.includes("@") || raw.includes("//") || !raw.startsWith("/")) return "/studio";
  const path = raw.split("?")[0].split("#")[0];
  return ALLOWED_REDIRECT_PATHS.has(path) ? raw : "/studio";
}
const VerificationRoute = Route$l.update({
  id: "/verification",
  path: "/verification",
  getParentRoute: () => Route$m
});
const StudioRoute = Route$k.update({
  id: "/studio",
  path: "/studio",
  getParentRoute: () => Route$m
});
const RendersRoute = Route$j.update({
  id: "/renders",
  path: "/renders",
  getParentRoute: () => Route$m
});
const NotifyRoute = Route$i.update({
  id: "/notify",
  path: "/notify",
  getParentRoute: () => Route$m
});
const LoungeRoute = Route$h.update({
  id: "/lounge",
  path: "/lounge",
  getParentRoute: () => Route$m
});
const LoginRoute = Route$g.update({
  id: "/login",
  path: "/login",
  getParentRoute: () => Route$m
});
const DisputesRoute = Route$f.update({
  id: "/disputes",
  path: "/disputes",
  getParentRoute: () => Route$m
});
const CollateralRoute = Route$e.update({
  id: "/collateral",
  path: "/collateral",
  getParentRoute: () => Route$m
});
const AuctionRoute = Route$d.update({
  id: "/auction",
  path: "/auction",
  getParentRoute: () => Route$m
});
const AdminRoute = Route$c.update({
  id: "/admin",
  path: "/admin",
  getParentRoute: () => Route$m
});
const IndexRoute = Route$b.update({
  id: "/",
  path: "/",
  getParentRoute: () => Route$m
});
const PieceCodeRoute = Route$a.update({
  id: "/piece/$code",
  path: "/piece/$code",
  getParentRoute: () => Route$m
});
const NotifyInboxRoute = Route$9.update({
  id: "/inbox",
  path: "/inbox",
  getParentRoute: () => NotifyRoute
});
const CheckoutMockRoute = Route$8.update({
  id: "/checkout/mock",
  path: "/checkout/mock",
  getParentRoute: () => Route$m
});
const CheckoutCallbackRoute = Route$7.update({
  id: "/checkout/callback",
  path: "/checkout/callback",
  getParentRoute: () => Route$m
});
const ArtistCodeRoute = Route$6.update({
  id: "/artist/$code",
  path: "/artist/$code",
  getParentRoute: () => Route$m
});
const ApiChatRoute = Route$5.update({
  id: "/api/chat",
  path: "/api/chat",
  getParentRoute: () => Route$m
});
const VerifyCertCodeRoute = Route$4.update({
  id: "/verify/cert/$code",
  path: "/verify/cert/$code",
  getParentRoute: () => Route$m
});
const NotifyReelIdRoute = Route$3.update({
  id: "/reel/$id",
  path: "/reel/$id",
  getParentRoute: () => NotifyRoute
});
const ApiWebhooksPaystackRoute = Route$2.update({
  id: "/api/webhooks/paystack",
  path: "/api/webhooks/paystack",
  getParentRoute: () => Route$m
});
const ApiCronAuctionsRoute = Route$1.update({
  id: "/api/cron/auctions",
  path: "/api/cron/auctions",
  getParentRoute: () => Route$m
});
const ApiBridgeEnterRoute = Route.update({
  id: "/api/bridge/enter",
  path: "/api/bridge/enter",
  getParentRoute: () => Route$m
});
const NotifyRouteChildren = {
  NotifyInboxRoute,
  NotifyReelIdRoute
};
const NotifyRouteWithChildren = NotifyRoute._addFileChildren(NotifyRouteChildren);
const rootRouteChildren = {
  IndexRoute,
  AdminRoute,
  AuctionRoute,
  CollateralRoute,
  DisputesRoute,
  LoginRoute,
  LoungeRoute,
  NotifyRoute: NotifyRouteWithChildren,
  RendersRoute,
  StudioRoute,
  VerificationRoute,
  ApiChatRoute,
  ArtistCodeRoute,
  CheckoutCallbackRoute,
  CheckoutMockRoute,
  PieceCodeRoute,
  ApiBridgeEnterRoute,
  ApiCronAuctionsRoute,
  ApiWebhooksPaystackRoute,
  VerifyCertCodeRoute
};
const routeTree = Route$m._addFileChildren(rootRouteChildren)._addFileTypes();
const getRouter = () => {
  const queryClient = new QueryClient();
  const router2 = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0
  });
  return router2;
};
const router = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  getRouter
}, Symbol.toStringTag, { value: "Module" }));
export {
  Route$h as R,
  SiteFooter as S,
  upsertNotifyPreferences as a,
  generateMyReelNow as b,
  lookupById as c,
  listTransactions as d,
  getAllocations as e,
  Route$b as f,
  getNotifyPreferences as g,
  getCataloguePieces as h,
  getCatalogueArtists as i,
  Route$a as j,
  bumpView as k,
  listMyReels as l,
  Route$6 as m,
  artistQuery as n,
  Route$4 as o,
  pieceQuery as p,
  getReel as q,
  markReelViewed as r,
  saveAllocations as s,
  router as t,
  useServerFn as u
};
