import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { u as useServerFn, c as lookupById, d as listTransactions, e as getAllocations, s as saveAllocations } from "./router-9tDYEkuI.js";
import { c as createSsrRpc } from "./createSsrRpc-Def-olcZ.js";
import { c as createServerFn } from "./server-xISFJUTE.js";
import { z } from "zod";
import { r as requireSupabaseAuth } from "./auth-middleware-DPJJ5M9W.js";
import { useNavigate, Link } from "@tanstack/react-router";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { s as supabase } from "./client-BWo_yy_6.js";
import { toast } from "sonner";
import { g as getPaneViewStats } from "./pane-views.functions-8Zn_47nd.js";
import { g as getEntryClickStats } from "./entry-clicks.functions-BBu2nu3J.js";
import { l as localImageForKey, a as artistDefault, b as localPaneImage } from "./local-image-assets-D5XLRts7.js";
import { e as adminListBrokerRequests, f as adminUpdateBrokerRequest, h as adminIssueCertificate } from "./lounge.functions-CDxFxdXa.js";
import { adminListVerifications, adminReviewVerification, adminGetDocumentUrl } from "./kyc.functions-BgA21XQC.js";
import { a as adminListDisputes, b as adminResolveDispute } from "./disputes.functions-nHQEURn8.js";
import { a as adminListCollateral, b as adminUpdateCollateral } from "./collateral.functions-Bktfok7r.js";
import { l as listPendingQueue, b as listApprovedAdmins, A as AWAITING_MSG, c as approveAdmin, O as OWNER_EMAIL, d as revokeAdmin, e as adminGateActive, f as clearAdminGate } from "./adminTesterApproval-BSsAT6LI.js";
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
import "./kyc-constants-C5-iGq5J.js";
const contentSchema = z.object({
  content: z.record(z.record(z.string())),
  media: z.record(z.string().nullable())
});
const getSiteContent = createServerFn({
  method: "GET"
}).handler(createSsrRpc("95456f5281b6f0e7bfcd91c53ae8fda1d51e66376f9c405775affae9bc237fe2"));
const publishSiteContent = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => contentSchema.parse(d)).handler(createSsrRpc("4d4e992fe94d55219e92f499b72e312c0aa2790f3a5326a1f0da379dcb123bcc"));
const DEVICE_PRESETS = [
  { label: "Mobile", w: 480 },
  { label: "Tablet", w: 1024 },
  { label: "Desktop", w: 1600 }
];
const readFile = (f) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result);
  r.onerror = rej;
  r.readAsDataURL(f);
});
const loadImg = (src) => new Promise((res, rej) => {
  const i = new Image();
  i.onload = () => res(i);
  i.onerror = rej;
  i.src = src;
});
async function resizeForDevices(file) {
  const img = await loadImg(await readFile(file));
  return DEVICE_PRESETS.map(({ label, w }) => {
    const s = Math.min(1, w / img.width);
    const cw = Math.max(1, Math.round(img.width * s));
    const ch = Math.max(1, Math.round(img.height * s));
    const c = document.createElement("canvas");
    c.width = cw;
    c.height = ch;
    c.getContext("2d").drawImage(img, 0, 0, cw, ch);
    const url = c.toDataURL("image/jpeg", 0.82);
    return { label, width: cw, height: ch, url, kb: Math.round(url.length * 0.75 / 1024) };
  });
}
const PAGES = {
  home: {
    label: "Home",
    blocks: {
      kicker: "One place. Every move.",
      headline: "Discover, bid, sell and stage — all inside the Art Lounge.",
      sub: "Step through the doors to browse live auctions, buy and sell direct from collectors, or stage any piece on your own wall."
    }
  },
  studio: {
    label: "Studio",
    blocks: {
      headline: "Stage a room with AI",
      sub: "Point your camera at a wall and drop any piece in at true scale."
    }
  },
  lounge: {
    label: "Sale Lounge",
    blocks: { headline: "Sale Lounge", sub: "A private floor for registered buyers and sellers." }
  }
};
const seed = () => ({
  content: Object.fromEntries(Object.entries(PAGES).map(([k, v]) => [k, { ...v.blocks }])),
  media: {}
});
const loadLocal = () => seed();
function ContentStudio() {
  const fetchContent = useServerFn(getSiteContent);
  const publishFn = useServerFn(publishSiteContent);
  const [page, setPage] = useState("home");
  const [draft, setDraft] = useState(seed);
  const [saved, setSaved] = useState(seed);
  const [sizes, setSizes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchContent().then((remote) => {
      const s = remote?.content ? remote : loadLocal();
      setDraft(s);
      setSaved(s);
    }).catch(() => {
      const s = loadLocal();
      setDraft(s);
      setSaved(s);
    }).finally(() => setLoading(false));
  }, []);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const b = draft.content[page] || {};
  const setField = (k, v) => setDraft((d) => ({ ...d, content: { ...d.content, [page]: { ...d.content[page], [k]: v } } }));
  const onImg = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try {
      const out = await resizeForDevices(f);
      setSizes(out);
      setDraft((d) => ({ ...d, media: { ...d.media, [page]: out[out.length - 1].url } }));
    } finally {
      setBusy(false);
    }
  };
  const publish = async () => {
    setBusy(true);
    try {
      await publishFn({ data: draft });
      setSaved(draft);
      setStatus("Published — saved to app_settings.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setBusy(false);
    }
  };
  const discard = () => {
    setDraft(saved);
    setSizes(null);
    setStatus("Changes discarded.");
  };
  if (loading) return /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Loading site content…" });
  return /* @__PURE__ */ jsxs("div", { className: "space-y-5", children: [
    /* @__PURE__ */ jsxs("div", { className: "border border-primary/30 bg-primary/5 p-3 text-sm", children: [
      "Page editing is the ",
      /* @__PURE__ */ jsx("strong", { children: "super-admin-granted" }),
      " right (the ",
      /* @__PURE__ */ jsx("code", { children: "admin" }),
      " role on this account). Edits here publish to the live pages."
    ] }),
    /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-1 border-b border-border", children: Object.entries(PAGES).map(([k, v]) => /* @__PURE__ */ jsx(
      "button",
      {
        onClick: () => {
          setPage(k);
          setSizes(null);
        },
        className: `-mb-px border-b-2 px-4 py-2 text-sm ${page === k ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`,
        children: v.label
      },
      k
    )) }),
    /* @__PURE__ */ jsxs("div", { className: "grid gap-5 lg:grid-cols-2", children: [
      /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "border border-border bg-card p-4", children: [
          /* @__PURE__ */ jsx("h4", { className: "mb-3 font-display text-sm", children: "Text on this page" }),
          Object.keys(b).map((k) => /* @__PURE__ */ jsxs("label", { className: "mb-3 block", children: [
            /* @__PURE__ */ jsx("span", { className: "text-xs font-medium uppercase tracking-wide text-muted-foreground", children: k }),
            b[k].length > 60 ? /* @__PURE__ */ jsx(
              "textarea",
              {
                value: b[k],
                onChange: (e) => setField(k, e.target.value),
                className: "mt-1 min-h-20 w-full border border-input bg-background p-2 text-sm"
              }
            ) : /* @__PURE__ */ jsx(
              "input",
              {
                value: b[k],
                onChange: (e) => setField(k, e.target.value),
                className: "mt-1 w-full border border-input bg-background p-2 text-sm"
              }
            )
          ] }, k))
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "border border-border bg-card p-4", children: [
          /* @__PURE__ */ jsx("h4", { className: "mb-3 font-display text-sm", children: "Hero media — auto-sized for every device" }),
          draft.media[page] ? /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
            sizes && /* @__PURE__ */ jsx("div", { className: "flex gap-3", children: sizes.map((s) => /* @__PURE__ */ jsxs("div", { className: "text-center", children: [
              /* @__PURE__ */ jsx("img", { src: s.url, alt: "", className: "h-14 w-auto border border-border" }),
              /* @__PURE__ */ jsxs("div", { className: "mt-1 text-[10px] text-muted-foreground", children: [
                s.label,
                /* @__PURE__ */ jsx("br", {}),
                s.width,
                "×",
                s.height,
                " · ",
                s.kb,
                "KB"
              ] })
            ] }, s.label)) }),
            /* @__PURE__ */ jsx(
              "button",
              {
                onClick: () => {
                  setDraft((d) => ({ ...d, media: { ...d.media, [page]: null } }));
                  setSizes(null);
                },
                className: "text-xs text-destructive",
                children: "Remove image"
              }
            )
          ] }) : /* @__PURE__ */ jsxs("label", { className: "block text-sm", children: [
            /* @__PURE__ */ jsx("span", { className: "text-xs text-muted-foreground", children: busy ? "Generating Mobile / Tablet / Desktop…" : "Add an image — device sizes are created automatically" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "file",
                accept: "image/*",
                onChange: onImg,
                className: "mt-1 block text-sm"
              }
            )
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "self-start border border-border bg-muted/30", children: [
        /* @__PURE__ */ jsxs("div", { className: "border-b border-border px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground", children: [
          "Live preview · ",
          PAGES[page].label
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "p-5", children: [
          b.kicker && /* @__PURE__ */ jsx("p", { className: "text-[11px] font-semibold uppercase tracking-[0.2em] text-primary", children: b.kicker }),
          /* @__PURE__ */ jsx("h3", { className: "mt-1 font-display text-2xl leading-tight", children: b.headline }),
          /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: b.sub }),
          draft.media[page] && /* @__PURE__ */ jsx("img", { src: draft.media[page], alt: "", className: "mt-3 w-full border border-border" })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "sticky bottom-0 flex items-center justify-between gap-3 border border-border bg-background p-3", children: [
      /* @__PURE__ */ jsx("span", { className: "text-sm text-muted-foreground", children: dirty ? "You have unpublished changes." : status || "All changes published." }),
      /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: discard,
            disabled: !dirty,
            className: "border border-border px-4 py-2 text-sm disabled:opacity-50",
            children: "Discard"
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: publish,
            disabled: !dirty,
            className: "bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50",
            children: "Publish changes"
          }
        )
      ] })
    ] })
  ] });
}
const adminGetAll = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).handler(createSsrRpc("953556d324aa110aefe4d50eab6568ad9ede9295aff107c91e64260cf639996e"));
const setMockCatalogueEnabled = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  enabled: z.boolean()
}).parse(d)).handler(createSsrRpc("594d28f159a8351134c0b93cee6859a661e18f55733c6c5c9cbc256f15561447"));
const setRenderFeatured = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  id: z.string().uuid(),
  is_featured: z.boolean()
}).parse(d)).handler(createSsrRpc("1f09e68f364035208ea762d184ea50c2282eb9e3bfcf9e9fdc426e9e0286ed5c"));
const deleteRender = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  id: z.string().uuid()
}).parse(d)).handler(createSsrRpc("350386313a572ae4af2dfeb9aee3cf1811b8e730a236bcfe410ab10ffd5a3400"));
const ArtistIn = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  bio: z.string().max(2e3).nullable().optional(),
  era: z.string().max(100).nullable().optional(),
  country: z.string().max(100).nullable().optional(),
  alma_mater: z.string().max(200).nullable().optional(),
  portrait_url: z.string().url().nullable().optional(),
  content_source: z.enum(["live", "mock"]).default("live"),
  gender: z.string().max(20).nullable().optional(),
  domicile_city: z.string().max(100).nullable().optional(),
  date_of_birth: z.string().max(20).nullable().optional(),
  short_code: z.string().max(20).nullable().optional()
});
const saveArtist = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => ArtistIn.parse(d)).handler(createSsrRpc("b013d71985226f4f10d983a8212b053439c325b7f55c5f4dfcbbc233e8a826cb"));
const deleteArtist = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  id: z.string().uuid()
}).parse(d)).handler(createSsrRpc("19a8a929e9ba11f3b2db8dd34ccd133a6a81fcc640234b21e93d6439baff99af"));
const MEDIA$1 = ["oil", "watercolor", "pastel", "sculpture", "photograph", "print", "mixed_media"];
const ArtworkIn = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  artist_id: z.string().uuid().nullable().optional(),
  medium: z.enum(MEDIA$1),
  year: z.string().max(20).nullable().optional(),
  image_url: z.union([z.string().url(), z.literal("")]).nullable().optional().transform((v) => v ?? ""),
  description: z.string().max(2e3).nullable().optional(),
  is_active: z.boolean().default(true),
  content_source: z.enum(["live", "mock"]).default("live"),
  price: z.number().min(0).max(1e8).nullable().optional(),
  currency: z.string().min(3).max(3).regex(/^[A-Z]{3}$/).default("USD"),
  lifecycle_status: z.enum(["in_catalogue", "sold", "withdrawn"]).default("in_catalogue")
});
const saveArtwork = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => ArtworkIn.parse(d)).handler(createSsrRpc("ae31d093f9f3faceb2e65991254d5d74344b580d26e087dddfbfa9880b6a3125"));
const deleteArtwork = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  id: z.string().uuid()
}).parse(d)).handler(createSsrRpc("4c9360b988c3211c82696e922932426ed88fb30feef87ca3d2c7c214d55dd6b5"));
const StyleIn = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable().optional(),
  prompt_fragment: z.string().min(1).max(1e3),
  sort_order: z.number().int().min(0).max(999).default(0),
  is_active: z.boolean().default(true)
});
const saveStyle = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => StyleIn.parse(d)).handler(createSsrRpc("ef65573019a2c0160af7e5220011a959fcc65a597ffc17e1eb4c47561171a1e3"));
const deleteStyle = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  id: z.string().uuid()
}).parse(d)).handler(createSsrRpc("e4e8ab58ac1fb192d2cc6b7da4d983e1884aeae1684145152c44ee98e8a8023d"));
const uploadArtworkImage = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  base64: z.string().min(100).max(2e7),
  filename: z.string().min(1).max(200)
}).parse(d)).handler(createSsrRpc("f5e35a90d8a6aa94e410a93e5b5913eeadb2d5831e29d5f57401adf5b1214512"));
const checkIsAdmin = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).handler(createSsrRpc("d7ab752d5c5280d2ee84a9875749b1cba0d95c7bbe892baa67e4f3368bfac36c"));
const PaneIn = z.object({
  id: z.string().uuid().optional(),
  pane_id: z.string().min(1).max(60).regex(/^[a-z0-9_-]+$/),
  kicker: z.string().min(1).max(120),
  title: z.string().min(1).max(200),
  summary: z.string().min(1).max(500),
  reveal: z.string().max(1e3).default(""),
  image_url: z.string().url().nullable().optional(),
  image_url_mobile: z.string().url().nullable().optional(),
  sort_order: z.number().int().min(0).max(999).default(0),
  is_active: z.boolean().default(true),
  status: z.enum(["draft", "published"]).default("draft")
});
const savePane = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => PaneIn.parse(d)).handler(createSsrRpc("d9c92bfd82ed56572188fa9f25db43222ed80901039b76e271684be9f0663ca5"));
const deletePane = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  id: z.string().uuid()
}).parse(d)).handler(createSsrRpc("ac5a21da7632cc2678781a715ab72a807b49bbf0eae8dc5de453b9bfa9023adb"));
const reorderPanes = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  order: z.array(z.object({
    id: z.string().uuid(),
    sort_order: z.number().int().min(0).max(999)
  })).min(1).max(100)
}).parse(d)).handler(createSsrRpc("c0964fecf255071c488ee302d0c58c128bfda1573452ff41d37468cbe755d6cf"));
const setPaneStatus = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => z.object({
  id: z.string().uuid(),
  status: z.enum(["draft", "published"])
}).parse(d)).handler(createSsrRpc("6335fa69c8bd6ce771377c93234891b3d212e019767d39bdca1f0e5ffd9ba7eb"));
function BrokerageAdmin() {
  const listFn = useServerFn(adminListBrokerRequests);
  const updateFn = useServerFn(adminUpdateBrokerRequest);
  const certFn = useServerFn(adminIssueCertificate);
  const qc = useQueryClient();
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["admin", "brokerage"],
    queryFn: () => listFn()
  });
  const [notes, setNotes] = useState({});
  const [verifyCodes, setVerifyCodes] = useState({});
  async function setStatus(id, status) {
    try {
      await updateFn({ data: { id, status, admin_notes: notes[id] } });
      toast.success(`Updated to ${status}`);
      qc.invalidateQueries({ queryKey: ["admin", "brokerage"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }
  async function issueCert(id) {
    try {
      const res = await certFn({ data: { id } });
      if (res?.verifyCode) setVerifyCodes((v) => ({ ...v, [id]: res.verifyCode }));
      toast.success("Certificate issued");
      qc.invalidateQueries({ queryKey: ["admin", "brokerage"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Certificate failed");
    }
  }
  if (isLoading) return /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Loading brokerage queue…" });
  return /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Approve authentication workflow before certificates reach buyers. Issue cert when status is verified/delivered." }),
    requests.map((r) => /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-border p-4 text-sm", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap justify-between gap-2", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "font-medium", children: String(r.listing_title) }),
          /* @__PURE__ */ jsxs("p", { className: "text-muted-foreground", children: [
            String(r.buyer_name),
            " ↔ ",
            String(r.seller_name),
            " · ",
            String(r.status)
          ] })
        ] }),
        /* @__PURE__ */ jsxs("span", { className: "text-xs uppercase text-muted-foreground", children: [
          String(r.currency),
          " ",
          String(r.transaction_amount ?? "—")
        ] })
      ] }),
      /* @__PURE__ */ jsx(
        "textarea",
        {
          className: "mt-3 w-full rounded border border-border bg-background px-3 py-2 text-sm",
          rows: 2,
          placeholder: "Admin notes",
          value: notes[String(r.id)] ?? "",
          onChange: (e) => setNotes((n) => ({ ...n, [String(r.id)]: e.target.value }))
        }
      ),
      /* @__PURE__ */ jsxs("div", { className: "mt-2 flex flex-wrap gap-2", children: [
        [
          "accepted",
          "verified",
          "in_transit",
          "delivered",
          "certified",
          "rejected",
          "closed"
        ].map((s) => /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            className: "rounded border border-border px-2 py-1 text-xs capitalize hover:bg-muted",
            onClick: () => setStatus(String(r.id), s),
            children: s
          },
          s
        )),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            className: "rounded bg-primary px-3 py-1 text-xs text-primary-foreground",
            onClick: () => issueCert(String(r.id)),
            children: "Issue certificate"
          }
        )
      ] }),
      verifyCodes[String(r.id)] && /* @__PURE__ */ jsxs("p", { className: "mt-2 text-xs text-muted-foreground", children: [
        "Verify:",
        " ",
        /* @__PURE__ */ jsxs(
          "a",
          {
            href: `/verify/cert/${verifyCodes[String(r.id)]}`,
            className: "text-primary underline",
            target: "_blank",
            rel: "noreferrer",
            children: [
              "/verify/cert/",
              verifyCodes[String(r.id)]
            ]
          }
        )
      ] })
    ] }, String(r.id))),
    requests.length === 0 && /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "No brokerage requests yet." })
  ] });
}
const ACTIVE_KEY = "myafriartx_service_pricing_v1";
const DRAFT_KEY = "myafriartx_service_pricing_draft_v1";
const MYAFRIARTX_SERVICE_CATALOG = [
  { id: "catalogue", label: "Public catalogue", mode: "free", priceNgn: 0, guestAllowance: 0 },
  { id: "auctions", label: "Live auctions", mode: "free", priceNgn: 0, guestAllowance: 0 },
  { id: "collateral", label: "Collateral loans", mode: "free", priceNgn: 0, guestAllowance: 0 },
  { id: "verification", label: "Provenance verification", mode: "free", priceNgn: 5e3, guestAllowance: 1 },
  { id: "studio", label: "Artist studio uploads", mode: "free", priceNgn: 0, guestAllowance: 0 }
];
function read(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "{}") || {};
  } catch {
    return {};
  }
}
function write(key, all) {
  localStorage.setItem(key, JSON.stringify(all));
}
function defaults() {
  return Object.fromEntries(MYAFRIARTX_SERVICE_CATALOG.map((s) => [s.id, { ...s, active: true }]));
}
function listActiveServicePricing() {
  const base = defaults();
  const active = { ...base, ...read(ACTIVE_KEY) };
  return MYAFRIARTX_SERVICE_CATALOG.map((s) => ({ ...base[s.id], ...active[s.id], active: active[s.id]?.active !== false }));
}
function getServiceDraft(id) {
  const active = listActiveServicePricing().find((s) => s.id === id);
  const draft = read(DRAFT_KEY)[id];
  return { ...active || defaults()[id], ...draft, id };
}
function saveServiceDraft(id, patch) {
  const draft = read(DRAFT_KEY);
  const prev = getServiceDraft(id);
  draft[id] = { ...prev, ...patch, id, active: false };
  write(DRAFT_KEY, draft);
  return draft[id];
}
function activateServicePricing(id) {
  const draft = read(DRAFT_KEY);
  const row = { ...getServiceDraft(id), ...draft[id] || {}, active: true };
  const active = { ...defaults(), ...read(ACTIVE_KEY), [id]: row };
  write(ACTIVE_KEY, active);
  delete draft[id];
  write(DRAFT_KEY, draft);
  return row;
}
function isServicePricingVisible(row) {
  return row.mode !== "free";
}
function ServicePricingAdmin() {
  const [, tick] = useState(0);
  const refresh = () => tick((n) => n + 1);
  const live = listActiveServicePricing();
  return /* @__PURE__ */ jsxs("div", { className: "space-y-4 rounded-lg border border-border bg-card p-5", children: [
    /* @__PURE__ */ jsx("h3", { className: "font-display text-lg", children: "Service pricing" }),
    /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Free · Freemium · Paid per service. Save draft, then Activate. Pricing hidden when Free." }),
    /* @__PURE__ */ jsx("div", { className: "grid gap-4 md:grid-cols-2", children: MYAFRIARTX_SERVICE_CATALOG.map((cat) => {
      const draft = getServiceDraft(cat.id);
      const activeRow = live.find((s) => s.id === cat.id);
      const showPricing = isServicePricingVisible(draft);
      return /* @__PURE__ */ jsxs("div", { className: "rounded-md border border-border p-4 space-y-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-2", children: [
          /* @__PURE__ */ jsx("strong", { children: cat.label }),
          /* @__PURE__ */ jsx("span", { className: "text-xs uppercase tracking-wide text-muted-foreground", children: draft.active === false ? "draft" : activeRow?.mode || "free" })
        ] }),
        /* @__PURE__ */ jsxs("label", { className: "block text-xs text-muted-foreground", children: [
          "Mode",
          /* @__PURE__ */ jsxs(
            "select",
            {
              className: "mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm",
              value: draft.mode,
              onChange: (e) => {
                saveServiceDraft(cat.id, { mode: e.target.value });
                refresh();
              },
              children: [
                /* @__PURE__ */ jsx("option", { value: "free", children: "Free" }),
                /* @__PURE__ */ jsx("option", { value: "freemium", children: "Freemium" }),
                /* @__PURE__ */ jsx("option", { value: "paid", children: "Paid" })
              ]
            }
          )
        ] }),
        draft.mode === "freemium" && /* @__PURE__ */ jsxs("label", { className: "block text-xs text-muted-foreground", children: [
          "Guest allowance",
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "number",
              min: 0,
              className: "mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm",
              value: draft.guestAllowance,
              onChange: (e) => {
                saveServiceDraft(cat.id, { guestAllowance: +e.target.value });
                refresh();
              }
            }
          )
        ] }),
        showPricing && draft.mode === "paid" && /* @__PURE__ */ jsxs("label", { className: "block text-xs text-muted-foreground", children: [
          "Price (₦)",
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "number",
              min: 0,
              className: "mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm",
              value: draft.priceNgn,
              onChange: (e) => {
                saveServiceDraft(cat.id, { priceNgn: +e.target.value });
                refresh();
              }
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              className: "rounded-md border border-border px-3 py-1.5 text-sm",
              onClick: () => {
                saveServiceDraft(cat.id, draft);
                refresh();
              },
              children: "Save"
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              className: "rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground",
              onClick: () => {
                activateServicePricing(cat.id);
                refresh();
              },
              children: "Activate"
            }
          )
        ] })
      ] }, cat.id);
    }) })
  ] });
}
function KycAdmin() {
  const listFn = useServerFn(adminListVerifications);
  const reviewFn = useServerFn(adminReviewVerification);
  const docUrlFn = useServerFn(adminGetDocumentUrl);
  const qc = useQueryClient();
  const [filter, setFilter] = useState("pending");
  const [reasons, setReasons] = useState({});
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin", "kyc", filter],
    queryFn: () => listFn({ data: { status: filter } })
  });
  const review = async (userId, decision) => {
    try {
      await reviewFn({ data: { userId, decision, reason: reasons[userId] } });
      toast.success(decision === "verified" ? "Member verified" : "Submission rejected");
      qc.invalidateQueries({ queryKey: ["admin", "kyc"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Review failed");
    }
  };
  const viewDocument = async (userId) => {
    try {
      const { url } = await docUrlFn({ data: { userId } });
      window.open(url, "_blank", "noopener");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open document");
    }
  };
  return /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [
      /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Review identity documents before granting collateral and high-value escrow access. Documents open via 10-minute signed URLs." }),
      /* @__PURE__ */ jsx("div", { className: "flex gap-1 rounded-md border border-border p-1 text-xs", children: ["pending", "verified", "rejected", "all"].map((f) => /* @__PURE__ */ jsx(
        "button",
        {
          onClick: () => setFilter(f),
          className: `rounded px-2 py-1 capitalize ${filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`,
          children: f
        },
        f
      )) })
    ] }),
    isLoading && /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Loading queue…" }),
    rows.map((r) => /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-border p-4 text-sm", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-start justify-between gap-2", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs("p", { className: "font-medium", children: [
            r.full_name ?? r.display_name,
            " ",
            /* @__PURE__ */ jsxs("span", { className: "text-muted-foreground", children: [
              "(",
              r.display_name,
              ")"
            ] })
          ] }),
          /* @__PURE__ */ jsxs("p", { className: "text-muted-foreground", children: [
            String(r.id_type ?? "—").replace(/_/g, " "),
            " · ref ",
            r.id_reference ?? "—",
            " · submitted ",
            r.submitted_at ? new Date(r.submitted_at).toLocaleString() : "—"
          ] }),
          r.rejected_reason && /* @__PURE__ */ jsxs("p", { className: "mt-1 text-destructive", children: [
            "Rejected: ",
            r.rejected_reason
          ] })
        ] }),
        /* @__PURE__ */ jsx(
          "span",
          {
            className: `rounded px-2 py-0.5 text-xs uppercase tracking-wide ${r.status === "verified" ? "bg-emerald-500/15 text-emerald-700" : r.status === "pending" ? "bg-amber-500/15 text-amber-700" : "bg-destructive/15 text-destructive"}`,
            children: r.status
          }
        )
      ] }),
      r.status === "pending" && /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx(
          "input",
          {
            className: "mt-3 w-full rounded border border-border bg-background px-3 py-2 text-sm",
            placeholder: "Rejection reason (required to reject — shown to the member)",
            value: reasons[r.user_id] ?? "",
            onChange: (e) => setReasons((n) => ({ ...n, [r.user_id]: e.target.value }))
          }
        ),
        /* @__PURE__ */ jsxs("div", { className: "mt-2 flex flex-wrap gap-2", children: [
          r.document_path && /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: () => viewDocument(r.user_id),
              className: "rounded border border-border px-3 py-1.5 text-xs hover:bg-muted",
              children: "View document"
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: () => review(r.user_id, "verified"),
              className: "rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white",
              children: "Approve"
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: () => review(r.user_id, "rejected"),
              className: "rounded bg-destructive px-3 py-1.5 text-xs font-medium text-white",
              children: "Reject"
            }
          )
        ] })
      ] })
    ] }, r.user_id)),
    !isLoading && rows.length === 0 && /* @__PURE__ */ jsxs("p", { className: "text-sm text-muted-foreground", children: [
      "No ",
      filter === "all" ? "" : filter,
      " submissions."
    ] })
  ] });
}
function DisputesAdmin() {
  const listFn = useServerFn(adminListDisputes);
  const resolveFn = useServerFn(adminResolveDispute);
  const qc = useQueryClient();
  const [filter, setFilter] = useState("open");
  const [resolutions, setResolutions] = useState({});
  const [refunds, setRefunds] = useState({});
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin", "disputes", filter],
    queryFn: () => listFn({ data: { status: filter } })
  });
  const resolve = async (disputeId, outcome) => {
    const resolution = (resolutions[disputeId] ?? "").trim();
    if (resolution.length < 10) return toast.error("Write a resolution note (min 10 characters).");
    try {
      await resolveFn({
        data: {
          disputeId,
          outcome,
          resolution,
          refundEscrow: outcome === "resolved" && (refunds[disputeId] ?? false)
        }
      });
      toast.success(outcome === "resolved" ? "Dispute resolved" : "Dispute rejected");
      qc.invalidateQueries({ queryKey: ["admin", "disputes"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Resolution failed");
    }
  };
  return /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [
      /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Open disputes freeze any escrow hold on the payment. Resolving with refund releases the escrow back to the buyer and marks the payment refunded — atomically." }),
      /* @__PURE__ */ jsx("div", { className: "flex gap-1 rounded-md border border-border p-1 text-xs", children: ["open", "resolved", "rejected", "all"].map((f) => /* @__PURE__ */ jsx(
        "button",
        {
          onClick: () => setFilter(f),
          className: `rounded px-2 py-1 capitalize ${filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`,
          children: f
        },
        f
      )) })
    ] }),
    isLoading && /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Loading disputes…" }),
    rows.map((d) => {
      const payment = d.payment;
      return /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-border p-4 text-sm", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-start justify-between gap-2", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsxs("p", { className: "font-medium", children: [
              payment?.metadata?.title ?? payment?.purpose ?? "Payment",
              " · ₦",
              Number(payment?.amount_ngn ?? 0).toLocaleString()
            ] }),
            /* @__PURE__ */ jsxs("p", { className: "text-muted-foreground", children: [
              "by ",
              String(d.opener_name),
              " · ",
              new Date(String(d.created_at)).toLocaleString(),
              " · ref ",
              payment?.provider_ref ?? "—",
              d.escrow_hold_id ? " · escrow attached" : ""
            ] })
          ] }),
          /* @__PURE__ */ jsx(
            "span",
            {
              className: `rounded px-2 py-0.5 text-xs uppercase tracking-wide ${d.status === "open" ? "bg-amber-500/15 text-amber-700" : d.status === "resolved" ? "bg-emerald-500/15 text-emerald-700" : "bg-destructive/15 text-destructive"}`,
              children: String(d.status)
            }
          )
        ] }),
        /* @__PURE__ */ jsx("p", { className: "mt-2 rounded bg-muted/40 p-3", children: String(d.reason) }),
        d.resolution && /* @__PURE__ */ jsxs("p", { className: "mt-2 text-muted-foreground", children: [
          /* @__PURE__ */ jsx("strong", { children: "Resolution:" }),
          " ",
          String(d.resolution)
        ] }),
        d.status === "open" && /* @__PURE__ */ jsxs("div", { className: "mt-3 space-y-2", children: [
          /* @__PURE__ */ jsx(
            "textarea",
            {
              rows: 2,
              className: "w-full rounded border border-border bg-background px-3 py-2 text-sm",
              placeholder: "Resolution note (shown to the member)",
              value: resolutions[String(d.id)] ?? "",
              onChange: (e) => setResolutions((n) => ({ ...n, [String(d.id)]: e.target.value }))
            }
          ),
          /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-3", children: [
            d.escrow_hold_id && /* @__PURE__ */ jsxs("label", { className: "flex items-center gap-2 text-xs", children: [
              /* @__PURE__ */ jsx(
                "input",
                {
                  type: "checkbox",
                  checked: refunds[String(d.id)] ?? false,
                  onChange: (e) => setRefunds((n) => ({ ...n, [String(d.id)]: e.target.checked }))
                }
              ),
              "Refund escrow to buyer"
            ] }),
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: () => resolve(String(d.id), "resolved"),
                className: "rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white",
                children: "Resolve in buyer's favour"
              }
            ),
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: () => resolve(String(d.id), "rejected"),
                className: "rounded bg-destructive px-3 py-1.5 text-xs font-medium text-white",
                children: "Reject dispute"
              }
            )
          ] })
        ] })
      ] }, String(d.id));
    }),
    !isLoading && rows.length === 0 && /* @__PURE__ */ jsxs("p", { className: "text-sm text-muted-foreground", children: [
      "No ",
      filter === "all" ? "" : filter,
      " disputes."
    ] })
  ] });
}
function AdminTesterQueue() {
  const [tick, setTick] = useState(0);
  const pending = listPendingQueue("myafriartx");
  const approved = listApprovedAdmins();
  const bump = () => setTick((n) => n + 1);
  return /* @__PURE__ */ jsxs("div", { id: "admintester-queue", className: "mb-6 rounded-lg border border-amber-200 bg-amber-50/50 p-4 text-sm scroll-mt-24", children: [
    /* @__PURE__ */ jsx("h2", { className: "font-semibold", children: "ADMINTESTER approvals" }),
    /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-xs mt-1", children: AWAITING_MSG }),
    pending.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-muted-foreground mt-2", children: "No pending requests." }) : /* @__PURE__ */ jsx("ul", { className: "mt-3 space-y-2", children: pending.map((p) => /* @__PURE__ */ jsxs("li", { className: "flex items-center justify-between gap-2", children: [
      /* @__PURE__ */ jsxs("span", { children: [
        p.identity || p.email,
        /* @__PURE__ */ jsx("span", { className: "block text-xs text-muted-foreground", children: new Date(p.requestedAt).toLocaleString() })
      ] }),
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          className: "rounded bg-primary px-3 py-1 text-primary-foreground text-xs",
          onClick: () => {
            approveAdmin(OWNER_EMAIL, p.email);
            bump();
          },
          children: "Approve"
        }
      )
    ] }, `${p.email}-${p.requestedAt}`)) }),
    approved.length > 0 && /* @__PURE__ */ jsxs("div", { className: "mt-4 border-t pt-3", children: [
      /* @__PURE__ */ jsx("p", { className: "font-medium", children: "Approved" }),
      approved.map((a) => /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between py-1", children: [
        /* @__PURE__ */ jsx("span", { children: a.email }),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            className: "text-xs text-destructive",
            onClick: () => {
              revokeAdmin(OWNER_EMAIL, a.email);
              bump();
            },
            children: "Revoke"
          }
        )
      ] }, a.email))
    ] })
  ] }, tick);
}
const MEDIA = ["oil", "watercolor", "pastel", "sculpture", "photograph", "print", "mixed_media"];
function Admin() {
  const navigate = useNavigate();
  const gate = adminGateActive();
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    const {
      data: sub
    } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));
    supabase.auth.getSession().then(({
      data
    }) => {
      setAuthed(!!data.session);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (ready && !authed && !gate) navigate({
      to: "/login"
    });
  }, [ready, authed, gate, navigate]);
  const checkAdmin = useServerFn(checkIsAdmin);
  const {
    data: roleData,
    isLoading: roleLoading
  } = useQuery({
    queryKey: ["isAdmin"],
    queryFn: () => checkAdmin(),
    enabled: authed && !gate
  });
  if (gate) {
    return /* @__PURE__ */ jsx(AdminInner, {});
  }
  if (!ready || !authed || roleLoading) {
    return /* @__PURE__ */ jsx("div", { className: "flex min-h-screen items-center justify-center text-muted-foreground", children: "Loading…" });
  }
  if (!roleData?.isAdmin) {
    return /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-xl px-6 py-20 text-center", children: [
      /* @__PURE__ */ jsx("h1", { className: "font-display text-3xl", children: "Admin only" }),
      /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: "Your account does not have the admin role. Ask an existing admin to grant it via the user_roles table." }),
      /* @__PURE__ */ jsx(Link, { to: "/studio", className: "mt-6 inline-block rounded-md border border-border px-4 py-2 text-sm hover:bg-accent", children: "Back to Studio" })
    ] });
  }
  return /* @__PURE__ */ jsx(AdminInner, {});
}
function AdminInner() {
  const qc = useQueryClient();
  const getAll = useServerFn(adminGetAll);
  const {
    data,
    isLoading
  } = useQuery({
    queryKey: ["admin", "all"],
    queryFn: () => getAll()
  });
  const [tab, setTab] = useState("artworks");
  const [lookupSeed, setLookupSeed] = useState("");
  const refresh = () => qc.invalidateQueries({
    queryKey: ["admin", "all"]
  });
  const openLookup = (q) => {
    setLookupSeed(q);
    setTab("lookup");
  };
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-background", children: [
    /* @__PURE__ */ jsx(AdminTesterQueue, {}),
    /* @__PURE__ */ jsx("header", { className: "border-b border-border", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto flex max-w-6xl items-center justify-between px-6 py-4", children: [
      /* @__PURE__ */ jsx(Link, { to: "/", className: "font-display text-xl", children: "MyAfriart" }),
      /* @__PURE__ */ jsxs("nav", { className: "flex items-center gap-4 text-sm", children: [
        /* @__PURE__ */ jsx(Link, { to: "/studio", className: "text-muted-foreground hover:text-foreground", children: "Studio" }),
        /* @__PURE__ */ jsx("span", { className: "font-medium", children: "Admin" }),
        /* @__PURE__ */ jsx("button", { onClick: () => {
          clearAdminGate();
          void supabase.auth.signOut();
          window.location.href = "/login";
        }, className: "text-muted-foreground hover:text-foreground", children: "Sign out" })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxs("main", { className: "mx-auto max-w-6xl px-6 py-10", children: [
      /* @__PURE__ */ jsx("h1", { className: "font-display text-3xl", children: "Catalogue admin" }),
      /* @__PURE__ */ jsx("div", { className: "mt-6 flex flex-wrap gap-1 border-b border-border", children: ["studio", "settings", "artworks", "artists", "styles", "renders", "panes", "allocation", "lookup", "transactions", "analytics", "brokerage", "collateral", "kyc", "disputes", "pricing"].map((t) => /* @__PURE__ */ jsx("button", { onClick: () => setTab(t), className: `-mb-px border-b-2 px-4 py-2 text-sm capitalize ${tab === t ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`, children: t }, t)) }),
      isLoading ? /* @__PURE__ */ jsx("div", { className: "py-10 text-sm text-muted-foreground", children: "Loading…" }) : /* @__PURE__ */ jsxs("div", { className: "py-6", children: [
        tab === "studio" && /* @__PURE__ */ jsx(ContentStudio, {}),
        tab === "settings" && /* @__PURE__ */ jsx(SettingsAdmin, { data, onChange: refresh }),
        tab === "artworks" && /* @__PURE__ */ jsx(ArtworksAdmin, { data, onChange: refresh, onLookup: openLookup }),
        tab === "artists" && /* @__PURE__ */ jsx(ArtistsAdmin, { data, onChange: refresh, onLookup: openLookup }),
        tab === "styles" && /* @__PURE__ */ jsx(StylesAdmin, { data, onChange: refresh }),
        tab === "renders" && /* @__PURE__ */ jsx(RendersAdmin, { data, onChange: refresh }),
        tab === "panes" && /* @__PURE__ */ jsx(PanesAdmin, { data, onChange: refresh }),
        tab === "allocation" && /* @__PURE__ */ jsx(AllocationAdmin, { data }),
        tab === "lookup" && /* @__PURE__ */ jsx(LookupAdmin, { seed: lookupSeed, onSeedConsumed: () => setLookupSeed("") }),
        tab === "transactions" && /* @__PURE__ */ jsx(TransactionsAdmin, { onLookup: openLookup }),
        tab === "analytics" && /* @__PURE__ */ jsx(AnalyticsAdmin, {}),
        tab === "brokerage" && /* @__PURE__ */ jsx(BrokerageAdmin, {}),
        tab === "collateral" && /* @__PURE__ */ jsx(CollateralAdminPanel, {}),
        tab === "kyc" && /* @__PURE__ */ jsx(KycAdmin, {}),
        tab === "disputes" && /* @__PURE__ */ jsx(DisputesAdmin, {}),
        tab === "pricing" && /* @__PURE__ */ jsx(ServicePricingAdmin, {})
      ] })
    ] })
  ] });
}
function SettingsAdmin({
  data,
  onChange
}) {
  const setMock = useServerFn(setMockCatalogueEnabled);
  const enabled = data.settings?.mock_catalogue_enabled !== false;
  const mockArtists = (data.artists ?? []).filter((a) => a.content_source === "mock").length;
  const liveArtists = (data.artists ?? []).filter((a) => a.content_source !== "mock").length;
  const mockArtworks = (data.artworks ?? []).filter((a) => a.content_source === "mock").length;
  const liveArtworks = (data.artworks ?? []).filter((a) => a.content_source !== "mock").length;
  const mToggle = useMutation({
    mutationFn: (next) => setMock({
      data: {
        enabled: next
      }
    }),
    onSuccess: (_d, next) => {
      toast.success(next ? "Mock catalogue enabled" : "Live catalogue enabled");
      onChange();
    },
    onError: (e) => toast.error(e.message)
  });
  return /* @__PURE__ */ jsx("div", { className: "max-w-3xl space-y-4", children: /* @__PURE__ */ jsxs("div", { className: "rounded border border-border bg-card p-5", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-start justify-between gap-4", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h2", { className: "font-display text-xl", children: "Catalogue source" }),
        /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "This controls what the public catalogue and studio pull from." })
      ] }),
      /* @__PURE__ */ jsx("button", { type: "button", disabled: mToggle.isPending, onClick: () => mToggle.mutate(!enabled), className: `rounded-md px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50 ${enabled ? "bg-primary" : "bg-foreground"}`, children: enabled ? "Using mock catalogue" : "Using live catalogue" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "mt-5 grid gap-3 sm:grid-cols-2", children: [
      /* @__PURE__ */ jsxs("div", { className: `rounded border p-4 ${enabled ? "border-primary bg-primary/5" : "border-border bg-background"}`, children: [
        /* @__PURE__ */ jsx("div", { className: "text-xs uppercase tracking-wider text-muted-foreground", children: "Mock database" }),
        /* @__PURE__ */ jsxs("div", { className: "mt-2 font-display text-2xl", children: [
          mockArtists,
          " profiles · ",
          mockArtworks,
          " works"
        ] }),
        /* @__PURE__ */ jsx("p", { className: "mt-1 text-xs text-muted-foreground", children: "Switch this off when real artwork records are ready." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: `rounded border p-4 ${!enabled ? "border-primary bg-primary/5" : "border-border bg-background"}`, children: [
        /* @__PURE__ */ jsx("div", { className: "text-xs uppercase tracking-wider text-muted-foreground", children: "Live database" }),
        /* @__PURE__ */ jsxs("div", { className: "mt-2 font-display text-2xl", children: [
          liveArtists,
          " profiles · ",
          liveArtworks,
          " works"
        ] }),
        /* @__PURE__ */ jsx("p", { className: "mt-1 text-xs text-muted-foreground", children: "Only live records appear when mock catalogue is off." })
      ] })
    ] })
  ] }) });
}
function ArtistsAdmin({
  data,
  onChange,
  onLookup
}) {
  const save = useServerFn(saveArtist);
  const del = useServerFn(deleteArtist);
  const [editing, setEditing] = useState(null);
  const mSave = useMutation({
    mutationFn: (v) => save({
      data: v
    }),
    onSuccess: () => {
      toast.success("Saved");
      setEditing(null);
      onChange();
    },
    onError: (e) => toast.error(e.message)
  });
  const mDel = useMutation({
    mutationFn: (id) => del({
      data: {
        id
      }
    }),
    onSuccess: () => {
      toast.success("Deleted");
      onChange();
    },
    onError: (e) => toast.error(e.message)
  });
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsx("div", { className: "mb-4 flex justify-end", children: /* @__PURE__ */ jsx("button", { onClick: () => setEditing({
      name: "",
      bio: "",
      era: "",
      country: "",
      alma_mater: "",
      portrait_url: "",
      content_source: "live",
      gender: "",
      domicile_city: "",
      date_of_birth: "",
      short_code: ""
    }), className: "rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90", children: "+ New artist" }) }),
    /* @__PURE__ */ jsxs("table", { className: "w-full text-sm", children: [
      /* @__PURE__ */ jsx("thead", { className: "text-left text-xs uppercase tracking-wider text-muted-foreground", children: /* @__PURE__ */ jsxs("tr", { children: [
        /* @__PURE__ */ jsx("th", { className: "py-2" }),
        /* @__PURE__ */ jsx("th", { children: "ID" }),
        /* @__PURE__ */ jsx("th", { children: "Name" }),
        /* @__PURE__ */ jsx("th", { children: "Country" }),
        /* @__PURE__ */ jsx("th", { children: "Era" }),
        /* @__PURE__ */ jsx("th", { children: "Alma mater" }),
        /* @__PURE__ */ jsx("th", {})
      ] }) }),
      /* @__PURE__ */ jsx("tbody", { children: data.artists.map((a) => /* @__PURE__ */ jsxs("tr", { className: "border-t border-border", children: [
        /* @__PURE__ */ jsx("td", { className: "py-2 pr-2", children: /* @__PURE__ */ jsx("img", { src: a.portrait_url || artistDefault, alt: a.name, loading: "lazy", onError: (e) => {
          e.currentTarget.src = artistDefault;
        }, className: "h-10 w-10 rounded-md border border-border bg-muted object-contain" }) }),
        /* @__PURE__ */ jsx("td", { className: "py-2 font-mono text-xs", children: onLookup ? /* @__PURE__ */ jsx("button", { onClick: () => onLookup(a.short_code || a.id), className: "text-primary underline", children: a.short_code ?? a.id.slice(0, 8) }) : a.short_code ?? a.id.slice(0, 8) }),
        /* @__PURE__ */ jsxs("td", { className: "py-2", children: [
          a.name,
          /* @__PURE__ */ jsx("span", { className: "ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground", children: a.content_source ?? "live" })
        ] }),
        /* @__PURE__ */ jsx("td", { className: "text-muted-foreground", children: a.country ?? "—" }),
        /* @__PURE__ */ jsx("td", { className: "text-muted-foreground", children: a.era ?? "—" }),
        /* @__PURE__ */ jsx("td", { className: "text-muted-foreground", children: a.alma_mater ?? "—" }),
        /* @__PURE__ */ jsxs("td", { className: "text-right", children: [
          /* @__PURE__ */ jsx("button", { onClick: () => setEditing(a), className: "mr-2 text-xs underline", children: "Edit" }),
          /* @__PURE__ */ jsx("button", { onClick: () => confirm("Delete?") && mDel.mutate(a.id), className: "text-xs text-destructive underline", children: "Delete" })
        ] })
      ] }, a.id)) })
    ] }),
    editing && /* @__PURE__ */ jsxs(Modal, { onClose: () => setEditing(null), title: editing.id ? "Edit artist" : "New artist", children: [
      /* @__PURE__ */ jsx(Field, { label: "Name", children: /* @__PURE__ */ jsx("input", { className: "inp", value: editing.name ?? "", onChange: (e) => setEditing({
        ...editing,
        name: e.target.value
      }) }) }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
        /* @__PURE__ */ jsx(Field, { label: "Country of origin", children: /* @__PURE__ */ jsx("input", { className: "inp", placeholder: "e.g. Nigeria", value: editing.country ?? "", onChange: (e) => setEditing({
          ...editing,
          country: e.target.value
        }) }) }),
        /* @__PURE__ */ jsx(Field, { label: "Era", children: /* @__PURE__ */ jsx("input", { className: "inp", value: editing.era ?? "", onChange: (e) => setEditing({
          ...editing,
          era: e.target.value
        }) }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
        /* @__PURE__ */ jsx(Field, { label: "Gender", children: /* @__PURE__ */ jsx("input", { className: "inp", placeholder: "e.g. male, female, non-binary", value: editing.gender ?? "", onChange: (e) => setEditing({
          ...editing,
          gender: e.target.value
        }) }) }),
        /* @__PURE__ */ jsx(Field, { label: "Date of birth", children: /* @__PURE__ */ jsx("input", { className: "inp", type: "date", value: editing.date_of_birth ?? "", onChange: (e) => setEditing({
          ...editing,
          date_of_birth: e.target.value
        }) }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
        /* @__PURE__ */ jsx(Field, { label: "Domicile city", children: /* @__PURE__ */ jsx("input", { className: "inp", placeholder: "e.g. Lagos", value: editing.domicile_city ?? "", onChange: (e) => setEditing({
          ...editing,
          domicile_city: e.target.value
        }) }) }),
        /* @__PURE__ */ jsx(Field, { label: "Short code", children: /* @__PURE__ */ jsx("input", { className: "inp", placeholder: "e.g. ART-000001", value: editing.short_code ?? "", onChange: (e) => setEditing({
          ...editing,
          short_code: e.target.value
        }) }) })
      ] }),
      /* @__PURE__ */ jsx(Field, { label: "Alma mater", children: /* @__PURE__ */ jsx("input", { className: "inp", placeholder: "e.g. Yaba College of Technology", value: editing.alma_mater ?? "", onChange: (e) => setEditing({
        ...editing,
        alma_mater: e.target.value
      }) }) }),
      /* @__PURE__ */ jsx(Field, { label: "Catalogue source", children: /* @__PURE__ */ jsxs("select", { className: "inp", value: editing.content_source ?? "live", onChange: (e) => setEditing({
        ...editing,
        content_source: e.target.value
      }), children: [
        /* @__PURE__ */ jsx("option", { value: "live", children: "Live database" }),
        /* @__PURE__ */ jsx("option", { value: "mock", children: "Mock database" })
      ] }) }),
      /* @__PURE__ */ jsx(Field, { label: "Portrait URL", children: /* @__PURE__ */ jsx("input", { className: "inp", value: editing.portrait_url ?? "", onChange: (e) => setEditing({
        ...editing,
        portrait_url: e.target.value
      }) }) }),
      /* @__PURE__ */ jsx(Field, { label: "Bio", children: /* @__PURE__ */ jsx("textarea", { className: "inp h-24", value: editing.bio ?? "", onChange: (e) => setEditing({
        ...editing,
        bio: e.target.value
      }) }) }),
      /* @__PURE__ */ jsxs("div", { className: "mt-4 flex justify-end gap-2", children: [
        /* @__PURE__ */ jsx("button", { onClick: () => setEditing(null), className: "rounded-md border border-border px-3 py-1.5 text-sm", children: "Cancel" }),
        /* @__PURE__ */ jsx("button", { disabled: mSave.isPending, onClick: () => mSave.mutate(cleanArtist(editing)), className: "rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50", children: "Save" })
      ] })
    ] })
  ] });
}
const cleanArtist = (a) => ({
  id: a.id,
  name: a.name,
  bio: a.bio || null,
  era: a.era || null,
  country: a.country || null,
  alma_mater: a.alma_mater || null,
  portrait_url: a.portrait_url || null,
  content_source: a.content_source === "mock" ? "mock" : "live",
  gender: a.gender || null,
  domicile_city: a.domicile_city || null,
  date_of_birth: a.date_of_birth || null,
  short_code: a.short_code || null
});
function ArtworksAdmin({
  data,
  onChange,
  onLookup
}) {
  const save = useServerFn(saveArtwork);
  const del = useServerFn(deleteArtwork);
  const upload = useServerFn(uploadArtworkImage);
  const [editing, setEditing] = useState(null);
  const [uploading, setUploading] = useState(false);
  const mSave = useMutation({
    mutationFn: (v) => save({
      data: v
    }),
    onSuccess: () => {
      toast.success("Saved");
      setEditing(null);
      onChange();
    },
    onError: (e) => toast.error(e.message)
  });
  const mDel = useMutation({
    mutationFn: (id) => del({
      data: {
        id
      }
    }),
    onSuccess: () => {
      toast.success("Deleted");
      onChange();
    },
    onError: (e) => toast.error(e.message)
  });
  async function onFile(f) {
    setUploading(true);
    try {
      const b64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result));
        r.onerror = () => rej(r.error);
        r.readAsDataURL(f);
      });
      const {
        url
      } = await upload({
        data: {
          base64: b64,
          filename: f.name
        }
      });
      setEditing((e) => ({
        ...e,
        image_url: url
      }));
      toast.success("Image uploaded");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  }
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsx("div", { className: "mb-4 flex justify-end", children: /* @__PURE__ */ jsx("button", { onClick: () => setEditing({
      title: "",
      medium: "oil",
      image_url: "",
      artist_id: null,
      year: "",
      description: "",
      is_active: true,
      content_source: "live",
      price: null,
      currency: "USD",
      lifecycle_status: "in_catalogue"
    }), className: "rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90", children: "+ New artwork" }) }),
    /* @__PURE__ */ jsx("div", { className: "grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4", children: data.artworks.map((a, index) => {
      const artist = data.artists.find((x) => x.id === a.artist_id);
      return /* @__PURE__ */ jsxs("div", { className: "overflow-hidden rounded border border-border bg-card", children: [
        /* @__PURE__ */ jsx("img", { src: a.image_url || localImageForKey(a.id || a.title, index), alt: a.title, className: "aspect-square w-full bg-muted object-contain" }),
        /* @__PURE__ */ jsxs("div", { className: "p-3", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-2", children: [
            /* @__PURE__ */ jsx("div", { className: "truncate text-sm font-medium", children: a.title }),
            onLookup ? /* @__PURE__ */ jsx("button", { onClick: () => onLookup(a.short_code || a.id), className: "font-mono text-[10px] text-primary underline shrink-0", children: a.short_code ?? a.id.slice(0, 8) }) : /* @__PURE__ */ jsx("span", { className: "font-mono text-[10px] text-muted-foreground shrink-0", children: a.short_code ?? a.id.slice(0, 8) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "truncate text-xs text-muted-foreground", children: [
            artist?.name ?? "Unknown",
            " · ",
            a.medium,
            " · ",
            a.lifecycle_status ?? "in_catalogue",
            " ",
            "· views ",
            a.view_count ?? 0
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "mt-2 flex justify-between text-xs", children: [
            /* @__PURE__ */ jsx("button", { onClick: () => setEditing(a), className: "underline", children: "Edit" }),
            /* @__PURE__ */ jsx("button", { onClick: () => confirm("Delete?") && mDel.mutate(a.id), className: "text-destructive underline", children: "Delete" })
          ] })
        ] })
      ] }, a.id);
    }) }),
    editing && /* @__PURE__ */ jsxs(Modal, { onClose: () => setEditing(null), title: editing.id ? "Edit artwork" : "New artwork", children: [
      /* @__PURE__ */ jsx(Field, { label: "Title", children: /* @__PURE__ */ jsx("input", { className: "inp", value: editing.title ?? "", onChange: (e) => setEditing({
        ...editing,
        title: e.target.value
      }) }) }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
        /* @__PURE__ */ jsx(Field, { label: "Medium", children: /* @__PURE__ */ jsx("select", { className: "inp", value: editing.medium, onChange: (e) => setEditing({
          ...editing,
          medium: e.target.value
        }), children: MEDIA.map((m) => /* @__PURE__ */ jsx("option", { value: m, children: m }, m)) }) }),
        /* @__PURE__ */ jsx(Field, { label: "Artist", children: /* @__PURE__ */ jsxs("select", { className: "inp", value: editing.artist_id ?? "", onChange: (e) => setEditing({
          ...editing,
          artist_id: e.target.value || null
        }), children: [
          /* @__PURE__ */ jsx("option", { value: "", children: "— none —" }),
          data.artists.map((a) => /* @__PURE__ */ jsx("option", { value: a.id, children: a.name }, a.id))
        ] }) }),
        /* @__PURE__ */ jsx(Field, { label: "Year", children: /* @__PURE__ */ jsx("input", { className: "inp", value: editing.year ?? "", onChange: (e) => setEditing({
          ...editing,
          year: e.target.value
        }) }) }),
        /* @__PURE__ */ jsx(Field, { label: "Active", children: /* @__PURE__ */ jsxs("select", { className: "inp", value: editing.is_active ? "1" : "0", onChange: (e) => setEditing({
          ...editing,
          is_active: e.target.value === "1"
        }), children: [
          /* @__PURE__ */ jsx("option", { value: "1", children: "Active" }),
          /* @__PURE__ */ jsx("option", { value: "0", children: "Hidden" })
        ] }) }),
        /* @__PURE__ */ jsx(Field, { label: "Catalogue source", children: /* @__PURE__ */ jsxs("select", { className: "inp", value: editing.content_source ?? "live", onChange: (e) => setEditing({
          ...editing,
          content_source: e.target.value
        }), children: [
          /* @__PURE__ */ jsx("option", { value: "live", children: "Live database" }),
          /* @__PURE__ */ jsx("option", { value: "mock", children: "Mock database" })
        ] }) }),
        /* @__PURE__ */ jsx(Field, { label: "Price", children: /* @__PURE__ */ jsx("input", { className: "inp", type: "number", min: 0, step: "0.01", value: editing.price ?? "", onChange: (e) => setEditing({
          ...editing,
          price: e.target.value === "" ? null : Number(e.target.value)
        }) }) }),
        /* @__PURE__ */ jsx(Field, { label: "Currency", children: /* @__PURE__ */ jsxs("select", { className: "inp", value: editing.currency ?? "USD", onChange: (e) => setEditing({
          ...editing,
          currency: e.target.value
        }), children: [
          /* @__PURE__ */ jsx("option", { value: "USD", children: "USD" }),
          /* @__PURE__ */ jsx("option", { value: "NGN", children: "NGN" }),
          /* @__PURE__ */ jsx("option", { value: "EUR", children: "EUR" }),
          /* @__PURE__ */ jsx("option", { value: "GBP", children: "GBP" }),
          /* @__PURE__ */ jsx("option", { value: "ZAR", children: "ZAR" }),
          /* @__PURE__ */ jsx("option", { value: "KES", children: "KES" }),
          /* @__PURE__ */ jsx("option", { value: "GHS", children: "GHS" })
        ] }) }),
        /* @__PURE__ */ jsx(Field, { label: "Lifecycle status", children: /* @__PURE__ */ jsxs("select", { className: "inp", value: editing.lifecycle_status ?? "in_catalogue", onChange: (e) => setEditing({
          ...editing,
          lifecycle_status: e.target.value
        }), children: [
          /* @__PURE__ */ jsx("option", { value: "in_catalogue", children: "In catalogue" }),
          /* @__PURE__ */ jsx("option", { value: "sold", children: "Sold" }),
          /* @__PURE__ */ jsx("option", { value: "withdrawn", children: "Withdrawn" })
        ] }) })
      ] }),
      /* @__PURE__ */ jsx(Field, { label: "Image", children: /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsx("img", { src: editing.image_url || localImageForKey(editing.id || editing.title), alt: "", className: "h-32 w-32 rounded bg-muted object-contain" }),
        /* @__PURE__ */ jsx("input", { type: "file", accept: "image/*", onChange: (e) => e.target.files?.[0] && onFile(e.target.files[0]) }),
        uploading && /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground", children: "Uploading…" }),
        /* @__PURE__ */ jsx("input", { className: "inp", placeholder: "…or paste an image URL", value: editing.image_url ?? "", onChange: (e) => setEditing({
          ...editing,
          image_url: e.target.value
        }) })
      ] }) }),
      /* @__PURE__ */ jsx(Field, { label: "Description", children: /* @__PURE__ */ jsx("textarea", { className: "inp h-20", value: editing.description ?? "", onChange: (e) => setEditing({
        ...editing,
        description: e.target.value
      }) }) }),
      /* @__PURE__ */ jsxs("div", { className: "mt-4 flex justify-end gap-2", children: [
        /* @__PURE__ */ jsx("button", { onClick: () => setEditing(null), className: "rounded-md border border-border px-3 py-1.5 text-sm", children: "Cancel" }),
        /* @__PURE__ */ jsx("button", { disabled: mSave.isPending, onClick: () => mSave.mutate(cleanArtwork(editing)), className: "rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50", children: "Save" })
      ] })
    ] })
  ] });
}
const cleanArtwork = (a) => ({
  id: a.id,
  title: a.title,
  medium: a.medium,
  image_url: a.image_url,
  artist_id: a.artist_id || null,
  year: a.year || null,
  description: a.description || null,
  is_active: !!a.is_active,
  content_source: a.content_source === "mock" ? "mock" : "live",
  price: a.price === "" || a.price === void 0 ? null : a.price === null ? null : Number(a.price),
  currency: (a.currency || "USD").toUpperCase(),
  lifecycle_status: a.lifecycle_status || "in_catalogue"
});
function StylesAdmin({
  data,
  onChange
}) {
  const save = useServerFn(saveStyle);
  const del = useServerFn(deleteStyle);
  const [editing, setEditing] = useState(null);
  const mSave = useMutation({
    mutationFn: (v) => save({
      data: v
    }),
    onSuccess: () => {
      toast.success("Saved");
      setEditing(null);
      onChange();
    },
    onError: (e) => toast.error(e.message)
  });
  const mDel = useMutation({
    mutationFn: (id) => del({
      data: {
        id
      }
    }),
    onSuccess: () => {
      toast.success("Deleted");
      onChange();
    },
    onError: (e) => toast.error(e.message)
  });
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsx("div", { className: "mb-4 flex justify-end", children: /* @__PURE__ */ jsx("button", { onClick: () => setEditing({
      slug: "",
      name: "",
      description: "",
      prompt_fragment: "",
      sort_order: 0,
      is_active: true
    }), className: "rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90", children: "+ New style" }) }),
    /* @__PURE__ */ jsxs("table", { className: "w-full text-sm", children: [
      /* @__PURE__ */ jsx("thead", { className: "text-left text-xs uppercase tracking-wider text-muted-foreground", children: /* @__PURE__ */ jsxs("tr", { children: [
        /* @__PURE__ */ jsx("th", { className: "py-2", children: "Name" }),
        /* @__PURE__ */ jsx("th", { children: "Slug" }),
        /* @__PURE__ */ jsx("th", { children: "Order" }),
        /* @__PURE__ */ jsx("th", {})
      ] }) }),
      /* @__PURE__ */ jsx("tbody", { children: data.styles.map((s) => /* @__PURE__ */ jsxs("tr", { className: "border-t border-border", children: [
        /* @__PURE__ */ jsxs("td", { className: "py-2", children: [
          s.name,
          !s.is_active && /* @__PURE__ */ jsx("span", { className: "ml-2 text-xs text-muted-foreground", children: "(hidden)" })
        ] }),
        /* @__PURE__ */ jsx("td", { className: "text-muted-foreground", children: s.slug }),
        /* @__PURE__ */ jsx("td", { className: "text-muted-foreground", children: s.sort_order }),
        /* @__PURE__ */ jsxs("td", { className: "text-right", children: [
          /* @__PURE__ */ jsx("button", { onClick: () => setEditing(s), className: "mr-2 text-xs underline", children: "Edit" }),
          /* @__PURE__ */ jsx("button", { onClick: () => confirm("Delete?") && mDel.mutate(s.id), className: "text-xs text-destructive underline", children: "Delete" })
        ] })
      ] }, s.id)) })
    ] }),
    editing && /* @__PURE__ */ jsxs(Modal, { onClose: () => setEditing(null), title: editing.id ? "Edit style" : "New style", children: [
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
        /* @__PURE__ */ jsx(Field, { label: "Name", children: /* @__PURE__ */ jsx("input", { className: "inp", value: editing.name ?? "", onChange: (e) => setEditing({
          ...editing,
          name: e.target.value
        }) }) }),
        /* @__PURE__ */ jsx(Field, { label: "Slug", children: /* @__PURE__ */ jsx("input", { className: "inp", value: editing.slug ?? "", onChange: (e) => setEditing({
          ...editing,
          slug: e.target.value
        }) }) }),
        /* @__PURE__ */ jsx(Field, { label: "Sort order", children: /* @__PURE__ */ jsx("input", { type: "number", className: "inp", value: editing.sort_order ?? 0, onChange: (e) => setEditing({
          ...editing,
          sort_order: +e.target.value
        }) }) }),
        /* @__PURE__ */ jsx(Field, { label: "Active", children: /* @__PURE__ */ jsxs("select", { className: "inp", value: editing.is_active ? "1" : "0", onChange: (e) => setEditing({
          ...editing,
          is_active: e.target.value === "1"
        }), children: [
          /* @__PURE__ */ jsx("option", { value: "1", children: "Active" }),
          /* @__PURE__ */ jsx("option", { value: "0", children: "Hidden" })
        ] }) })
      ] }),
      /* @__PURE__ */ jsx(Field, { label: "Description", children: /* @__PURE__ */ jsx("input", { className: "inp", value: editing.description ?? "", onChange: (e) => setEditing({
        ...editing,
        description: e.target.value
      }) }) }),
      /* @__PURE__ */ jsx(Field, { label: "Prompt fragment", children: /* @__PURE__ */ jsx("textarea", { className: "inp h-28", value: editing.prompt_fragment ?? "", onChange: (e) => setEditing({
        ...editing,
        prompt_fragment: e.target.value
      }) }) }),
      /* @__PURE__ */ jsxs("div", { className: "mt-4 flex justify-end gap-2", children: [
        /* @__PURE__ */ jsx("button", { onClick: () => setEditing(null), className: "rounded-md border border-border px-3 py-1.5 text-sm", children: "Cancel" }),
        /* @__PURE__ */ jsx("button", { disabled: mSave.isPending, onClick: () => mSave.mutate(cleanStyle(editing)), className: "rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50", children: "Save" })
      ] })
    ] })
  ] });
}
const cleanStyle = (s) => ({
  id: s.id,
  slug: s.slug,
  name: s.name,
  description: s.description || null,
  prompt_fragment: s.prompt_fragment,
  sort_order: Number(s.sort_order) || 0,
  is_active: !!s.is_active
});
function RendersAdmin({
  data,
  onChange
}) {
  const featureFn = useServerFn(setRenderFeatured);
  const delFn = useServerFn(deleteRender);
  const [filter, setFilter] = useState("all");
  const mFeat = useMutation({
    mutationFn: (v) => featureFn({
      data: v
    }),
    onSuccess: () => {
      toast.success("Updated");
      onChange();
    },
    onError: (e) => toast.error(e.message)
  });
  const mDel = useMutation({
    mutationFn: (id) => delFn({
      data: {
        id
      }
    }),
    onSuccess: () => {
      toast.success("Deleted");
      onChange();
    },
    onError: (e) => toast.error(e.message)
  });
  const renders = (data.renders ?? []).filter((r) => {
    if (filter === "featured") return r.is_featured;
    if (filter === "completed") return r.status === "completed";
    if (filter === "failed") return r.status === "failed";
    return true;
  });
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsxs("div", { className: "mb-4 flex items-center justify-between", children: [
      /* @__PURE__ */ jsx("div", { className: "flex gap-1", children: ["all", "featured", "completed", "failed"].map((f) => /* @__PURE__ */ jsx("button", { onClick: () => setFilter(f), className: `rounded-md border px-3 py-1 text-xs capitalize ${filter === f ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`, children: f }, f)) }),
      /* @__PURE__ */ jsxs("div", { className: "text-xs text-muted-foreground", children: [
        renders.length,
        " render",
        renders.length === 1 ? "" : "s"
      ] })
    ] }),
    renders.length === 0 ? /* @__PURE__ */ jsx("div", { className: "py-10 text-center text-sm text-muted-foreground", children: "No renders match this filter." }) : /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3", children: renders.map((r) => /* @__PURE__ */ jsxs("div", { className: "overflow-hidden rounded border border-border bg-card", children: [
      /* @__PURE__ */ jsxs("div", { className: "relative aspect-[4/3] bg-muted", children: [
        r.result_image_url ? /* @__PURE__ */ jsx("img", { src: r.result_image_url, alt: "", className: "h-full w-full object-contain" }) : /* @__PURE__ */ jsx("img", { src: localImageForKey(r.id), alt: "", className: "h-full w-full object-contain opacity-60" }),
        /* @__PURE__ */ jsxs("div", { className: "absolute left-2 top-2 flex gap-1", children: [
          /* @__PURE__ */ jsx("span", { className: `rounded px-2 py-0.5 text-[10px] uppercase tracking-wider ${r.status === "completed" ? "bg-primary text-primary-foreground" : r.status === "failed" ? "bg-destructive text-destructive-foreground" : "bg-muted text-muted-foreground"}`, children: r.status }),
          r.is_featured && /* @__PURE__ */ jsx("span", { className: "rounded bg-foreground px-2 py-0.5 text-[10px] uppercase tracking-wider text-background", children: "Featured" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-2 p-3 text-xs", children: [
        /* @__PURE__ */ jsx("div", { className: "text-muted-foreground", children: new Date(r.created_at).toLocaleString() }),
        /* @__PURE__ */ jsxs("div", { className: "truncate text-muted-foreground", title: r.user_id, children: [
          "user ",
          r.user_id.slice(0, 8),
          "…"
        ] }),
        r.error_message && /* @__PURE__ */ jsx("div", { className: "text-destructive", children: r.error_message }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between pt-1", children: [
          /* @__PURE__ */ jsx("button", { disabled: r.status !== "completed" || mFeat.isPending, onClick: () => mFeat.mutate({
            id: r.id,
            is_featured: !r.is_featured
          }), className: "underline disabled:cursor-not-allowed disabled:opacity-40", children: r.is_featured ? "Unfeature" : "Feature" }),
          r.result_image_url && /* @__PURE__ */ jsx("a", { href: r.result_image_url, target: "_blank", rel: "noreferrer", className: "underline", children: "Open" }),
          /* @__PURE__ */ jsx("button", { onClick: () => confirm("Delete this render?") && mDel.mutate(r.id), className: "text-destructive underline", children: "Delete" })
        ] })
      ] })
    ] }, r.id)) })
  ] });
}
function PanesAdmin({
  data,
  onChange
}) {
  const save = useServerFn(savePane);
  const del = useServerFn(deletePane);
  const reorder = useServerFn(reorderPanes);
  const setStatus = useServerFn(setPaneStatus);
  const upload = useServerFn(uploadArtworkImage);
  const statsFn = useServerFn(getPaneViewStats);
  const {
    data: viewStats
  } = useQuery({
    queryKey: ["pane-view-stats"],
    queryFn: () => statsFn(),
    staleTime: 6e4
  });
  const [editing, setEditing] = useState(null);
  const [uploading, setUploading] = useState(null);
  const [localPanes, setLocalPanes] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const serverPanes = data.panes ?? [];
  useEffect(() => {
    if (!dirty) setLocalPanes(serverPanes);
  }, [serverPanes, dirty]);
  const allPanes = localPanes ?? serverPanes;
  const panes = statusFilter === "all" ? allPanes : allPanes.filter((p) => (p.status ?? "draft") === statusFilter);
  const mSave = useMutation({
    mutationFn: (v) => save({
      data: v
    }),
    onSuccess: () => {
      toast.success("Saved");
      setEditing(null);
      onChange();
    },
    onError: (e) => toast.error(e.message)
  });
  const mDel = useMutation({
    mutationFn: (id) => del({
      data: {
        id
      }
    }),
    onSuccess: () => {
      toast.success("Deleted");
      onChange();
    },
    onError: (e) => toast.error(e.message)
  });
  const mReorder = useMutation({
    mutationFn: (order) => reorder({
      data: {
        order
      }
    }),
    onSuccess: () => {
      toast.success("Order saved");
      setDirty(false);
      onChange();
    },
    onError: (e) => toast.error(e.message)
  });
  const mStatus = useMutation({
    mutationFn: (v) => setStatus({
      data: v
    }),
    onSuccess: (_d, v) => {
      toast.success(v.status === "published" ? "Published" : "Moved to draft");
      onChange();
    },
    onError: (e) => toast.error(e.message)
  });
  async function onFile(f, target) {
    setUploading(target);
    try {
      const b64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result));
        r.onerror = () => rej(r.error);
        r.readAsDataURL(f);
      });
      const {
        url
      } = await upload({
        data: {
          base64: b64,
          filename: f.name
        }
      });
      const key = target === "desktop" ? "image_url" : "image_url_mobile";
      setEditing((e) => ({
        ...e,
        [key]: url
      }));
      toast.success(`${target === "desktop" ? "Desktop" : "Mobile"} image uploaded`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setUploading(null);
    }
  }
  function moveTo(fromId, toId) {
    if (fromId === toId) return;
    const list = [...allPanes];
    const fromIdx = list.findIndex((p) => p.id === fromId);
    const toIdx = list.findIndex((p) => p.id === toId);
    if (fromIdx < 0 || toIdx < 0) return;
    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);
    setLocalPanes(list.map((p, i) => ({
      ...p,
      sort_order: i
    })));
    setDirty(true);
  }
  function saveOrder() {
    const order = allPanes.map((p, i) => ({
      id: p.id,
      sort_order: i
    }));
    mReorder.mutate(order);
  }
  const canDrag = statusFilter === "all" && !mReorder.isPending;
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsxs("div", { className: "mb-4 flex flex-wrap items-center justify-between gap-3", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsx("div", { className: "flex gap-1", children: ["all", "published", "draft"].map((f) => {
          const count = f === "all" ? allPanes.length : allPanes.filter((p) => (p.status ?? "draft") === f).length;
          return /* @__PURE__ */ jsxs("button", { onClick: () => setStatusFilter(f), className: `rounded-md border px-3 py-1 text-xs capitalize ${statusFilter === f ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`, children: [
            f,
            " (",
            count,
            ")"
          ] }, f);
        }) }),
        /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: canDrag ? "Drag ⋮⋮ to reorder." : "Show all panes to reorder." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
        dirty && /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx("button", { onClick: () => {
            setLocalPanes(serverPanes);
            setDirty(false);
          }, className: "rounded-md border border-border px-3 py-1.5 text-sm", children: "Cancel" }),
          /* @__PURE__ */ jsx("button", { disabled: mReorder.isPending, onClick: saveOrder, className: "rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50", children: mReorder.isPending ? "Saving…" : "Save order" })
        ] }),
        /* @__PURE__ */ jsx("button", { onClick: () => setEditing({
          pane_id: "",
          kicker: "",
          title: "",
          summary: "",
          reveal: "",
          image_url: "",
          image_url_mobile: "",
          sort_order: allPanes.length,
          is_active: true,
          status: "draft"
        }), className: "rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90", children: "+ New pane" })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-2", children: [
      panes.length === 0 && /* @__PURE__ */ jsx("div", { className: "py-10 text-center text-sm text-muted-foreground", children: "No panes match this filter." }),
      panes.map((p, idx) => {
        const status = p.status ?? "draft";
        return /* @__PURE__ */ jsxs("div", { draggable: canDrag, onDragStart: () => canDrag && setDragId(p.id), onDragOver: (e) => {
          if (canDrag) {
            e.preventDefault();
            if (dragId && dragId !== p.id) moveTo(dragId, p.id);
          }
        }, onDragEnd: () => setDragId(null), className: `flex items-center gap-3 rounded border bg-card p-2 transition ${dragId === p.id ? "border-primary opacity-60" : "border-border"}`, children: [
          /* @__PURE__ */ jsx("div", { className: `select-none px-2 text-lg ${canDrag ? "cursor-grab text-muted-foreground" : "cursor-not-allowed text-muted-foreground/30"}`, title: canDrag ? "Drag to reorder" : "Switch to All to reorder", children: "⋮⋮" }),
          /* @__PURE__ */ jsx("div", { className: "w-8 text-center text-xs text-muted-foreground", children: statusFilter === "all" ? idx + 1 : "" }),
          /* @__PURE__ */ jsx("img", { src: p.image_url || localPaneImage(p.pane_id), alt: p.title, className: "h-12 w-20 flex-shrink-0 rounded bg-muted object-contain" }),
          /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsx("span", { className: "text-xs uppercase tracking-wider text-muted-foreground", children: p.kicker }),
              /* @__PURE__ */ jsx("span", { className: `rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${status === "published" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`, children: status }),
              !p.is_active && /* @__PURE__ */ jsx("span", { className: "rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-destructive", children: "hidden" })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "truncate text-sm font-medium", children: p.title }),
            /* @__PURE__ */ jsxs("div", { className: "truncate text-xs text-muted-foreground", children: [
              "#",
              p.pane_id
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex flex-shrink-0 flex-col items-end gap-1 text-xs sm:flex-row sm:items-center sm:gap-3", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-end leading-tight text-muted-foreground", title: "Views (last 30 days / all time)", children: [
              /* @__PURE__ */ jsx("span", { className: "font-mono text-sm text-foreground", children: viewStats?.last30?.[p.pane_id] ?? 0 }),
              /* @__PURE__ */ jsxs("span", { className: "text-[10px] uppercase tracking-wider", children: [
                "30d · ",
                viewStats?.all?.[p.pane_id] ?? 0,
                " all"
              ] })
            ] }),
            status === "published" ? /* @__PURE__ */ jsx("button", { disabled: mStatus.isPending, onClick: () => mStatus.mutate({
              id: p.id,
              status: "draft"
            }), className: "text-muted-foreground underline disabled:opacity-50", children: "Unpublish" }) : /* @__PURE__ */ jsx("button", { disabled: mStatus.isPending, onClick: () => mStatus.mutate({
              id: p.id,
              status: "published"
            }), className: "font-medium text-primary underline disabled:opacity-50", children: "Publish" }),
            /* @__PURE__ */ jsx("button", { onClick: () => setEditing(p), className: "underline", children: "Edit" }),
            /* @__PURE__ */ jsx("button", { onClick: () => confirm("Delete?") && mDel.mutate(p.id), className: "text-destructive underline", children: "Delete" })
          ] })
        ] }, p.id);
      })
    ] }),
    editing && /* @__PURE__ */ jsxs(Modal, { onClose: () => setEditing(null), title: editing.id ? "Edit pane" : "New pane", children: [
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
        /* @__PURE__ */ jsx(Field, { label: "Pane ID (slug)", children: /* @__PURE__ */ jsx("input", { className: "inp", placeholder: "artist", value: editing.pane_id ?? "", onChange: (e) => setEditing({
          ...editing,
          pane_id: e.target.value
        }) }) }),
        /* @__PURE__ */ jsx(Field, { label: "Sort order", children: /* @__PURE__ */ jsx("input", { type: "number", className: "inp", value: editing.sort_order ?? 0, onChange: (e) => setEditing({
          ...editing,
          sort_order: +e.target.value
        }) }) })
      ] }),
      /* @__PURE__ */ jsx(Field, { label: "Kicker", children: /* @__PURE__ */ jsx("input", { className: "inp", value: editing.kicker ?? "", onChange: (e) => setEditing({
        ...editing,
        kicker: e.target.value
      }) }) }),
      /* @__PURE__ */ jsx(Field, { label: "Title", children: /* @__PURE__ */ jsx("input", { className: "inp", value: editing.title ?? "", onChange: (e) => setEditing({
        ...editing,
        title: e.target.value
      }) }) }),
      /* @__PURE__ */ jsx(Field, { label: "Summary", children: /* @__PURE__ */ jsx("textarea", { className: "inp h-20", value: editing.summary ?? "", onChange: (e) => setEditing({
        ...editing,
        summary: e.target.value
      }) }) }),
      /* @__PURE__ */ jsx(Field, { label: "Reveal text", children: /* @__PURE__ */ jsx("textarea", { className: "inp h-20", value: editing.reveal ?? "", onChange: (e) => setEditing({
        ...editing,
        reveal: e.target.value
      }) }) }),
      /* @__PURE__ */ jsx(Field, { label: "Desktop image (wide)", children: /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsx("img", { src: editing.image_url || localPaneImage(editing.pane_id), alt: "", className: "h-32 w-full rounded bg-muted object-contain" }),
        /* @__PURE__ */ jsx("input", { type: "file", accept: "image/*", onChange: (e) => e.target.files?.[0] && onFile(e.target.files[0], "desktop") }),
        uploading === "desktop" && /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground", children: "Uploading…" }),
        /* @__PURE__ */ jsx("input", { className: "inp", placeholder: "…or paste a desktop image URL", value: editing.image_url ?? "", onChange: (e) => setEditing({
          ...editing,
          image_url: e.target.value
        }) })
      ] }) }),
      /* @__PURE__ */ jsx(Field, { label: "Mobile image (portrait, optional — falls back to desktop)", children: /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsx("img", { src: editing.image_url_mobile || editing.image_url || localPaneImage(editing.pane_id), alt: "", className: "h-40 w-24 rounded bg-muted object-contain" }),
        /* @__PURE__ */ jsx("input", { type: "file", accept: "image/*", onChange: (e) => e.target.files?.[0] && onFile(e.target.files[0], "mobile") }),
        uploading === "mobile" && /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground", children: "Uploading…" }),
        /* @__PURE__ */ jsx("input", { className: "inp", placeholder: "…or paste a mobile image URL", value: editing.image_url_mobile ?? "", onChange: (e) => setEditing({
          ...editing,
          image_url_mobile: e.target.value
        }) })
      ] }) }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
        /* @__PURE__ */ jsx(Field, { label: "Status", children: /* @__PURE__ */ jsxs("select", { className: "inp", value: editing.status ?? "draft", onChange: (e) => setEditing({
          ...editing,
          status: e.target.value
        }), children: [
          /* @__PURE__ */ jsx("option", { value: "draft", children: "Draft" }),
          /* @__PURE__ */ jsx("option", { value: "published", children: "Published" })
        ] }) }),
        /* @__PURE__ */ jsx(Field, { label: "Active", children: /* @__PURE__ */ jsxs("select", { className: "inp", value: editing.is_active ? "1" : "0", onChange: (e) => setEditing({
          ...editing,
          is_active: e.target.value === "1"
        }), children: [
          /* @__PURE__ */ jsx("option", { value: "1", children: "Active" }),
          /* @__PURE__ */ jsx("option", { value: "0", children: "Hidden" })
        ] }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mt-4 flex justify-end gap-2", children: [
        /* @__PURE__ */ jsx("button", { onClick: () => setEditing(null), className: "rounded-md border border-border px-3 py-1.5 text-sm", children: "Cancel" }),
        /* @__PURE__ */ jsx("button", { disabled: mSave.isPending, onClick: () => mSave.mutate(cleanPane(editing)), className: "rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50", children: "Save" })
      ] })
    ] })
  ] });
}
const cleanPane = (p) => ({
  id: p.id,
  pane_id: p.pane_id,
  kicker: p.kicker,
  title: p.title,
  summary: p.summary,
  reveal: p.reveal || "",
  image_url: p.image_url || null,
  image_url_mobile: p.image_url_mobile || null,
  sort_order: Number(p.sort_order) || 0,
  is_active: !!p.is_active,
  status: p.status === "published" ? "published" : "draft"
});
function AnalyticsAdmin() {
  const fetchStats = useServerFn(getEntryClickStats);
  const {
    data,
    isLoading
  } = useQuery({
    queryKey: ["entry-click-stats"],
    queryFn: () => fetchStats(),
    staleTime: 3e4
  });
  if (isLoading) return /* @__PURE__ */ jsx("div", { className: "py-10 text-sm text-muted-foreground", children: "Loading analytics…" });
  const allKeys = Object.keys(data?.all ?? {});
  const recentKeys = Object.keys(data?.last30 ?? {});
  const keys = Array.from(/* @__PURE__ */ new Set([...allKeys, ...recentKeys])).sort();
  const totalAll = Object.values(data?.all ?? {}).reduce((s, n) => s + n, 0);
  const total30 = Object.values(data?.last30 ?? {}).reduce((s, n) => s + n, 0);
  const stageAll = (data?.all ?? {})["stage_virtually::lounge_header"] ?? 0;
  const stage30 = (data?.last30 ?? {})["stage_virtually::lounge_header"] ?? 0;
  return /* @__PURE__ */ jsxs("div", { className: "max-w-4xl space-y-6", children: [
    /* @__PURE__ */ jsxs("div", { className: "grid gap-4 sm:grid-cols-3", children: [
      /* @__PURE__ */ jsxs("div", { className: "rounded border border-border bg-card p-4", children: [
        /* @__PURE__ */ jsx("div", { className: "text-xs uppercase tracking-wider text-muted-foreground", children: "Total clicks (all time)" }),
        /* @__PURE__ */ jsx("div", { className: "mt-1 font-display text-3xl", children: totalAll })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "rounded border border-border bg-card p-4", children: [
        /* @__PURE__ */ jsx("div", { className: "text-xs uppercase tracking-wider text-muted-foreground", children: "Total clicks (last 30 days)" }),
        /* @__PURE__ */ jsx("div", { className: "mt-1 font-display text-3xl", children: total30 })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "rounded border border-primary/30 bg-primary/5 p-4", children: [
        /* @__PURE__ */ jsx("div", { className: "text-xs uppercase tracking-wider text-primary", children: "Stage virtually → clicks (30d)" }),
        /* @__PURE__ */ jsx("div", { className: "mt-1 font-display text-3xl text-primary", children: stage30 }),
        /* @__PURE__ */ jsxs("div", { className: "mt-1 text-xs text-muted-foreground", children: [
          stageAll,
          " all time"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("h3", { className: "mb-3 font-display text-lg", children: "Entry point breakdown" }),
      /* @__PURE__ */ jsxs("table", { className: "w-full text-sm", children: [
        /* @__PURE__ */ jsx("thead", { className: "text-left text-xs uppercase tracking-wider text-muted-foreground", children: /* @__PURE__ */ jsxs("tr", { children: [
          /* @__PURE__ */ jsx("th", { className: "py-2", children: "Entry point" }),
          /* @__PURE__ */ jsx("th", { className: "py-2", children: "Location" }),
          /* @__PURE__ */ jsx("th", { className: "py-2 text-right", children: "All time" }),
          /* @__PURE__ */ jsx("th", { className: "py-2 text-right", children: "Last 30 days" })
        ] }) }),
        /* @__PURE__ */ jsxs("tbody", { children: [
          keys.length === 0 && /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx("td", { colSpan: 4, className: "py-6 text-center text-muted-foreground", children: "No clicks recorded yet." }) }),
          keys.map((key) => {
            const [entryPoint, location] = key.split("::");
            const allVal = (data?.all ?? {})[key] ?? 0;
            const recentVal = (data?.last30 ?? {})[key] ?? 0;
            return /* @__PURE__ */ jsxs("tr", { className: "border-t border-border", children: [
              /* @__PURE__ */ jsx("td", { className: "py-2", children: /* @__PURE__ */ jsx("span", { className: `rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${entryPoint === "stage_virtually" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`, children: entryPoint }) }),
              /* @__PURE__ */ jsx("td", { className: "py-2 text-muted-foreground", children: location }),
              /* @__PURE__ */ jsx("td", { className: "py-2 text-right font-mono", children: allVal }),
              /* @__PURE__ */ jsx("td", { className: "py-2 text-right font-mono", children: recentVal })
            ] }, key);
          })
        ] })
      ] })
    ] })
  ] });
}
function AllocationAdmin({
  data
}) {
  const [scope, setScope] = useState("pieces");
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsx("div", { className: "mb-4 flex gap-1 rounded-md border border-border p-1 w-fit", children: ["pieces", "artists"].map((s) => /* @__PURE__ */ jsx("button", { onClick: () => setScope(s), className: `rounded px-3 py-1 text-xs uppercase tracking-wider ${scope === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`, children: s }, s)) }),
    /* @__PURE__ */ jsx(AllocationEditor, { scope, data }, scope)
  ] });
}
function AllocationEditor({
  scope,
  data
}) {
  const qc = useQueryClient();
  const get = useServerFn(getAllocations);
  const save = useServerFn(saveAllocations);
  const {
    data: alloc,
    isLoading
  } = useQuery({
    queryKey: ["alloc", scope],
    queryFn: () => get({
      data: {
        scope
      }
    })
  });
  const [rows, setRows] = useState([]);
  useEffect(() => {
    if (alloc?.rows) setRows(alloc.rows.map((r) => ({
      country: r.country,
      percent: Number(r.percent)
    })));
  }, [alloc]);
  const availableCountries = Array.from(new Set((data?.artists ?? []).map((a) => a.country).filter((c) => typeof c === "string" && c.length > 0))).sort();
  const total = rows.reduce((s, r) => s + (Number.isFinite(r.percent) ? r.percent : 0), 0);
  const canSave = rows.length === 0 || Math.round(total) === 100;
  const mSave = useMutation({
    mutationFn: () => save({
      data: {
        scope,
        rows
      }
    }),
    onSuccess: () => {
      toast.success("Allocation saved");
      qc.invalidateQueries({
        queryKey: ["alloc", scope]
      });
    },
    onError: (e) => toast.error(e.message ?? "Save failed")
  });
  if (isLoading) return /* @__PURE__ */ jsx("div", { className: "text-sm text-muted-foreground", children: "Loading…" });
  return /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
    /* @__PURE__ */ jsxs("p", { className: "text-sm text-muted-foreground", children: [
      "Distribute the landing catalogue across countries. Percentages must add up to 100. The catalogue is capped at 40 ",
      scope,
      "; each country's share of those 40 follows its percent here."
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "rounded-md border border-border bg-card", children: [
      /* @__PURE__ */ jsxs("table", { className: "w-full text-sm", children: [
        /* @__PURE__ */ jsx("thead", { className: "text-left text-xs uppercase tracking-wider text-muted-foreground", children: /* @__PURE__ */ jsxs("tr", { children: [
          /* @__PURE__ */ jsx("th", { className: "px-3 py-2", children: "Country" }),
          /* @__PURE__ */ jsx("th", { className: "px-3 py-2", children: "Percent" }),
          /* @__PURE__ */ jsx("th", { className: "px-3 py-2 w-20" })
        ] }) }),
        /* @__PURE__ */ jsx("tbody", { children: rows.map((r, i) => /* @__PURE__ */ jsxs("tr", { className: "border-t border-border", children: [
          /* @__PURE__ */ jsx("td", { className: "px-3 py-2", children: /* @__PURE__ */ jsxs("select", { className: "inp", value: r.country, onChange: (e) => setRows(rows.map((x, idx) => idx === i ? {
            ...x,
            country: e.target.value
          } : x)), children: [
            /* @__PURE__ */ jsx("option", { value: "", children: "— pick —" }),
            availableCountries.map((c) => /* @__PURE__ */ jsx("option", { value: c, children: c }, c))
          ] }) }),
          /* @__PURE__ */ jsx("td", { className: "px-3 py-2", children: /* @__PURE__ */ jsx("input", { type: "number", min: 0, max: 100, step: 1, className: "inp w-28", value: r.percent, onChange: (e) => setRows(rows.map((x, idx) => idx === i ? {
            ...x,
            percent: Number(e.target.value)
          } : x)) }) }),
          /* @__PURE__ */ jsx("td", { className: "px-3 py-2 text-right", children: /* @__PURE__ */ jsx("button", { onClick: () => setRows(rows.filter((_, idx) => idx !== i)), className: "text-xs text-destructive underline", children: "Remove" }) })
        ] }, i)) })
      ] }),
      /* @__PURE__ */ jsx("style", { children: `.inp{width:100%;border:1px solid var(--border);background:var(--background);color:var(--foreground);padding:0.4rem 0.5rem;border-radius:0.375rem;font-size:0.875rem;outline:none}.inp:focus{border-color:var(--primary)}` }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between border-t border-border px-3 py-2", children: [
        /* @__PURE__ */ jsx("button", { onClick: () => setRows([...rows, {
          country: "",
          percent: 0
        }]), className: "text-xs underline", children: "+ Add country" }),
        /* @__PURE__ */ jsxs("div", { className: `text-sm tabular-nums ${Math.round(total) === 100 ? "text-foreground" : "text-destructive"}`, children: [
          "Total: ",
          total.toFixed(0),
          "%"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx("button", { disabled: !canSave || mSave.isPending, onClick: () => mSave.mutate(), className: "rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50", children: mSave.isPending ? "Saving…" : "Save allocation" })
  ] });
}
function LookupAdmin({
  seed: seed2,
  onSeedConsumed
}) {
  const lookup = useServerFn(lookupById);
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");
  useEffect(() => {
    if (seed2) {
      setQ(seed2);
      setSubmitted(seed2);
      onSeedConsumed();
    }
  }, [seed2, onSeedConsumed]);
  const {
    data: result,
    isFetching
  } = useQuery({
    queryKey: ["lookup", submitted],
    queryFn: () => lookup({
      data: {
        query: submitted
      }
    }),
    enabled: submitted.length > 0
  });
  return /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxs("form", { onSubmit: (e) => {
      e.preventDefault();
      setSubmitted(q.trim());
    }, className: "flex gap-2", children: [
      /* @__PURE__ */ jsx("input", { className: "inp flex-1", placeholder: "Paste UUID or short code (ART-…, PCE-…, TXN-…)", value: q, onChange: (e) => setQ(e.target.value) }),
      /* @__PURE__ */ jsx("button", { className: "rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground", children: "Look up" }),
      /* @__PURE__ */ jsx("style", { children: `.inp{border:1px solid var(--border);background:var(--background);color:var(--foreground);padding:0.5rem 0.625rem;border-radius:0.375rem;font-size:0.875rem;outline:none}.inp:focus{border-color:var(--primary)}` })
    ] }),
    isFetching && /* @__PURE__ */ jsx("div", { className: "text-sm text-muted-foreground", children: "Searching…" }),
    submitted && !isFetching && result && /* @__PURE__ */ jsxs("div", { className: "rounded-md border border-border bg-card p-4", children: [
      result.kind === "not_found" && /* @__PURE__ */ jsxs("div", { className: "text-sm text-muted-foreground", children: [
        'No match for "',
        submitted,
        '".'
      ] }),
      result.kind === "artist" && /* @__PURE__ */ jsx(ArtistResult, { payload: result.payload }),
      result.kind === "piece" && /* @__PURE__ */ jsx(PieceResult, { payload: result.payload }),
      result.kind === "transaction" && /* @__PURE__ */ jsx(TxnResult, { payload: result.payload })
    ] })
  ] });
}
function KV({
  k,
  v
}) {
  return /* @__PURE__ */ jsxs("div", { className: "flex justify-between gap-4 border-b border-border/50 py-1.5 text-sm", children: [
    /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: k }),
    /* @__PURE__ */ jsx("span", { className: "font-mono text-right break-all", children: v ?? "—" })
  ] });
}
function ArtistResult({
  payload
}) {
  if (!payload?.artist) return /* @__PURE__ */ jsx("div", { className: "text-sm text-muted-foreground", children: "Artist not found." });
  const a = payload.artist;
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsxs("div", { className: "mb-3 flex items-center justify-between", children: [
      /* @__PURE__ */ jsx("h3", { className: "font-display text-lg", children: a.name }),
      /* @__PURE__ */ jsx("span", { className: "rounded bg-muted px-2 py-0.5 text-xs uppercase", children: "Artist" })
    ] }),
    /* @__PURE__ */ jsx(KV, { k: "Short code", v: a.short_code }),
    /* @__PURE__ */ jsx(KV, { k: "UUID", v: a.id }),
    /* @__PURE__ */ jsx(KV, { k: "Country", v: a.country }),
    /* @__PURE__ */ jsx(KV, { k: "Domicile", v: a.domicile_city }),
    /* @__PURE__ */ jsx(KV, { k: "DOB", v: a.date_of_birth }),
    /* @__PURE__ */ jsx(KV, { k: "Alma mater", v: a.alma_mater }),
    /* @__PURE__ */ jsx(KV, { k: "Views", v: a.view_count }),
    /* @__PURE__ */ jsx(KV, { k: "Created", v: a.created_at }),
    /* @__PURE__ */ jsxs("div", { className: "mt-4", children: [
      /* @__PURE__ */ jsxs("h4", { className: "mb-2 text-xs uppercase tracking-wider text-muted-foreground", children: [
        "Works (",
        payload.works.length,
        ")"
      ] }),
      /* @__PURE__ */ jsx("ul", { className: "space-y-1 text-sm", children: payload.works.map((w) => /* @__PURE__ */ jsxs("li", { className: "flex justify-between gap-2 border-t border-border/50 py-1", children: [
        /* @__PURE__ */ jsx("span", { className: "font-mono text-xs", children: w.short_code }),
        /* @__PURE__ */ jsx("span", { className: "flex-1 truncate", children: w.title }),
        /* @__PURE__ */ jsx("span", { className: "text-xs text-muted-foreground", children: w.lifecycle_status }),
        /* @__PURE__ */ jsxs("span", { className: "text-xs text-muted-foreground", children: [
          w.view_count,
          " views"
        ] })
      ] }, w.id)) })
    ] })
  ] });
}
function PieceResult({
  payload
}) {
  if (!payload) return /* @__PURE__ */ jsx("div", { className: "text-sm text-muted-foreground", children: "Piece not found." });
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsxs("div", { className: "mb-3 flex items-center justify-between", children: [
      /* @__PURE__ */ jsx("h3", { className: "font-display text-lg", children: payload.title }),
      /* @__PURE__ */ jsx("span", { className: "rounded bg-muted px-2 py-0.5 text-xs uppercase", children: "Piece" })
    ] }),
    /* @__PURE__ */ jsx(KV, { k: "Short code", v: payload.short_code }),
    /* @__PURE__ */ jsx(KV, { k: "UUID", v: payload.id }),
    /* @__PURE__ */ jsx(KV, { k: "Status", v: payload.lifecycle_status }),
    /* @__PURE__ */ jsx(KV, { k: "Price", v: payload.price ? `${payload.price} ${payload.currency}` : "—" }),
    /* @__PURE__ */ jsx(KV, { k: "Medium", v: payload.medium }),
    /* @__PURE__ */ jsx(KV, { k: "Year", v: payload.year }),
    /* @__PURE__ */ jsx(KV, { k: "Artist", v: payload.artist ? `${payload.artist.name} (${payload.artist.short_code})` : "—" }),
    /* @__PURE__ */ jsx(KV, { k: "Views", v: payload.view_count }),
    /* @__PURE__ */ jsx(KV, { k: "Date loaded", v: payload.created_at }),
    /* @__PURE__ */ jsx(KV, { k: "Last updated", v: payload.updated_at })
  ] });
}
function TxnResult({
  payload
}) {
  if (!payload) return /* @__PURE__ */ jsx("div", { className: "text-sm text-muted-foreground", children: "Transaction not found." });
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsxs("div", { className: "mb-3 flex items-center justify-between", children: [
      /* @__PURE__ */ jsx("h3", { className: "font-display text-lg", children: "Transaction" }),
      /* @__PURE__ */ jsx("span", { className: "rounded bg-muted px-2 py-0.5 text-xs uppercase", children: "Txn" })
    ] }),
    Object.entries(payload).map(([k, v]) => /* @__PURE__ */ jsx(KV, { k, v: typeof v === "object" ? JSON.stringify(v) : String(v ?? "—") }, k))
  ] });
}
function TransactionsAdmin({
  onLookup
}) {
  const list = useServerFn(listTransactions);
  const {
    data,
    isLoading
  } = useQuery({
    queryKey: ["txns"],
    queryFn: () => list()
  });
  if (isLoading) return /* @__PURE__ */ jsx("div", { className: "text-sm text-muted-foreground", children: "Loading…" });
  const rows = data?.rows ?? [];
  if (!rows.length) return /* @__PURE__ */ jsx("div", { className: "text-sm text-muted-foreground", children: "No transactions yet." });
  const cols = Object.keys(rows[0]);
  return /* @__PURE__ */ jsx("div", { className: "overflow-x-auto rounded-md border border-border bg-card", children: /* @__PURE__ */ jsxs("table", { className: "w-full text-sm", children: [
    /* @__PURE__ */ jsx("thead", { className: "text-left text-xs uppercase tracking-wider text-muted-foreground", children: /* @__PURE__ */ jsx("tr", { children: cols.map((c) => /* @__PURE__ */ jsx("th", { className: "px-3 py-2", children: c }, c)) }) }),
    /* @__PURE__ */ jsx("tbody", { children: rows.map((r, i) => /* @__PURE__ */ jsx("tr", { className: "border-t border-border", children: cols.map((c) => /* @__PURE__ */ jsx("td", { className: "px-3 py-2 align-top", children: (c === "short_code" || c === "id") && r[c] ? /* @__PURE__ */ jsx("button", { onClick: () => onLookup(r[c]), className: "font-mono text-xs text-primary underline", children: r[c] }) : /* @__PURE__ */ jsx("span", { className: "font-mono text-xs", children: r[c] === null || r[c] === void 0 ? "—" : String(typeof r[c] === "object" ? JSON.stringify(r[c]) : r[c]) }) }, c)) }, r.id ?? i)) })
  ] }) });
}
function Field({
  label,
  children
}) {
  return /* @__PURE__ */ jsxs("div", { className: "mb-3", children: [
    /* @__PURE__ */ jsx("div", { className: "mb-1 text-[11px] uppercase tracking-[0.15em] text-muted-foreground", children: label }),
    children
  ] });
}
function Modal({
  title,
  onClose,
  children
}) {
  return /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4", onClick: onClose, children: /* @__PURE__ */ jsxs("div", { onClick: (e) => e.stopPropagation(), className: "w-full max-w-lg overflow-y-auto rounded-md border border-border bg-card p-6 shadow-xl", style: {
    maxHeight: "90vh"
  }, children: [
    /* @__PURE__ */ jsxs("div", { className: "mb-4 flex items-center justify-between", children: [
      /* @__PURE__ */ jsx("h2", { className: "font-display text-xl", children: title }),
      /* @__PURE__ */ jsx("button", { onClick: onClose, className: "text-muted-foreground hover:text-foreground", children: "✕" })
    ] }),
    /* @__PURE__ */ jsx("style", { children: `.inp{width:100%;border:1px solid var(--border);background:var(--background);color:var(--foreground);padding:0.5rem 0.625rem;border-radius:0.375rem;font-size:0.875rem;outline:none}.inp:focus{border-color:var(--primary)}` }),
    children
  ] }) });
}
function CollateralAdminPanel() {
  const listFn = useServerFn(adminListCollateral);
  const updateFn = useServerFn(adminUpdateCollateral);
  const qc = useQueryClient();
  const {
    data: rows = [],
    isLoading
  } = useQuery({
    queryKey: ["admin", "collateral"],
    queryFn: () => listFn()
  });
  const [certUrl, setCertUrl] = useState({});
  if (isLoading) return /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Loading…" });
  return /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
    rows.map((r) => /* @__PURE__ */ jsxs("div", { className: "rounded-lg border p-4 text-sm", children: [
      /* @__PURE__ */ jsx("p", { className: "font-medium", children: String(r.title) }),
      /* @__PURE__ */ jsxs("p", { className: "text-muted-foreground", children: [
        "Loan ₦",
        Number(r.loan_amount_ngn).toLocaleString(),
        " · ",
        String(r.status)
      ] }),
      /* @__PURE__ */ jsx("input", { className: "mt-2 w-full rounded border px-2 py-1 text-xs", placeholder: "Certificate URL", value: certUrl[String(r.id)] ?? "", onChange: (e) => setCertUrl((c) => ({
        ...c,
        [String(r.id)]: e.target.value
      })) }),
      /* @__PURE__ */ jsx("div", { className: "mt-2 flex gap-2", children: ["authenticated", "active", "released", "rejected"].map((s) => /* @__PURE__ */ jsx("button", { type: "button", className: "rounded border px-2 py-1 text-xs capitalize", onClick: () => updateFn({
        data: {
          id: String(r.id),
          status: s,
          certificateUrl: certUrl[String(r.id)] || null
        }
      }).then(() => qc.invalidateQueries({
        queryKey: ["admin", "collateral"]
      })), children: s }, s)) })
    ] }, String(r.id))),
    rows.length === 0 && /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "No collateral pledges." })
  ] });
}
export {
  Admin as component
};
