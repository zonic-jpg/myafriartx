import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { useNavigate, Link } from "@tanstack/react-router";
import * as React from "react";
import { useRef, useEffect, useMemo, useState, useCallback } from "react";
import { f as Route, u as useServerFn, h as getCataloguePieces, i as getCatalogueArtists } from "./router-9tDYEkuI.js";
import { s as supabase } from "./client-BWo_yy_6.js";
import { a as getLandingPanes, r as recordPaneView } from "./pane-views.functions-8Zn_47nd.js";
import { r as recordEntryClick } from "./entry-clicks.functions-BBu2nu3J.js";
import { u as useSessionId } from "./use-session-id-CT-VEwIH.js";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check, Sparkles, X, RefreshCw, Send } from "lucide-react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { c as localPaneAssets, l as localImageForKey, a as artistDefault, p as paneEvent, d as paneAuction, e as paneArtist, f as paneStage } from "./local-image-assets-D5XLRts7.js";
import { LOCAL_MOCK_ARTWORKS } from "./mock-catalogue-C_lZKJ3J.js";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import "@tanstack/react-query";
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
import "@ai-sdk/openai-compatible";
import "node:crypto";
import "jose";
import "./client.server-D5ro3rAQ.js";
const FOCUSABLE = 'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), iframe, object, embed, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';
function useFocusTrap(active, onClose) {
  const containerRef = useRef(null);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const previouslyFocused = document.activeElement;
    const getFocusable = () => Array.from(container.querySelectorAll(FOCUSABLE)).filter(
      (el) => !el.hasAttribute("disabled") && el.offsetParent !== null
    );
    const focusables = getFocusable();
    (focusables[0] ?? container).focus();
    const handleKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose?.();
        return;
      }
      if (e.key !== "Tab") return;
      const items = getFocusable();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const activeEl = document.activeElement;
      if (e.shiftKey) {
        if (activeEl === first || !container.contains(activeEl)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (activeEl === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [active, onClose]);
  return containerRef;
}
function cn(...inputs) {
  return twMerge(clsx(inputs));
}
const PopoverContent = React.forwardRef(({ className, align = "center", sideOffset = 4, ...props }, ref) => /* @__PURE__ */ jsx(PopoverPrimitive.Portal, { children: /* @__PURE__ */ jsx(
  PopoverPrimitive.Content,
  {
    ref,
    align,
    sideOffset,
    className: cn(
      "z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-popover-content-transform-origin)",
      className
    ),
    ...props
  }
) }));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;
const Checkbox = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  CheckboxPrimitive.Root,
  {
    ref,
    className: cn(
      "grid place-content-center peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
      className
    ),
    ...props,
    children: /* @__PURE__ */ jsx(CheckboxPrimitive.Indicator, { className: cn("grid place-content-center text-current"), children: /* @__PURE__ */ jsx(Check, { className: "h-4 w-4" }) })
  }
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;
const Slider = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsxs(
  SliderPrimitive.Root,
  {
    ref,
    className: cn("relative flex w-full touch-none select-none items-center", className),
    ...props,
    children: [
      /* @__PURE__ */ jsx(SliderPrimitive.Track, { className: "relative h-1.5 w-full grow overflow-hidden rounded-full bg-primary/20", children: /* @__PURE__ */ jsx(SliderPrimitive.Range, { className: "absolute h-full bg-primary" }) }),
      /* @__PURE__ */ jsx(SliderPrimitive.Thumb, { className: "block h-4 w-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" })
    ]
  }
));
Slider.displayName = SliderPrimitive.Root.displayName;
const Input = React.forwardRef(
  ({ className, type, ...props }, ref) => {
    return /* @__PURE__ */ jsx(
      "input",
      {
        type,
        className: cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        ),
        ref,
        ...props
      }
    );
  }
);
Input.displayName = "Input";
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline"
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);
const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return /* @__PURE__ */ jsx(Comp, { className: cn(buttonVariants({ variant, size, className })), ref, ...props });
  }
);
Button.displayName = "Button";
const EMPTY_FILTERS = {
  q: "",
  countries: [],
  mediums: [],
  genders: [],
  cities: [],
  artists: [],
  ageRange: null,
  priceRange: null
};
function bustImageUrl(url, version) {
  if (!url) return "";
  if (url.startsWith("data:") || url.startsWith("blob:")) return url;
  if (/\/assets\/.+-[A-Za-z0-9_]{6,}\./.test(url)) return url;
  const token = version != null && String(version).length > 0 ? encodeURIComponent(String(version)) : "";
  if (!token) return url;
  const sep = url.includes("?") ? "&" : "?";
  if (new RegExp(`[?&]v=${token}(&|$)`).test(url)) return url;
  return `${url}${sep}v=${token}`;
}
const logo = "/assets/myafriart-logo-CZTHbkNb.png";
function AiChatPanel({
  open,
  onClose,
  sponsored
}) {
  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat" }), []);
  const { messages, sendMessage, status, error } = useChat({ transport });
  const [input, setInput] = useState("");
  const [sponsorIdx, setSponsorIdx] = useState(0);
  const [sponsorTick, setSponsorTick] = useState(0);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  useEffect(() => {
    if (!open || sponsored.length === 0) return;
    const id = setInterval(() => {
      setSponsorIdx((i) => (i + 1) % sponsored.length);
    }, 2e4);
    return () => clearInterval(id);
  }, [open, sponsored.length, sponsorTick]);
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 60);
  }, [open]);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);
  if (!open) return null;
  const isLoading = status === "submitted" || status === "streaming";
  const sponsor = sponsored[sponsorIdx];
  const onSubmit = (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    sendMessage({ text });
    setInput("");
  };
  const loadNewSponsored = () => {
    setSponsorIdx((i) => (i + 1) % Math.max(sponsored.length, 1));
    setSponsorTick((t) => t + 1);
  };
  return /* @__PURE__ */ jsxs("div", { className: "fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6", children: [
    /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        "aria-label": "Close chat",
        onClick: onClose,
        className: "absolute inset-0 bg-black/40 backdrop-blur-sm"
      }
    ),
    /* @__PURE__ */ jsxs("div", { className: "relative flex h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-background shadow-2xl sm:h-[78vh] sm:rounded-2xl", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between border-b border-border px-5 py-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(Sparkles, { className: "h-4 w-4 text-primary" }),
          /* @__PURE__ */ jsx("span", { className: "text-sm font-medium tracking-tight", children: "MyAfriart Concierge" })
        ] }),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: onClose,
            "aria-label": "Close",
            className: "rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground",
            children: /* @__PURE__ */ jsx(X, { className: "h-4 w-4" })
          }
        )
      ] }),
      sponsor && /* @__PURE__ */ jsxs("div", { className: "border-b border-border bg-muted/40 px-5 py-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between pb-2", children: [
          /* @__PURE__ */ jsxs("span", { className: "text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground", children: [
            "Sponsored · ",
            sponsor.kicker
          ] }),
          /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              onClick: loadNewSponsored,
              className: "inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground transition hover:border-foreground hover:text-foreground",
              children: [
                /* @__PURE__ */ jsx(RefreshCw, { className: "h-3 w-3" }),
                "Load sponsored"
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxs(
          "a",
          {
            href: sponsor.to,
            className: "group flex items-center gap-3 rounded-xl bg-background p-2 ring-1 ring-border transition hover:ring-foreground/40",
            children: [
              /* @__PURE__ */ jsx(
                "img",
                {
                  src: sponsor.image,
                  alt: sponsor.title,
                  className: "h-14 w-14 flex-none rounded-lg object-cover",
                  loading: "lazy"
                }
              ),
              /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
                /* @__PURE__ */ jsx("p", { className: "truncate text-sm font-medium", children: sponsor.title }),
                /* @__PURE__ */ jsx("p", { className: "line-clamp-1 text-xs text-muted-foreground", children: sponsor.summary })
              ] }),
              /* @__PURE__ */ jsx("span", { className: "text-xs text-muted-foreground group-hover:text-foreground", children: "→" })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { ref: scrollRef, className: "flex-1 space-y-4 overflow-y-auto px-5 py-4", children: [
        messages.length === 0 && /* @__PURE__ */ jsx("div", { className: "pt-6 text-center", children: /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Ask about artists, pieces, auctions, or how artstage works." }) }),
        messages.map((m) => {
          const text = m.parts.map((p) => p.type === "text" ? p.text : "").join("");
          const isUser = m.role === "user";
          return /* @__PURE__ */ jsx("div", { className: `flex ${isUser ? "justify-end" : "justify-start"}`, children: /* @__PURE__ */ jsx(
            "div",
            {
              className: `max-w-[85%] whitespace-pre-wrap text-sm leading-relaxed ${isUser ? "rounded-2xl bg-primary px-4 py-2 text-primary-foreground" : "text-foreground"}`,
              children: text
            }
          ) }, m.id);
        }),
        isLoading && /* @__PURE__ */ jsx("div", { className: "flex justify-start", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1 text-sm text-muted-foreground", children: [
          /* @__PURE__ */ jsx("span", { className: "h-1.5 w-1.5 animate-pulse rounded-full bg-current" }),
          /* @__PURE__ */ jsx("span", { className: "h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:120ms]" }),
          /* @__PURE__ */ jsx("span", { className: "h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:240ms]" })
        ] }) }),
        error && /* @__PURE__ */ jsx("p", { className: "text-xs text-destructive", children: "Something went wrong. Try again." })
      ] }),
      /* @__PURE__ */ jsx("form", { onSubmit, className: "border-t border-border px-5 py-3", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 focus-within:border-foreground/60", children: [
        /* @__PURE__ */ jsx(
          "input",
          {
            ref: inputRef,
            value: input,
            onChange: (e) => setInput(e.target.value),
            placeholder: "Message the concierge…",
            className: "flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "submit",
            disabled: !input.trim() || isLoading,
            "aria-label": "Send",
            className: "rounded-full bg-primary p-1.5 text-primary-foreground transition disabled:opacity-40",
            children: /* @__PURE__ */ jsx(Send, { className: "h-3.5 w-3.5" })
          }
        )
      ] }) })
    ] })
  ] });
}
function paneImageFor(pane) {
  return pane.image || MOCK_PANE_ASSETS[pane.id]?.image || localImageForKey(pane.id) || artistDefault;
}
const MOCK_PANE_ASSETS = {
  artist: {
    gradient: "from-amber-500 via-orange-600 to-rose-700",
    image: localPaneAssets.artist,
    to: "/",
    scope: "artists",
    exploreLabel: "View artists →"
  },
  event: {
    gradient: "from-emerald-500 via-teal-600 to-sky-800",
    image: localPaneAssets.event,
    to: "/lounge",
    loungeTab: "sell",
    exploreLabel: "Open event floor →"
  },
  piece: {
    gradient: "from-yellow-400 via-amber-600 to-stone-800",
    image: localPaneAssets.piece,
    to: "/",
    scope: "artworks",
    exploreLabel: "View artworks →"
  },
  stage: {
    gradient: "from-indigo-600 via-violet-700 to-fuchsia-800",
    image: localPaneAssets.stage,
    to: "/studio",
    exploreLabel: "Open artstage →"
  },
  auction: {
    gradient: "from-rose-600 via-red-700 to-neutral-900",
    image: localPaneAssets.auction,
    to: "/auction",
    exploreLabel: "Enter auctions →"
  },
  lounge: {
    gradient: "from-stone-800 via-zinc-900 to-black",
    image: localPaneAssets.lounge,
    to: "/lounge",
    loungeTab: "sell",
    exploreLabel: "Enter the lounge →",
    special: "lounge"
  }
};
const PANE_ASSET_VERSION = "pane-assets-v1";
const FALLBACK_GRADIENT = "from-stone-700 via-zinc-800 to-black";
const FALLBACK_PANES = [{
  id: "artist",
  kicker: "Artist of the week",
  title: "Adaeze Okonkwo",
  summary: "Lagos-based painter blending Nsibidi script with bold oil abstractions. Her new series channels market noise into colour. Featured this week across the Studio.",
  reveal: "Discover Adaeze's process, studio notes, and the works shaping the marketplace this week.",
  ...MOCK_PANE_ASSETS.artist
}, {
  id: "event",
  kicker: "Event of the week",
  title: "Sauti Sessions · Nairobi",
  summary: "A two-night live-painting and jazz residency at the Karen Pavilion. Twelve artists, six musicians, one canvas built in real time. Doors at 18:00.",
  reveal: "Find the events where contemporary African art, performance, and conversation meet.",
  ...MOCK_PANE_ASSETS.event
}, {
  id: "piece",
  kicker: "Art piece of the week",
  title: "Harmattan, II",
  summary: "Pastel on raw linen, 120 × 90 cm. A study of dry-season light over the Sahel. One of three in the series, the only one offered publicly.",
  reveal: "Reveal the details, story, and buying path for this standout piece on MyAfriart.",
  ...MOCK_PANE_ASSETS.piece
}, {
  id: "stage",
  kicker: "Stage your space",
  title: "with artstage",
  summary: "Point your camera at a wall and drop any piece in at true scale. Walk around it, change the light, send the render to a friend before you commit.",
  reveal: "Stage artwork at realistic scale and compare how different works transform your room.",
  ...MOCK_PANE_ASSETS.stage
}, {
  id: "auction",
  kicker: "Live auction",
  title: "Friday Evening Sale",
  summary: "Forty-two lots from across the continent, opening at 19:00 WAT. Bid live from anywhere, with absentee bids accepted up to one hour before.",
  reveal: "View auction highlights, bidding windows, and works drawing attention from collectors.",
  ...MOCK_PANE_ASSETS.auction
}, {
  id: "lounge",
  kicker: "Members only",
  title: "Sale Lounge",
  summary: "A private floor for verified buyers and sellers. Step inside for live auctions and personal sales listed by registered art owners.",
  reveal: "Step through the doors to access private sales, auction activity, and collector tools.",
  ...MOCK_PANE_ASSETS.lounge
}];
const AFRICAN_COUNTRIES = ["Algeria", "Angola", "Benin", "Botswana", "Burkina Faso", "Burundi", "Cabo Verde", "Cameroon", "Central African Republic", "Chad", "Comoros", "Democratic Republic of the Congo", "Republic of the Congo", "Côte d'Ivoire", "Djibouti", "Egypt", "Equatorial Guinea", "Eritrea", "Eswatini", "Ethiopia", "Gabon", "Gambia", "Ghana", "Guinea", "Guinea-Bissau", "Kenya", "Lesotho", "Liberia", "Libya", "Madagascar", "Malawi", "Mali", "Mauritania", "Mauritius", "Morocco", "Mozambique", "Namibia", "Niger", "Nigeria", "Rwanda", "São Tomé and Príncipe", "Senegal", "Seychelles", "Sierra Leone", "Somalia", "South Africa", "South Sudan", "Sudan", "Tanzania", "Togo", "Tunisia", "Uganda", "Zambia", "Zimbabwe"];
const ALL_GENDERS = ["Male", "Female"];
const FALLBACK_USD_TO_NGN = 1600;
const PRICE_CEILING_USD = 1e6;
function Landing() {
  const navigate = useNavigate({
    from: "/"
  });
  const search = Route.useSearch();
  const scrollerRef = useRef(null);
  const catalogueRef = useRef(null);
  const [openId, setOpenId] = useState(null);
  const [loungeOpen, setLoungeOpen] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [userId, setUserId] = useState(null);
  const [gatePromptOpen, setGatePromptOpen] = useState(false);
  const [panes, setPanes] = useState(FALLBACK_PANES);
  const [artworks, setArtworks] = useState(LOCAL_MOCK_ARTWORKS);
  const [catalogueArtists, setCatalogueArtists] = useState([]);
  const [loadingCatalogue, setLoadingCatalogue] = useState(false);
  const [openChip, setOpenChip] = useState(null);
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [currency, setCurrency] = useState("USD");
  const [usdToNgn, setUsdToNgn] = useState(FALLBACK_USD_TO_NGN);
  const [contentSource, setContentSource] = useState("mock");
  const [paneRetryNonce, setPaneRetryNonce] = useState(0);
  const [paneFailedCount, setPaneFailedCount] = useState(0);
  const registerPaneFailure = useCallback((failed) => {
    setPaneFailedCount((n) => Math.max(0, n + (failed ? 1 : -1)));
  }, []);
  const handleRetryPaneImages = useCallback(() => {
    setPaneFailedCount(0);
    setPaneRetryNonce((n) => n + 1);
  }, []);
  const sessionId = useSessionId();
  const recordClick = useServerFn(recordEntryClick);
  const fetchCataloguePieces = useServerFn(getCataloguePieces);
  const fetchCatalogueArtists = useServerFn(getCatalogueArtists);
  const fetchLandingPanes = useServerFn(getLandingPanes);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const {
          panes: dbPanes
        } = await fetchLandingPanes();
        if (cancelled || !dbPanes || dbPanes.length === 0) return;
        const merged = dbPanes.map((p) => {
          const visual = MOCK_PANE_ASSETS[p.pane_id] ?? {
            gradient: FALLBACK_GRADIENT,
            image: localImageForKey(p.pane_id) || artistDefault,
            to: "/studio"
          };
          return {
            id: p.pane_id,
            kicker: p.kicker,
            title: p.title,
            summary: p.summary,
            reveal: p.reveal,
            gradient: visual.gradient,
            image: visual.image,
            to: visual.to,
            ...visual.scope ? {
              scope: visual.scope
            } : {},
            ...visual.loungeTab ? {
              loungeTab: visual.loungeTab
            } : {},
            ...visual.exploreLabel ? {
              exploreLabel: visual.exploreLabel
            } : {},
            ...visual.special ? {
              special: visual.special
            } : {}
          };
        });
        setPanes(merged);
      } catch (err) {
        console.error("[landing] panes fetch failed:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchLandingPanes]);
  useEffect(() => {
    let cancelled = false;
    fetch("https://open.er-api.com/v6/latest/USD").then((r) => r.json()).then((j) => {
      const rate = j?.rates?.NGN;
      if (!cancelled && typeof rate === "number" && rate > 0) setUsdToNgn(rate);
    }).catch(() => {
    });
    return () => {
      cancelled = true;
    };
  }, []);
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
    let cancelled = false;
    setLoadingCatalogue(true);
    (async () => {
      try {
        const [pieces, artists] = await Promise.all([fetchCataloguePieces(), fetchCatalogueArtists()]);
        if (cancelled) return;
        const rows = pieces?.pieces ?? [];
        const localRows = rows.length ? rows.map((row, index) => ({
          ...row,
          image_url: row.image_url || localImageForKey(row.id || row.title, index)
        })) : LOCAL_MOCK_ARTWORKS;
        setArtworks(localRows);
        setCatalogueArtists(artists?.artists ?? []);
        setContentSource(rows.length ? "live" : "mock");
      } catch {
        if (!cancelled) {
          setArtworks(LOCAL_MOCK_ARTWORKS);
          setContentSource("mock");
        }
      } finally {
        if (!cancelled) setLoadingCatalogue(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  const filters = useMemo(() => ({
    q: search.q,
    countries: search.countries,
    mediums: search.mediums,
    genders: search.genders,
    cities: search.cities,
    artists: search.artists,
    ageRange: search.age,
    priceRange: search.price
  }), [search]);
  const scope = search.scope;
  const scrollToCatalogue = useCallback(() => {
    requestAnimationFrame(() => {
      catalogueRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });
  }, []);
  useEffect(() => {
    if (search.focus === "artists" || search.focus === "artworks") {
      scrollToCatalogue();
    }
  }, [search.focus, search.scope, scrollToCatalogue]);
  const updateFilters = (next) => {
    navigate({
      search: {
        q: next.q || "",
        scope: scope === "all" ? void 0 : scope,
        focus: "catalogue",
        countries: next.countries.length ? next.countries : void 0,
        mediums: next.mediums.length ? next.mediums : void 0,
        genders: next.genders.length ? next.genders : void 0,
        cities: next.cities.length ? next.cities : void 0,
        artists: next.artists.length ? next.artists : void 0,
        age: next.ageRange ? `${next.ageRange[0]},${next.ageRange[1]}` : void 0,
        price: next.priceRange ? `${next.priceRange[0]},${next.priceRange[1]}` : void 0
      },
      replace: true
    });
    scrollToCatalogue();
  };
  const [draftFilters, setDraftFilters] = useState(filters);
  useEffect(() => {
    setDraftFilters(filters);
  }, [filters]);
  const submitDraftFilters = (nextFilters) => {
    const next = nextFilters && Array.isArray(nextFilters.countries) ? nextFilters : draftFilters;
    updateFilters(next);
    setOpenChip(null);
  };
  const resetDraftFilters = () => {
    setDraftFilters(EMPTY_FILTERS);
    updateFilters(EMPTY_FILTERS);
    setOpenChip(null);
  };
  const openPaneDestination = (pane) => {
    if (pane.special === "lounge") {
      requestLounge();
      return;
    }
    if (pane.to === "/" && pane.scope) {
      setOpenId(null);
      navigate({
        search: (prev) => ({
          ...prev,
          scope: pane.scope,
          focus: pane.scope
        }),
        replace: true
      });
      scrollToCatalogue();
      return;
    }
    setOpenId(null);
    navigate({
      to: pane.to,
      ...pane.to === "/lounge" && pane.loungeTab ? {
        search: {
          tab: pane.loungeTab
        }
      } : {}
    });
  };
  const facets = useMemo(() => {
    const set = (vals) => Array.from(new Set(vals.filter((v) => !!v && v.trim().length > 0))).sort();
    const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
    const ages = artworks.map((a) => {
      const y = a.year ? parseInt(String(a.year).trim().slice(0, 4), 10) : NaN;
      return Number.isFinite(y) ? Math.max(0, currentYear - y) : null;
    }).filter((n) => n !== null);
    artworks.map((a) => typeof a.price === "number" ? a.price : null).filter((n) => n !== null);
    const mergedCountries = Array.from(/* @__PURE__ */ new Set([...AFRICAN_COUNTRIES, ...set(artworks.map((a) => a.artist?.country))])).sort();
    const mergedGenders = Array.from(/* @__PURE__ */ new Set([...ALL_GENDERS, ...set(artworks.map((a) => a.artist?.gender))]));
    const mergedArtists = Array.from(/* @__PURE__ */ new Set([...set(artworks.map((a) => a.artist?.name)), ...catalogueArtists.map((ca) => ca.name).filter((n) => !!n)])).sort();
    return {
      countries: mergedCountries,
      mediums: set(artworks.map((a) => a.medium)),
      genders: mergedGenders,
      cities: set(artworks.map((a) => a.artist?.domicile_city)),
      artists: mergedArtists,
      ageBounds: [0, Math.max(200, ages.length ? Math.max(...ages) : 0)],
      priceBounds: [0, PRICE_CEILING_USD]
    };
  }, [artworks, catalogueArtists]);
  const filteredArtworks = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    const clean = (v) => (v ?? "").trim().toLowerCase();
    const selectedMatches = (selected, value) => selected.length === 0 || selected.some((s) => clean(s) === clean(value));
    const artistMatches = (artist) => {
      if (!selectedMatches(filters.countries, artist?.country)) return false;
      if (!selectedMatches(filters.genders, artist?.gender)) return false;
      if (!selectedMatches(filters.cities, artist?.domicile_city)) return false;
      if (!selectedMatches(filters.artists, artist?.name)) return false;
      return true;
    };
    const artworkMatches = (a) => {
      if (!selectedMatches(filters.mediums, a.medium)) return false;
      if (filters.ageRange) {
        const y = a.year ? parseInt(String(a.year).trim().slice(0, 4), 10) : NaN;
        if (!Number.isFinite(y)) return false;
        const age = Math.max(0, (/* @__PURE__ */ new Date()).getFullYear() - y);
        if (age < filters.ageRange[0] || age > filters.ageRange[1]) return false;
      }
      if (filters.priceRange) {
        if (a.price === null || a.price < filters.priceRange[0] || a.price > filters.priceRange[1]) return false;
      }
      return true;
    };
    return artworks.filter((a) => {
      if (!artistMatches(a.artist)) return false;
      if (!artworkMatches(a)) return false;
      if (q) {
        const title = a.title.toLowerCase();
        const name = (a.artist?.name ?? "").toLowerCase();
        if (scope === "artworks") {
          if (!title.includes(q)) return false;
        } else {
          if (!title.includes(q) && !name.includes(q)) return false;
        }
      }
      return true;
    });
  }, [artworks, filters, scope]);
  const filteredArtists = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    const clean = (v) => (v ?? "").trim().toLowerCase();
    const selectedMatches = (selected, value) => selected.length === 0 || selected.some((s) => clean(s) === clean(value));
    const artistMatches = (artist) => {
      if (!selectedMatches(filters.countries, artist?.country)) return false;
      if (!selectedMatches(filters.genders, artist?.gender)) return false;
      if (!selectedMatches(filters.cities, artist?.domicile_city)) return false;
      if (!selectedMatches(filters.artists, artist?.name)) return false;
      return true;
    };
    const artworkMatches = (a) => {
      if (!selectedMatches(filters.mediums, a.medium)) return false;
      if (filters.ageRange) {
        const y = a.year ? parseInt(String(a.year).trim().slice(0, 4), 10) : NaN;
        if (!Number.isFinite(y)) return false;
        const age = Math.max(0, (/* @__PURE__ */ new Date()).getFullYear() - y);
        if (age < filters.ageRange[0] || age > filters.ageRange[1]) return false;
      }
      if (filters.priceRange) {
        if (a.price === null || a.price < filters.priceRange[0] || a.price > filters.priceRange[1]) return false;
      }
      return true;
    };
    const map = /* @__PURE__ */ new Map();
    for (const a of artworks) {
      if (!a.artist) continue;
      if (!artistMatches(a.artist)) continue;
      if (!artworkMatches(a)) continue;
      if (q) {
        const name = a.artist.name.toLowerCase();
        if (scope === "artists") {
          if (!name.includes(q)) continue;
        } else {
          const title = a.title.toLowerCase();
          if (!name.includes(q) && !title.includes(q)) continue;
        }
      }
      const existing = map.get(a.artist.id);
      if (existing) {
        existing.pieceCount += 1;
      } else {
        map.set(a.artist.id, {
          artist: a.artist,
          pieceCount: 1,
          sample: a
        });
      }
    }
    const artworkFiltersActive = filters.mediums.length > 0 || filters.priceRange !== null || filters.ageRange !== null;
    if (!artworkFiltersActive) {
      for (const ca of catalogueArtists) {
        if (map.has(ca.id)) continue;
        if (!artistMatches(ca)) continue;
        if (q && !ca.name.toLowerCase().includes(q)) continue;
        map.set(ca.id, {
          artist: {
            id: ca.id,
            short_code: ca.short_code,
            name: ca.name,
            country: ca.country,
            gender: ca.gender,
            domicile_city: ca.domicile_city,
            date_of_birth: ca.date_of_birth
          },
          pieceCount: 0,
          sample: null,
          portraitUrl: ca.portrait_url
        });
      }
    }
    return Array.from(map.values()).sort((x, y) => x.artist.name.localeCompare(y.artist.name));
  }, [artworks, catalogueArtists, filters, scope]);
  const requestLounge = () => {
    if (authed) setLoungeOpen(true);
    else setGatePromptOpen(true);
  };
  const trackClick = async (entryPoint, location) => {
    if (!sessionId) return;
    try {
      await recordClick({
        data: {
          entry_point: entryPoint,
          location,
          session_id: sessionId,
          user_id: userId
        }
      });
    } catch {
    }
  };
  const scrollBy = (dir) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({
      left: dir * Math.min(el.clientWidth * 0.8, 520),
      behavior: "smooth"
    });
  };
  const active = panes.find((p) => p.id === openId) ?? null;
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-background text-foreground", children: [
    /* @__PURE__ */ jsxs("div", { className: "sticky top-0 z-50", children: [
      /* @__PURE__ */ jsx("div", { className: "bg-white border-b border-black/10", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 sm:px-6 sm:py-3", children: [
        /* @__PURE__ */ jsxs(Link, { to: "/", className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsx("span", { className: "flex h-9 w-9 items-center justify-center rounded-full bg-white ring-2 ring-black sm:h-10 sm:w-10", children: /* @__PURE__ */ jsx("img", { src: logo, alt: "MyAfriart logo", className: "h-7 w-7 sm:h-8 sm:w-8 object-contain" }) }),
          /* @__PURE__ */ jsx("span", { className: "font-display text-xl tracking-tight sm:text-2xl bg-clip-text text-transparent", style: {
            backgroundImage: "linear-gradient(90deg,#7e22ce 0%,#dc2626 55%,#f97316 100%)"
          }, children: "MyAfriArtX" })
        ] }),
        /* @__PURE__ */ jsx("nav", { className: "flex flex-shrink-0 items-center gap-2 text-sm sm:gap-3", children: /* @__PURE__ */ jsx(Link, { to: "/login", className: "px-1 text-black/70 hover:text-black", children: "Sign in" }) })
      ] }) }),
      /* @__PURE__ */ jsx("header", { className: "bg-gradient-to-r from-purple-600 to-red-500 text-white border-b border-black/15 shadow-none", children: /* @__PURE__ */ jsx("div", { className: "mx-auto max-w-6xl px-4 pt-3 pb-3 sm:px-6", children: /* @__PURE__ */ jsx(TopBarFilter, { filters: draftFilters, facets, onChange: setDraftFilters, onSubmit: submitDraftFilters, onReset: resetDraftFilters, openChip, setOpenChip, onOpenChat: () => setAiChatOpen(true) }) }) }),
      /* @__PURE__ */ jsx(FilterSubBar, { filters: draftFilters, facets, onChange: setDraftFilters, onSubmit: submitDraftFilters, openChip, onClose: () => setOpenChip(null), currency, setCurrency, usdToNgn })
    ] }),
    /* @__PURE__ */ jsxs("main", { className: "mx-auto max-w-6xl px-4 pb-32 pt-6 sm:px-6 sm:pt-10", children: [
      /* @__PURE__ */ jsxs("div", { className: "max-w-2xl", children: [
        /* @__PURE__ */ jsxs("h1", { className: "font-display text-[28px] leading-[1.08] sm:text-5xl md:text-6xl md:leading-[1.05]", children: [
          /* @__PURE__ */ jsx("span", { className: "block", children: "Discover African art." }),
          /* @__PURE__ */ jsx("span", { className: "block", children: "Buy, sell, bid and" }),
          /* @__PURE__ */ jsx("span", { className: "block", children: "stage your space" }),
          /* @__PURE__ */ jsx("span", { className: "block", children: "virtually" })
        ] }),
        /* @__PURE__ */ jsx("p", { className: "mt-3 max-w-md text-sm text-muted-foreground sm:mt-4 sm:text-base", children: "A curated catalogue of paintings, pastels and sculptures. Buy, sell, or bid in live auctions — and preview any piece on your wall first." })
      ] }),
      /* @__PURE__ */ jsxs("section", { className: "relative mt-8 sm:mt-12", children: [
        /* @__PURE__ */ jsxs("div", { className: "mb-3 flex items-end justify-between gap-3", children: [
          /* @__PURE__ */ jsx("h2", { className: "font-display text-xl sm:text-2xl", children: "This week on MyAfriart" }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
            paneFailedCount > 0 && /* @__PURE__ */ jsxs("button", { type: "button", onClick: handleRetryPaneImages, className: "inline-flex h-9 items-center rounded-full border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-accent", children: [
              "Retry loading images (",
              paneFailedCount,
              ")"
            ] }),
            /* @__PURE__ */ jsx("button", { type: "button", "aria-label": "Scroll left", onClick: () => scrollBy(-1), className: "inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground transition hover:bg-accent", children: "←" }),
            /* @__PURE__ */ jsx("button", { type: "button", "aria-label": "Scroll right", onClick: () => scrollBy(1), className: "inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground transition hover:bg-accent", children: "→" })
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { ref: scrollerRef, className: "flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", children: panes.map((p) => /* @__PURE__ */ jsx(PaneCard, { pane: p, retryNonce: paneRetryNonce, onFailureChange: registerPaneFailure, onOpen: () => {
          setOpenId(p.id);
        } }, p.id)) })
      ] }),
      /* @__PURE__ */ jsx("section", { className: "mt-10 sm:mt-14", children: /* @__PURE__ */ jsxs("button", { type: "button", onClick: () => {
        trackClick("sell_your_work", "lounge_merged_cta");
        requestLounge();
      }, className: "group relative block w-full overflow-hidden rounded-2xl border border-amber-500/30 bg-zinc-950 text-left shadow-xl transition hover:shadow-2xl", children: [
        /* @__PURE__ */ jsxs("div", { className: "absolute inset-0 z-0", children: [
          /* @__PURE__ */ jsx("img", { src: paneEvent, alt: "", className: "h-full w-full object-contain opacity-40 transition duration-700 group-hover:opacity-50" }),
          /* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/30" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "relative z-10 flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-10", children: [
          /* @__PURE__ */ jsxs("div", { className: "max-w-xl", children: [
            /* @__PURE__ */ jsx("p", { className: "text-[11px] font-semibold uppercase tracking-[0.3em] text-amber-400", children: "One place. Every move." }),
            /* @__PURE__ */ jsx("h2", { className: "mt-2 font-display text-2xl leading-tight text-stone-50 sm:text-4xl", children: "Discover, bid, sell and stage — all inside the Art Lounge." }),
            /* @__PURE__ */ jsx("p", { className: "mt-3 text-sm text-stone-300 sm:text-base", children: "Step through the doors to browse live auctions, buy and sell direct from collectors, or stage any piece on your own wall." })
          ] }),
          /* @__PURE__ */ jsx("span", { className: "inline-flex shrink-0 items-center gap-2 self-start rounded-md bg-amber-500 px-5 py-3 text-sm font-medium text-zinc-950 transition group-hover:bg-amber-400 sm:self-auto", children: "Enter the Art Lounge →" })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxs("section", { ref: catalogueRef, className: "mt-12 sm:mt-16", children: [
        /* @__PURE__ */ jsx("div", { className: "mb-4 flex flex-wrap items-end justify-end gap-3", children: /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: loadingCatalogue ? "Loading…" : `${filteredArtists.length} artist${filteredArtists.length === 1 ? "" : "s"} · ${filteredArtworks.length} piece${filteredArtworks.length === 1 ? "" : "s"}` }) }),
        (scope === "all" || scope === "artists") && /* @__PURE__ */ jsxs("div", { className: "mb-10", children: [
          /* @__PURE__ */ jsxs("h3", { className: "mb-3 font-display text-lg sm:text-xl", children: [
            "Artists",
            " ",
            /* @__PURE__ */ jsxs("span", { className: "text-sm font-normal text-muted-foreground", children: [
              "(",
              filteredArtists.length,
              ")"
            ] })
          ] }),
          filteredArtists.length === 0 ? /* @__PURE__ */ jsx("div", { className: "rounded-lg border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground", children: "No artists match these filters." }) : /* @__PURE__ */ jsx("div", { className: "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4", children: filteredArtists.map((entry) => {
            const code = entry.artist.short_code ?? (entry.sample?.content_source !== "mock" && !String(entry.artist.id).startsWith("local-") ? entry.artist.id : null);
            const card = /* @__PURE__ */ jsxs(Fragment, { children: [
              /* @__PURE__ */ jsx("div", { className: "relative aspect-square overflow-hidden bg-muted", children: entry.sample?.image_url ? /* @__PURE__ */ jsx("img", { src: bustImageUrl(entry.sample.image_url, entry.sample.updated_at ?? entry.sample.id), alt: `Work by ${entry.artist.name}`, loading: "lazy", className: "absolute inset-0 h-full w-full object-contain transition" }) : entry.portraitUrl ? /* @__PURE__ */ jsx("img", { src: bustImageUrl(entry.portraitUrl, entry.artist.id), alt: entry.artist.name, loading: "lazy", className: "absolute inset-0 h-full w-full object-contain transition" }) : /* @__PURE__ */ jsx("div", { className: "absolute inset-0 flex h-full w-full items-center justify-center text-xs text-muted-foreground", children: "No image" }) }),
              /* @__PURE__ */ jsxs("div", { className: "p-3", children: [
                /* @__PURE__ */ jsx("p", { className: "truncate text-sm font-semibold", children: entry.artist.name }),
                /* @__PURE__ */ jsx("p", { className: "mt-0.5 truncate text-xs text-muted-foreground", children: [entry.artist.country, entry.artist.domicile_city].filter(Boolean).join(" · ") || "—" }),
                /* @__PURE__ */ jsxs("p", { className: "mt-1 text-[11px] text-muted-foreground", children: [
                  entry.pieceCount,
                  " matching piece",
                  entry.pieceCount === 1 ? "" : "s"
                ] })
              ] })
            ] });
            return code ? /* @__PURE__ */ jsx(Link, { to: "/artist/$code", params: {
              code
            }, className: "group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition hover:shadow-md", children: card }, entry.artist.id) : /* @__PURE__ */ jsx("button", { type: "button", onClick: () => updateFilters({
              ...filters,
              q: entry.artist.name
            }), className: "group flex flex-col overflow-hidden rounded-lg border border-border bg-card text-left transition hover:shadow-md", children: card }, entry.artist.id);
          }) })
        ] }),
        (scope === "all" || scope === "artworks") && /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs("h3", { className: "mb-3 font-display text-lg sm:text-xl", children: [
            "Artworks",
            " ",
            /* @__PURE__ */ jsxs("span", { className: "text-sm font-normal text-muted-foreground", children: [
              "(",
              filteredArtworks.length,
              ")"
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4", children: [
            filteredArtworks.map((a) => /* @__PURE__ */ jsx(ArtworkCard, { artwork: a }, a.id)),
            !loadingCatalogue && filteredArtworks.length === 0 && /* @__PURE__ */ jsxs("div", { className: "col-span-full rounded-lg border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground", children: [
              "No works match these filters.",
              " ",
              /* @__PURE__ */ jsx("button", { type: "button", onClick: () => updateFilters(EMPTY_FILTERS), className: "underline-offset-4 hover:underline", children: "Reset" })
            ] })
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx("footer", { className: "border-t border-zinc-900 bg-zinc-900 text-zinc-200 pb-24 md:pb-0", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto flex max-w-6xl flex-col items-start gap-2 px-4 py-5 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-6", children: [
      /* @__PURE__ */ jsx("div", { children: "© MyAfriart" }),
      /* @__PURE__ */ jsxs("nav", { className: "flex items-center gap-4", children: [
        /* @__PURE__ */ jsx(Link, { to: "/", className: "font-medium text-white hover:text-white/80", children: "Discover" }),
        /* @__PURE__ */ jsx(Link, { to: "/lounge", className: "font-medium text-white hover:text-white/80", children: "Art Lounge" }),
        /* @__PURE__ */ jsx(Link, { to: "/studio", className: "font-medium text-white hover:text-white/80", children: "Stage a room" })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx("div", { className: "fixed bottom-0 left-0 right-0 z-40 flex gap-2 border-t border-white/10 bg-zinc-900 p-3 md:hidden", children: /* @__PURE__ */ jsx(Link, { to: "/studio", className: "inline-flex flex-1 items-center justify-center bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 hover:bg-white/90", children: "Stage a room" }) }),
    active && /* @__PURE__ */ jsx(RevealModal, { active, onClose: () => setOpenId(null), onExplore: () => openPaneDestination(active) }),
    loungeOpen && /* @__PURE__ */ jsx(SaleLounge, { onClose: () => setLoungeOpen(false) }),
    gatePromptOpen && /* @__PURE__ */ jsx(GatePrompt, { onClose: () => setGatePromptOpen(false), onSignIn: () => {
      setGatePromptOpen(false);
      navigate({
        to: "/login"
      });
    } }),
    /* @__PURE__ */ jsx(AiChatPanel, { open: aiChatOpen, onClose: () => setAiChatOpen(false), sponsored: panes.map((p) => ({
      id: p.id,
      kicker: p.kicker,
      title: p.title,
      summary: p.summary,
      image: paneImageFor(p),
      to: p.to === "/" && p.scope ? `/?scope=${p.scope}&focus=${p.scope}` : p.to === "/lounge" && p.loungeTab ? `/lounge?tab=${p.loungeTab}` : p.to
    })) })
  ] });
}
function PaneCard({
  pane,
  onOpen,
  retryNonce,
  onFailureChange
}) {
  const ref = useRef(null);
  const recorded = useRef(false);
  const record = useServerFn(recordPaneView);
  const paneImage = paneImageFor(pane);
  const [failed, setFailed] = useState(false);
  const failedRef = useRef(false);
  useEffect(() => {
    if (failedRef.current) {
      failedRef.current = false;
      onFailureChange(false);
    }
    setFailed(false);
  }, [retryNonce, paneImage, onFailureChange]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const el = ref.current;
    if (!el) return;
    const KEY = "myafriart_session_id";
    let sid = localStorage.getItem(KEY);
    if (!sid) {
      sid = (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36)).replace(/-/g, "");
      localStorage.setItem(KEY, sid);
    }
    const seenKey = `myafriart_pane_seen_${pane.id}_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}`;
    if (sessionStorage.getItem(seenKey)) recorded.current = true;
    const obs = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && !recorded.current) {
          recorded.current = true;
          sessionStorage.setItem(seenKey, "1");
          record({
            data: {
              pane_id: pane.id,
              session_id: sid
            }
          }).catch(() => {
          });
          obs.disconnect();
        }
      }
    }, {
      threshold: 0.5
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [pane.id, record]);
  return /* @__PURE__ */ jsxs("button", { ref, type: "button", onClick: onOpen, className: "group relative flex w-[260px] flex-shrink-0 snap-start flex-col overflow-hidden rounded-lg border border-border bg-card text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg sm:w-[320px]", children: [
    /* @__PURE__ */ jsxs("div", { className: "relative z-10 bg-card px-4 pt-3 pb-2", children: [
      /* @__PURE__ */ jsx("p", { className: "text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground", children: pane.kicker }),
      /* @__PURE__ */ jsx("h3", { className: "mt-1 font-display text-lg leading-tight text-foreground", children: pane.title })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: `relative h-48 overflow-hidden bg-gradient-to-br ${pane.gradient} sm:h-60`, children: [
      /* @__PURE__ */ jsx("img", { src: bustImageUrl(paneImage, `${PANE_ASSET_VERSION}-${retryNonce}`), alt: pane.title, loading: "eager", decoding: "async", onError: (event) => {
        const image = event.currentTarget;
        if (image.src !== artistDefault) {
          image.src = artistDefault;
        }
        if (!failedRef.current) {
          failedRef.current = true;
          setFailed(true);
          onFailureChange(true);
        }
      }, className: "absolute inset-0 z-0 h-full w-full object-contain transition duration-500" }, retryNonce),
      failed && /* @__PURE__ */ jsx("div", { className: "absolute bottom-2 left-2 z-30 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white", children: "Image failed to load" }),
      pane.special === "lounge" && /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx("div", { className: "absolute inset-y-0 left-0 z-20 w-1/2 border-r border-amber-400/40 bg-gradient-to-r from-black/70 to-black/5 transition-transform duration-500 group-hover:-translate-x-2" }),
        /* @__PURE__ */ jsx("div", { className: "absolute inset-y-0 right-0 z-20 w-1/2 bg-gradient-to-l from-black/70 to-black/5 transition-transform duration-500 group-hover:translate-x-2" }),
        /* @__PURE__ */ jsx("div", { className: "absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 text-3xl text-amber-400", children: "✦" })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-1 flex-col gap-2 p-4", children: [
      /* @__PURE__ */ jsx("p", { className: "line-clamp-3 text-sm leading-snug text-muted-foreground", children: pane.summary }),
      /* @__PURE__ */ jsx("span", { className: "text-xs font-medium text-primary transition group-hover:translate-x-1", children: pane.special === "lounge" ? "Enter the lounge →" : "Reveal more →" })
    ] })
  ] });
}
function SaleLounge({
  onClose
}) {
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    setEntered(true);
  }, []);
  const trapRef = useFocusTrap(true, onClose);
  return /* @__PURE__ */ jsxs("div", { ref: trapRef, role: "dialog", "aria-modal": "true", "aria-label": "Sale Lounge", tabIndex: -1, className: "fixed inset-0 z-50 overflow-hidden bg-black outline-none", children: [
    /* @__PURE__ */ jsxs("div", { className: `absolute inset-0 z-20 transition-transform duration-[1400ms] ease-[cubic-bezier(0.65,0,0.35,1)] ${entered ? "-translate-x-full" : "translate-x-0"}`, children: [
      /* @__PURE__ */ jsx("img", { src: paneEvent, alt: "Inside the gallery", className: "h-full w-full object-contain" }),
      /* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-black/70" }),
      /* @__PURE__ */ jsxs("div", { className: "absolute bottom-10 left-6 right-6 text-stone-100 sm:bottom-16 sm:left-12", children: [
        /* @__PURE__ */ jsx("p", { className: "text-[11px] uppercase tracking-[0.3em] text-amber-300", children: "Opening the doors…" }),
        /* @__PURE__ */ jsx("h2", { className: "mt-2 font-display text-3xl sm:text-5xl", children: "Welcome to the Art Lounge" })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: `relative z-10 flex h-full w-full flex-col bg-gradient-to-b from-stone-900 via-zinc-950 to-black text-stone-100 transition-opacity duration-700 ${entered ? "opacity-100" : "opacity-0"}`, children: [
      /* @__PURE__ */ jsx("button", { type: "button", onClick: onClose, "aria-label": "Close lounge", className: "absolute right-4 top-4 z-30 h-9 w-9 rounded-full border border-amber-400/40 text-amber-300 hover:bg-amber-400/10", children: "✕" }),
      /* @__PURE__ */ jsxs("div", { className: "mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 py-10 text-center", children: [
        /* @__PURE__ */ jsx("p", { className: "text-[11px] uppercase tracking-[0.3em] text-amber-400", children: "Sale Lounge" }),
        /* @__PURE__ */ jsx("h2", { className: "mt-3 font-display text-3xl leading-tight sm:text-5xl", children: "Choose your next step." }),
        /* @__PURE__ */ jsx("p", { className: "mx-auto mt-3 max-w-xl text-sm text-stone-400 sm:text-base", children: "Three doors, one floor. Pick the one that fits the move you want to make." }),
        /* @__PURE__ */ jsxs("div", { className: "mt-10 grid w-full gap-5 sm:grid-cols-3", children: [
          /* @__PURE__ */ jsx(LoungeOption, { image: paneAuction, title: "Bid in auction", desc: "Live and timed sales. Place bids, set alerts, follow paddles in real time.", cta: "Enter auctions", to: "/auction" }),
          /* @__PURE__ */ jsx(LoungeOption, { image: paneArtist, title: "Sell & buy", desc: "List your own work or buy direct from verified collectors and artists.", cta: "Open the floor", to: "/lounge" }),
          /* @__PURE__ */ jsx(LoungeOption, { image: paneStage, title: "Stage your wall", desc: "Preview any piece at true scale on your own wall before you commit.", cta: "Open artstage", to: "/studio" })
        ] })
      ] })
    ] })
  ] });
}
function LoungeOption({
  image,
  title,
  desc,
  cta,
  to
}) {
  return /* @__PURE__ */ jsxs(Link, { to, className: "group relative flex flex-col overflow-hidden rounded-xl border border-amber-400/20 bg-white/5 text-left ring-1 ring-transparent transition hover:-translate-y-0.5 hover:ring-amber-400/60", children: [
    /* @__PURE__ */ jsxs("div", { className: "relative h-44 w-full overflow-hidden sm:h-56", children: [
      /* @__PURE__ */ jsx("img", { src: image, alt: title, className: "h-full w-full object-cover transition duration-700 group-hover:scale-105" }),
      /* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-1 flex-col p-5", children: [
      /* @__PURE__ */ jsx("h3", { className: "font-display text-xl text-amber-200", children: title }),
      /* @__PURE__ */ jsx("p", { className: "mt-2 flex-1 text-sm text-stone-300", children: desc }),
      /* @__PURE__ */ jsxs("span", { className: "mt-4 inline-flex items-center gap-1 text-xs font-medium text-amber-300 group-hover:text-amber-200", children: [
        cta,
        " →"
      ] })
    ] })
  ] });
}
function RevealModal({
  active,
  onClose,
  onExplore
}) {
  const trapRef = useFocusTrap(true, onClose);
  return /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center", onClick: onClose, children: /* @__PURE__ */ jsxs("div", { ref: trapRef, role: "dialog", "aria-modal": "true", "aria-labelledby": "reveal-title", tabIndex: -1, className: "w-full max-w-lg overflow-hidden rounded-lg border border-border bg-card shadow-2xl outline-none", onClick: (e) => e.stopPropagation(), children: [
    /* @__PURE__ */ jsx("div", { className: `relative h-40 bg-gradient-to-br ${active.gradient}`, children: /* @__PURE__ */ jsx("img", { src: bustImageUrl(paneImageFor(active), PANE_ASSET_VERSION), alt: active.title, loading: "lazy", decoding: "async", onError: (event) => {
      const image = event.currentTarget;
      if (image.src !== artistDefault) image.src = artistDefault;
    }, className: "absolute inset-0 h-full w-full object-contain" }) }),
    /* @__PURE__ */ jsxs("div", { className: "p-5 sm:p-6", children: [
      /* @__PURE__ */ jsx("p", { className: "text-[10px] uppercase tracking-[0.2em] text-primary sm:text-xs", children: active.kicker }),
      /* @__PURE__ */ jsx("h3", { id: "reveal-title", className: "mt-1 font-display text-xl sm:text-2xl", children: active.title }),
      /* @__PURE__ */ jsx("p", { className: "mt-3 text-sm text-muted-foreground", children: active.summary }),
      /* @__PURE__ */ jsx("p", { className: "mt-3 text-sm", children: active.reveal }),
      /* @__PURE__ */ jsxs("div", { className: "mt-5 flex justify-end gap-2", children: [
        /* @__PURE__ */ jsx("button", { type: "button", onClick: onClose, className: "rounded-md border border-border px-4 py-2 text-sm hover:bg-accent", children: "Close" }),
        /* @__PURE__ */ jsx("button", { type: "button", onClick: onExplore, className: "rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90", children: active.exploreLabel ?? "Explore →" })
      ] })
    ] })
  ] }) });
}
function GatePrompt({
  onClose,
  onSignIn
}) {
  const trapRef = useFocusTrap(true, onClose);
  return /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4", onClick: onClose, children: /* @__PURE__ */ jsxs("div", { ref: trapRef, role: "dialog", "aria-modal": "true", "aria-labelledby": "gate-title", tabIndex: -1, className: "relative w-full max-w-md rounded-xl border border-amber-500/30 bg-zinc-950 p-6 text-zinc-100 shadow-2xl outline-none", onClick: (e) => e.stopPropagation(), children: [
    /* @__PURE__ */ jsx("p", { className: "text-[11px] uppercase tracking-[0.3em] text-amber-400", children: "Members only" }),
    /* @__PURE__ */ jsx("h3", { id: "gate-title", className: "mt-2 font-display text-2xl", children: "The Sale Lounge is private" }),
    /* @__PURE__ */ jsx("p", { className: "mt-3 text-sm text-zinc-300", children: "Sign in to step through the doors. Verified profiles can bid in live auctions and browse personal sales listed by registered art owners." }),
    /* @__PURE__ */ jsxs("div", { className: "mt-6 flex flex-wrap justify-end gap-2", children: [
      /* @__PURE__ */ jsx("button", { className: "rounded-md border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-900", onClick: onClose, children: "Not now" }),
      /* @__PURE__ */ jsx("button", { className: "rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-400", onClick: onSignIn, children: "Sign in to enter →" })
    ] })
  ] }) });
}
function ArtworkCard({
  artwork
}) {
  const price = typeof artwork.price === "number" ? `${artwork.currency ?? "USD"} ${artwork.price.toLocaleString()}` : null;
  const inner = /* @__PURE__ */ jsxs("article", { className: "group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition hover:-translate-y-0.5 hover:shadow-lg", children: [
    /* @__PURE__ */ jsx("div", { className: "relative aspect-[4/5] overflow-hidden bg-muted", children: artwork.image_url ? /* @__PURE__ */ jsx("img", { src: bustImageUrl(artwork.image_url, artwork.updated_at ?? artwork.id), alt: artwork.title, loading: "lazy", className: "absolute inset-0 h-full w-full object-contain transition duration-500" }) : /* @__PURE__ */ jsx("div", { className: "flex h-full w-full items-center justify-center text-xs text-muted-foreground", children: "No image" }) }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-1 flex-col gap-1 p-3", children: [
      /* @__PURE__ */ jsx("p", { className: "line-clamp-1 font-display text-sm leading-tight", children: artwork.title }),
      /* @__PURE__ */ jsxs("p", { className: "line-clamp-1 text-xs text-muted-foreground", children: [
        artwork.artist?.name ?? "Unknown artist",
        artwork.artist?.country ? ` · ${artwork.artist.country}` : ""
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mt-1 flex items-center justify-between text-[10px] uppercase tracking-wide text-muted-foreground", children: [
        /* @__PURE__ */ jsx("span", { children: artwork.medium }),
        price && /* @__PURE__ */ jsx("span", { className: "text-foreground", children: price })
      ] }),
      artwork.short_code && /* @__PURE__ */ jsx("p", { className: "text-[10px] text-muted-foreground", children: artwork.short_code })
    ] })
  ] });
  const isMock = artwork.content_source === "mock" || typeof artwork.id === "string" && artwork.id.startsWith("local-");
  const linkCode = artwork.short_code ?? (!isMock ? artwork.id : null);
  return linkCode ? /* @__PURE__ */ jsx(Link, { to: "/piece/$code", params: {
    code: linkCode
  }, children: inner }) : inner;
}
const CHIPS = [{
  key: "artist",
  label: "Artists"
}, {
  key: "country",
  label: "Country"
}, {
  key: "city",
  label: "City"
}, {
  key: "medium",
  label: "Medium"
}, {
  key: "age",
  label: "Age"
}, {
  key: "price",
  label: "Price"
}];
function chipCount(key, f) {
  switch (key) {
    case "artist":
      return f.artists.length;
    case "country":
      return f.countries.length;
    case "medium":
      return f.mediums.length;
    case "gender":
      return f.genders.length;
    case "city":
      return f.cities.length;
    case "age":
      return f.ageRange ? 1 : 0;
    case "price":
      return f.priceRange ? 1 : 0;
  }
}
function TopBarFilter({
  filters,
  facets,
  onChange,
  onSubmit,
  onReset,
  openChip,
  setOpenChip,
  onOpenChat
}) {
  const hasAny = filters.q || filters.countries.length || filters.mediums.length || filters.genders.length || filters.cities.length || filters.artists.length || filters.ageRange || filters.priceRange;
  const applySmartSearch = () => {
    const tokens = (filters.q || "").toLowerCase().split(/[,\s]+/).map((t) => t.trim()).filter(Boolean);
    if (!tokens.length) {
      onSubmit();
      return;
    }
    const next = {
      ...filters
    };
    const matchInto = (pool, current) => {
      const add = pool.filter((o) => tokens.some((t) => o.toLowerCase().includes(t)));
      return Array.from(/* @__PURE__ */ new Set([...current, ...add]));
    };
    next.countries = matchInto(facets.countries, filters.countries);
    next.mediums = matchInto(facets.mediums, filters.mediums);
    next.cities = matchInto(facets.cities, filters.cities);
    next.genders = matchInto(facets.genders, filters.genders);
    next.artists = matchInto(facets.artists, filters.artists);
    onChange(next);
    onSubmit(next);
  };
  const controlH = "h-9";
  const fixedControlW = "w-full sm:w-[7.5rem]";
  const rectangleClass = `inline-flex ${controlH} ${fixedControlW} flex-none items-center justify-center gap-1.5 rounded-none bg-transparent px-2 text-sm font-semibold text-white ring-1 ring-white/40 transition hover:bg-white/10`;
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-2", children: [
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 items-center gap-2 sm:grid-cols-[minmax(0,1fr)_7.5rem]", children: [
      /* @__PURE__ */ jsxs("div", { className: `flex ${controlH} flex-1 items-center gap-2 rounded-none bg-white/15 px-3 text-white ring-1 ring-white/25 backdrop-blur`, children: [
        /* @__PURE__ */ jsx("span", { className: "text-white/70", "aria-hidden": true, children: "⌕" }),
        /* @__PURE__ */ jsx("input", { value: filters.q, onChange: (e) => onChange({
          ...filters,
          q: e.target.value
        }), onKeyDown: (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onSubmit();
          }
        }, placeholder: "Search artist or piece", "aria-label": "Search artist or piece", className: "min-w-0 flex-1 bg-transparent text-[15px] font-normal text-white/65 outline-none placeholder:text-white/50" }),
        filters.q && /* @__PURE__ */ jsx("button", { type: "button", "aria-label": "Clear search", onClick: () => onChange({
          ...filters,
          q: ""
        }), className: "text-xs text-white/80 hover:text-white", children: "✕" })
      ] }),
      /* @__PURE__ */ jsxs("button", { type: "button", onClick: onOpenChat, "aria-label": "Ask the AI concierge", className: rectangleClass, children: [
        /* @__PURE__ */ jsx("span", { "aria-hidden": true, children: "✦" }),
        /* @__PURE__ */ jsx("span", { children: "AI concierge" })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1fr)_7.5rem] sm:items-center", children: [
      /* @__PURE__ */ jsxs("div", { className: "contents sm:grid sm:grid-cols-7 sm:gap-2", children: [
        /* @__PURE__ */ jsxs("button", { type: "button", onClick: applySmartSearch, className: `inline-flex ${controlH} w-full flex-none items-center justify-center gap-1 rounded-none bg-white/30 px-2 text-sm font-semibold text-white ring-1 ring-white/40 transition hover:bg-white/40`, "aria-label": "Run smart search using the search box above", title: "Smart search uses the text from the search box above", children: [
          /* @__PURE__ */ jsx("span", { "aria-hidden": true, children: "⌕" }),
          /* @__PURE__ */ jsx("span", { className: "truncate", children: "Search by…" })
        ] }),
        CHIPS.map(({
          key,
          label
        }) => {
          const count = chipCount(key, filters);
          const total = key === "country" ? facets.countries.length : key === "medium" ? facets.mediums.length : key === "city" ? facets.cities.length : key === "artist" ? facets.artists.length : 0;
          const allSelected = total > 0 && count === total;
          const active = count > 0;
          const isOpen = openChip === key;
          return /* @__PURE__ */ jsxs("button", { type: "button", onClick: () => setOpenChip(isOpen ? null : key), className: `inline-flex ${controlH} w-full flex-none items-center justify-center gap-1 rounded-none px-2 text-sm ring-1 transition ${isOpen ? "bg-white text-purple-700 ring-white" : active ? "bg-white/25 text-white ring-white/40" : "bg-white/10 text-white ring-white/20 hover:bg-white/20"}`, children: [
            /* @__PURE__ */ jsx("span", { className: "truncate", children: label }),
            count > 0 && /* @__PURE__ */ jsx("span", { className: "rounded-none bg-purple-700 px-1 text-[10px] font-semibold text-white", children: allSelected ? "All" : count }),
            /* @__PURE__ */ jsx("span", { className: "text-[10px] opacity-80", "aria-hidden": true, children: isOpen ? "▴" : "▾" })
          ] }, key);
        })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: `flex ${controlH} items-center gap-2`, children: [
        /* @__PURE__ */ jsx("button", { type: "button", onClick: onReset, className: `inline-flex ${controlH} flex-1 items-center justify-center rounded-none bg-transparent px-2 text-sm font-semibold text-white ring-1 ring-white/40 transition hover:bg-white/10 ${hasAny ? "" : "opacity-55"}`, "aria-label": "Reset filters", children: "Reset" }),
        /* @__PURE__ */ jsx("button", { type: "button", onClick: () => onSubmit(), className: `inline-flex ${controlH} w-9 flex-none items-center justify-center rounded-full bg-transparent text-white ring-1 ring-white/40 transition hover:bg-white/10`, "aria-label": "Apply filters and search", title: "Apply filters and search", children: /* @__PURE__ */ jsx("span", { "aria-hidden": true, className: "text-base leading-none", children: "→" }) })
      ] })
    ] })
  ] });
}
function FilterSubBar({
  filters,
  facets,
  onChange,
  onSubmit,
  openChip,
  onClose,
  currency,
  setCurrency,
  usdToNgn
}) {
  if (!openChip) return null;
  const renderMulti = (options, selected, set, layout = "wrap") => {
    const allOptions = ["ALL", ...options];
    const toggleWithAll = (list, v) => {
      if (v === "ALL") return [];
      let next = list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
      if (next.includes("ALL")) next = next.filter((x) => x !== "ALL");
      return next;
    };
    const isColumns = layout === "columns";
    return /* @__PURE__ */ jsxs("div", { className: isColumns ? "w-full" : "flex flex-wrap items-center gap-1.5", children: [
      allOptions.length === 1 && /* @__PURE__ */ jsx("span", { className: "text-xs text-muted-foreground", children: "No options available" }),
      /* @__PURE__ */ jsx("div", { className: isColumns ? "grid grid-cols-2 gap-x-8 gap-y-1.5 sm:grid-cols-3 md:grid-cols-4" : "contents", children: allOptions.map((opt) => {
        const checked = opt === "ALL" ? selected.length === 0 : selected.includes(opt);
        return /* @__PURE__ */ jsxs("button", { type: "button", onClick: () => set(toggleWithAll(selected, opt)), className: isColumns ? `flex w-full items-center gap-2 rounded-md border px-2.5 py-1 text-left text-xs transition ${checked ? "border-primary bg-primary text-primary-foreground" : "border-transparent bg-transparent text-foreground hover:bg-muted"}` : `inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition ${checked ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:border-foreground/30"}`, children: [
          /* @__PURE__ */ jsx(Checkbox, { checked, className: "h-3 w-3 pointer-events-none" }),
          /* @__PURE__ */ jsx("span", { className: "truncate", children: opt })
        ] }, opt);
      }) }),
      selected.length > 0 && /* @__PURE__ */ jsx("button", { type: "button", onClick: () => set([]), className: `text-[11px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline ${isColumns ? "mt-3 block" : "ml-2"}`, children: "Clear" })
    ] });
  };
  const renderRange = (bounds, value, step, format, set, ticks) => {
    const current = value ?? bounds;
    const gridStyle = {
      display: "grid",
      gridTemplateColumns: "minmax(3.5rem, max-content) minmax(0, 1fr) minmax(3.5rem, max-content)",
      columnGap: "0.75rem",
      alignItems: "center",
      width: "100%"
    };
    return /* @__PURE__ */ jsxs("div", { className: "flex w-full flex-col gap-2", children: [
      /* @__PURE__ */ jsxs("div", { style: gridStyle, children: [
        /* @__PURE__ */ jsx("span", { className: "text-right text-sm font-bold tabular-nums text-foreground", children: format(current[0]) }),
        /* @__PURE__ */ jsx(Slider, { min: bounds[0], max: bounds[1], step, value: current, onValueChange: (v) => set([v[0], v[1]]), className: "w-full" }),
        /* @__PURE__ */ jsx("span", { className: "text-left text-sm font-bold tabular-nums text-foreground", children: format(current[1]) })
      ] }),
      ticks && ticks.length > 0 && /* @__PURE__ */ jsxs("div", { style: gridStyle, children: [
        /* @__PURE__ */ jsx("span", { "aria-hidden": true }),
        /* @__PURE__ */ jsx("div", { className: "relative h-6 w-full select-none", children: ticks.map((t) => {
          const pct = (t - bounds[0]) / (bounds[1] - bounds[0]) * 100;
          const clampedPct = Math.max(0, Math.min(100, pct));
          const translate = clampedPct <= 0 ? "translateX(0)" : clampedPct >= 100 ? "translateX(-100%)" : "translateX(-50%)";
          return /* @__PURE__ */ jsxs("button", { type: "button", onClick: () => {
            const distLow = Math.abs(t - current[0]);
            const distHigh = Math.abs(t - current[1]);
            if (distLow <= distHigh) {
              set([Math.min(t, current[1]), current[1]]);
            } else {
              set([current[0], Math.max(t, current[0])]);
            }
          }, className: "absolute top-0 flex flex-col items-center gap-1 text-[10px] font-semibold tabular-nums text-muted-foreground hover:text-foreground", style: {
            left: `${clampedPct}%`,
            transform: translate
          }, "aria-label": `Snap nearest handle to ${t}`, children: [
            /* @__PURE__ */ jsx("span", { className: "h-1.5 w-px bg-border" }),
            /* @__PURE__ */ jsx("span", { children: t })
          ] }, t);
        }) }),
        /* @__PURE__ */ jsx("span", { "aria-hidden": true })
      ] }),
      value !== null && /* @__PURE__ */ jsx("div", { className: "flex w-full justify-end", children: /* @__PURE__ */ jsx("button", { type: "button", onClick: () => set(null), className: "text-[11px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline", children: "Clear" }) })
    ] });
  };
  let content = null;
  switch (openChip) {
    case "artist":
      content = /* @__PURE__ */ jsxs("div", { className: "flex w-full flex-col gap-4", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("div", { className: "mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground", children: "Gender" }),
          renderMulti(facets.genders, filters.genders, (v) => onChange({
            ...filters,
            genders: v
          }))
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("div", { className: "mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground", children: "Artists" }),
          renderMulti(facets.artists, filters.artists, (v) => onChange({
            ...filters,
            artists: v
          }), "columns")
        ] })
      ] });
      break;
    case "country":
      content = renderMulti(facets.countries, filters.countries, (v) => onChange({
        ...filters,
        countries: v
      }), "columns");
      break;
    case "medium":
      content = renderMulti(facets.mediums, filters.mediums, (v) => onChange({
        ...filters,
        mediums: v
      }));
      break;
    case "gender":
      content = renderMulti(facets.genders, filters.genders, (v) => onChange({
        ...filters,
        genders: v
      }));
      break;
    case "city":
      content = renderMulti(facets.cities, filters.cities, (v) => onChange({
        ...filters,
        cities: v
      }));
      break;
    case "age":
      content = renderRange(facets.ageBounds, filters.ageRange, 1, (n) => {
        const year = (/* @__PURE__ */ new Date()).getFullYear() - n;
        if (n === 0) return `<1 yr · ${year}`;
        if (n === 1) return `1 yr · ${year}`;
        return `${n} yrs · ${year}`;
      }, (v) => onChange({
        ...filters,
        ageRange: v
      }), [0, 25, 50, 75, 100, 125, 150, 175, 200]);
      break;
    case "price":
      content = /* @__PURE__ */ jsx(PriceRange, { bounds: facets.priceBounds, value: filters.priceRange, currency, setCurrency, usdToNgn, onChange: (v) => onChange({
        ...filters,
        priceRange: v
      }) });
      break;
  }
  const label = CHIPS.find((c) => c.key === openChip)?.label ?? "";
  return /* @__PURE__ */ jsx("div", { className: "border-b border-border bg-muted", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto flex max-w-6xl flex-wrap items-start gap-3 px-4 py-3 sm:flex-nowrap sm:gap-4 sm:px-6", children: [
    /* @__PURE__ */ jsxs("div", { className: "mt-1 flex flex-col", children: [
      /* @__PURE__ */ jsx("span", { className: "text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground", children: label }),
      openChip !== "age" && openChip !== "price" && /* @__PURE__ */ jsx("span", { className: "mt-0.5 text-[10px] text-muted-foreground/80", children: "Tip: select multiple" })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "order-3 w-full min-w-0 sm:order-none sm:w-auto sm:flex-1", children: content }),
    /* @__PURE__ */ jsxs("div", { className: "ml-auto flex items-center gap-2 sm:ml-0", children: [
      /* @__PURE__ */ jsx("button", { type: "button", onClick: () => onSubmit(), className: "inline-flex h-8 items-center rounded-none bg-purple-700 px-3 text-xs font-semibold text-white transition hover:bg-purple-800", children: "Apply & Search" }),
      /* @__PURE__ */ jsx("button", { type: "button", onClick: onClose, "aria-label": "Close filter", className: "text-muted-foreground hover:text-foreground", children: "✕" })
    ] })
  ] }) });
}
function PriceRange({
  bounds,
  value,
  currency,
  setCurrency,
  usdToNgn,
  onChange
}) {
  const currentUsd = value ?? bounds;
  const isMaxOpen = currentUsd[1] >= bounds[1];
  const toDisplay = (usd) => currency === "NGN" ? usd * usdToNgn : usd;
  const toUsd = (display) => currency === "NGN" ? display / usdToNgn : display;
  const symbol = currency === "NGN" ? "₦" : "$";
  const fmt = (usd, isHighOpen = false) => {
    if (isHighOpen) return `${symbol}${Math.round(toDisplay(bounds[1])).toLocaleString()}+`;
    const n = toDisplay(usd);
    return `${symbol}${Math.round(n).toLocaleString()}`;
  };
  const sliderMax = Math.round(toDisplay(bounds[1]));
  const sliderStep = currency === "NGN" ? Math.max(1e3, Math.round(usdToNgn * 50)) : 50;
  const sliderValue = [Math.round(toDisplay(currentUsd[0])), Math.round(toDisplay(currentUsd[1]))];
  return /* @__PURE__ */ jsxs("div", { className: "flex w-full flex-col gap-3", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [
      /* @__PURE__ */ jsx("div", { className: "inline-flex items-center rounded-full border border-border bg-card p-0.5 text-xs", children: ["USD", "NGN"].map((c) => /* @__PURE__ */ jsx("button", { type: "button", onClick: () => setCurrency(c), className: `rounded-full px-3 py-1 transition ${currency === c ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`, children: c }, c)) }),
      /* @__PURE__ */ jsxs("span", { className: "text-[11px] text-muted-foreground", children: [
        "Live rate: $1 ≈ ₦",
        Math.round(usdToNgn).toLocaleString()
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex w-full items-center gap-6", children: [
      /* @__PURE__ */ jsx("span", { className: "w-28 shrink-0 text-right text-sm font-bold tabular-nums text-foreground", children: fmt(currentUsd[0]) }),
      /* @__PURE__ */ jsx(Slider, { min: 0, max: sliderMax, step: sliderStep, value: sliderValue, onValueChange: (v) => {
        const lo = toUsd(v[0]);
        const hi = toUsd(v[1]);
        onChange([Math.max(0, Math.round(lo)), Math.min(bounds[1], Math.round(hi))]);
      }, className: "flex-1" }),
      /* @__PURE__ */ jsx("span", { className: "w-28 shrink-0 text-left text-sm font-bold tabular-nums text-foreground", children: fmt(currentUsd[1], isMaxOpen) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between text-[11px] text-muted-foreground", children: [
      /* @__PURE__ */ jsx("span", { children: "Low" }),
      /* @__PURE__ */ jsx("span", { children: isMaxOpen ? "High (open-ended)" : "High" })
    ] }),
    value !== null && /* @__PURE__ */ jsx("button", { type: "button", onClick: () => onChange(null), className: "self-start text-[11px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline", children: "Clear price filter" })
  ] });
}
export {
  Landing as component
};
