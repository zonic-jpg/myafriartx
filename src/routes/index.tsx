import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { recordPaneView, getLandingPanes } from "@/lib/pane-views.functions";
import { recordEntryClick } from "@/lib/entry-clicks.functions";
import { getCataloguePieces, getCatalogueArtists } from "@/lib/catalogue.functions";
import { useSessionId } from "@/hooks/use-session-id";

import { useFocusTrap } from "@/hooks/use-focus-trap";
import {
  EMPTY_FILTERS,
  type CatalogueFilters,
  type FacetOptions,
} from "@/components/catalogue-filter";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  artistDefault,
  localImageForKey,
  localPaneAssets,
  publicPaneAssets,
  paneArtist,
  paneAuction,
  paneEvent,
  paneLounge,
  panePiece,
  paneStage,
} from "@/lib/local-image-assets";
import { bustImageUrl, isUsableImageUrl } from "@/lib/cache-bust";
import { LOCAL_MOCK_ARTWORKS } from "@/lib/mock-catalogue";
import logo from "@/assets/myafriart-logo.png";
import { AiChatPanel, type SponsoredItem } from "@/components/ai-chat-panel";

function paneImageFor(pane: Pick<Pane, "id" | "image">) {
  if (isUsableImageUrl(pane.image)) return pane.image;
  return MOCK_PANE_ASSETS[pane.id]?.image || localImageForKey(pane.id) || artistDefault;
}

const csv = z.union([z.string(), z.array(z.string())]).transform((v) => {
  const values = Array.isArray(v)
    ? v
    : v.trim().startsWith("[")
      ? JSON.parse(v)
      : v
        ? v.split(",").filter(Boolean)
        : [];
  return (Array.isArray(values) ? values : []).map((s) => s.trim()).filter((s) => s && s !== "[]");
});

const numRange = z
  .union([z.string(), z.array(z.union([z.string(), z.number()])), z.null()])
  .transform((v): [number, number] | null => {
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
  countries: fallback(csv, [] as string[]).default([]),
  mediums: fallback(csv, [] as string[]).default([]),
  genders: fallback(csv, [] as string[]).default([]),
  cities: fallback(csv, [] as string[]).default([]),
  artists: fallback(csv, [] as string[]).default([]),
  age: fallback(numRange, null).default(null),
  price: fallback(numRange, null).default(null),
});

export const Route = createFileRoute("/")({
  validateSearch: zodValidator(landingSearchSchema),
  head: () => ({
    meta: [
      { title: "MyAfriArtX — Discover, Buy, Bid & Stage African Art" },
      {
        name: "description",
        content:
          "Discover African art. Buy and sell from leading artists, bid in live art auctions, and stage any piece virtually on your wall before you commit.",
      },
    ],
  }),
  component: Landing,
});

type Pane = {
  id: string;
  kicker: string;
  title: string;
  summary: string; // ~3 lines
  reveal: string;
  gradient: string;
  image: string;
  to: string;
  scope?: "artists" | "artworks";
  loungeTab?: "sell" | "buy" | "threads";
  exploreLabel?: string;
  special?: "lounge";
};

// Local mock assets keyed by pane_id. Admin CMS image_url wins when usable;
// otherwise bundled /media defaults keep the public site from showing broken heroes.
type PaneVisual = Pick<
  Pane,
  "gradient" | "image" | "to" | "scope" | "loungeTab" | "exploreLabel"
> & { special?: "lounge" };

const MOCK_PANE_ASSETS: Record<string, PaneVisual> = {
  artist: {
    gradient: "from-amber-500 via-orange-600 to-rose-700",
    image: localPaneAssets.artist,
    to: "/",
    scope: "artists",
    exploreLabel: "View artists →",
  },
  event: {
    gradient: "from-emerald-500 via-teal-600 to-sky-800",
    image: localPaneAssets.event,
    to: "/lounge",
    loungeTab: "sell",
    exploreLabel: "Open event floor →",
  },
  piece: {
    gradient: "from-yellow-400 via-amber-600 to-stone-800",
    image: localPaneAssets.piece,
    to: "/",
    scope: "artworks",
    exploreLabel: "View artworks →",
  },
  stage: {
    gradient: "from-indigo-600 via-violet-700 to-fuchsia-800",
    image: localPaneAssets.stage,
    to: "/studio",
    exploreLabel: "Open artstage →",
  },
  auction: {
    gradient: "from-rose-600 via-red-700 to-neutral-900",
    image: localPaneAssets.auction,
    to: "/auction",
    exploreLabel: "Enter auctions →",
  },
  lounge: {
    gradient: "from-stone-800 via-zinc-900 to-black",
    image: localPaneAssets.lounge,
    to: "/lounge",
    loungeTab: "sell",
    exploreLabel: "Enter the lounge →",
    special: "lounge",
  },
};

const PANE_ASSET_VERSION = "pane-assets-v1";
const FALLBACK_GRADIENT = "from-stone-700 via-zinc-800 to-black";

const FALLBACK_PANES: Pane[] = [
  {
    id: "artist",
    kicker: "Artist of the week",
    title: "Adaeze Okonkwo",
    summary:
      "Lagos-based painter blending Nsibidi script with bold oil abstractions. Her new series channels market noise into colour. Featured this week across the Studio.",
    reveal:
      "Discover Adaeze's process, studio notes, and the works shaping the marketplace this week.",
    ...MOCK_PANE_ASSETS.artist,
  },
  {
    id: "event",
    kicker: "Event of the week",
    title: "Sauti Sessions · Nairobi",
    summary:
      "A two-night live-painting and jazz residency at the Karen Pavilion. Twelve artists, six musicians, one canvas built in real time. Doors at 18:00.",
    reveal: "Find the events where contemporary African art, performance, and conversation meet.",
    ...MOCK_PANE_ASSETS.event,
  },
  {
    id: "piece",
    kicker: "Art piece of the week",
    title: "Harmattan, II",
    summary:
      "Pastel on raw linen, 120 × 90 cm. A study of dry-season light over the Sahel. One of three in the series, the only one offered publicly.",
    reveal: "Reveal the details, story, and buying path for this standout piece on MyAfriart.",
    ...MOCK_PANE_ASSETS.piece,
  },
  {
    id: "stage",
    kicker: "Stage your space",
    title: "with artstage",
    summary:
      "Point your camera at a wall and drop any piece in at true scale. Walk around it, change the light, send the render to a friend before you commit.",
    reveal: "Stage artwork at realistic scale and compare how different works transform your room.",
    ...MOCK_PANE_ASSETS.stage,
  },
  {
    id: "auction",
    kicker: "Live auction",
    title: "Friday Evening Sale",
    summary:
      "Forty-two lots from across the continent, opening at 19:00 WAT. Bid live from anywhere, with absentee bids accepted up to one hour before.",
    reveal:
      "View auction highlights, bidding windows, and works drawing attention from collectors.",
    ...MOCK_PANE_ASSETS.auction,
  },
  {
    id: "lounge",
    kicker: "Members only",
    title: "Sale Lounge",
    summary:
      "A private floor for verified buyers and sellers. Step inside for live auctions and personal sales listed by registered art owners.",
    reveal:
      "Step through the doors to access private sales, auction activity, and collector tools.",
    ...MOCK_PANE_ASSETS.lounge,
  },
];

type ArtworkRow = {
  id: string;
  short_code?: string | null;
  lifecycle_status?: string | null;
  title: string;
  medium: string;
  image_url: string;
  updated_at?: string | null;
  content_source?: "live" | "mock" | null;
  price: number | null;
  currency: string | null;
  year: string | null;
  artist: {
    id: string;
    short_code?: string | null;
    name: string;
    country: string | null;
    gender: string | null;
    domicile_city: string | null;
    date_of_birth: string | null;
  } | null;
};

type CatalogueArtist = {
  id: string;
  short_code: string;
  name: string;
  country: string | null;
  gender: string | null;
  domicile_city: string | null;
  date_of_birth: string | null;
  portrait_url: string | null;
};

function ageFromDob(dob: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
}

const AFRICAN_COUNTRIES = [
  "Algeria",
  "Angola",
  "Benin",
  "Botswana",
  "Burkina Faso",
  "Burundi",
  "Cabo Verde",
  "Cameroon",
  "Central African Republic",
  "Chad",
  "Comoros",
  "Democratic Republic of the Congo",
  "Republic of the Congo",
  "Côte d'Ivoire",
  "Djibouti",
  "Egypt",
  "Equatorial Guinea",
  "Eritrea",
  "Eswatini",
  "Ethiopia",
  "Gabon",
  "Gambia",
  "Ghana",
  "Guinea",
  "Guinea-Bissau",
  "Kenya",
  "Lesotho",
  "Liberia",
  "Libya",
  "Madagascar",
  "Malawi",
  "Mali",
  "Mauritania",
  "Mauritius",
  "Morocco",
  "Mozambique",
  "Namibia",
  "Niger",
  "Nigeria",
  "Rwanda",
  "São Tomé and Príncipe",
  "Senegal",
  "Seychelles",
  "Sierra Leone",
  "Somalia",
  "South Africa",
  "South Sudan",
  "Sudan",
  "Tanzania",
  "Togo",
  "Tunisia",
  "Uganda",
  "Zambia",
  "Zimbabwe",
];

const ALL_GENDERS = ["Male", "Female"];

// Fallback rate if API fails (approx mid-2025); replaced by live rate on mount.
const FALLBACK_USD_TO_NGN = 1600;

// Open-ended ceiling for the price slider (in USD). Raised to accommodate
// high-value works (e.g. major Sokari Douglas Camp / El Anatsui pieces).
// TODO: make admin-configurable via app_settings.price_ceiling_usd.
const PRICE_CEILING_USD = 1_000_000;

// Age range is now driven entirely by the URL (?age=...) — no localStorage
// persistence, which previously caused confusing overrides when sharing links.

function Landing() {
  const navigate = useNavigate({ from: "/" });
  const search = Route.useSearch();
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const catalogueRef = useRef<HTMLElement | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [loungeOpen, setLoungeOpen] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [gatePromptOpen, setGatePromptOpen] = useState(false);
  const [panes, setPanes] = useState<Pane[]>(FALLBACK_PANES);
  const [artworks, setArtworks] = useState<ArtworkRow[]>(LOCAL_MOCK_ARTWORKS);
  const [catalogueArtists, setCatalogueArtists] = useState<CatalogueArtist[]>([]);
  const [loadingCatalogue, setLoadingCatalogue] = useState(false);
  const [openChip, setOpenChip] = useState<ChipKey | null>(null);
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [currency, setCurrency] = useState<"USD" | "NGN">("USD");
  const [usdToNgn, setUsdToNgn] = useState<number>(FALLBACK_USD_TO_NGN);
  const [contentSource, setContentSource] = useState<"live" | "mock">("mock");
  const [paneRetryNonce, setPaneRetryNonce] = useState(0);
  const [paneFailedCount, setPaneFailedCount] = useState(0);
  const registerPaneFailure = useCallback((failed: boolean) => {
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
        const { panes: dbPanes } = await fetchLandingPanes();
        if (cancelled || !dbPanes || dbPanes.length === 0) return;
        const merged: Pane[] = dbPanes.map((p) => {
          const visual = MOCK_PANE_ASSETS[p.pane_id] ?? {
            gradient: FALLBACK_GRADIENT,
            image: localImageForKey(p.pane_id) || artistDefault,
            to: "/studio",
          };
          const adminImage =
            (typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches
              ? p.image_url_mobile || p.image_url
              : p.image_url) || p.image_url;
          return {
            id: p.pane_id,
            kicker: p.kicker,
            title: p.title,
            summary: p.summary,
            reveal: p.reveal,
            gradient: visual.gradient,
            image: isUsableImageUrl(adminImage) ? adminImage : visual.image,
            to: visual.to,
            ...(visual.scope ? { scope: visual.scope } : {}),
            ...(visual.loungeTab ? { loungeTab: visual.loungeTab } : {}),
            ...(visual.exploreLabel ? { exploreLabel: visual.exploreLabel } : {}),
            ...(visual.special ? { special: visual.special } : {}),
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
    fetch("https://open.er-api.com/v6/latest/USD")
      .then((r) => r.json())
      .then((j) => {
        const rate = j?.rates?.NGN;
        if (!cancelled && typeof rate === "number" && rate > 0) setUsdToNgn(rate);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setAuthed(!!s);
      setUserId(s?.user?.id ?? null);
    });
    supabase.auth.getSession().then(({ data }) => {
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
        const [pieces, artists] = await Promise.all([
          fetchCataloguePieces(),
          fetchCatalogueArtists(),
        ]);
        if (cancelled) return;
        const rows = (pieces?.pieces ?? []) as unknown as ArtworkRow[];
        const localRows = rows.length
          ? rows.map((row: ArtworkRow, index: number) => ({
              ...row,
              image_url: isUsableImageUrl(row.image_url)
                ? row.image_url
                : localImageForKey(row.id || row.title, index),
            }))
          : LOCAL_MOCK_ARTWORKS;
        setArtworks(localRows);
        setCatalogueArtists((artists?.artists ?? []) as CatalogueArtist[]);
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

  // Age range is URL-driven only; no localStorage persistence.

  const filters: CatalogueFilters = useMemo(
    () => ({
      q: search.q,
      countries: search.countries,
      mediums: search.mediums,
      genders: search.genders,
      cities: search.cities,
      artists: search.artists,
      ageRange: search.age,
      priceRange: search.price,
    }),
    [search],
  );

  const scope = search.scope;

  const scrollToCatalogue = useCallback(() => {
    // Wait for the next paint so the URL change has updated the visible list.
    requestAnimationFrame(() => {
      catalogueRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  useEffect(() => {
    // "catalogue" is the schema default for every plain visit to "/", so it
    // must NOT auto-scroll — that would dump fresh visitors past the hero
    // (worst on phones). Interaction paths call scrollToCatalogue() directly;
    // this effect only serves artists/artworks deep links from pane URLs.
    if (search.focus === "artists" || search.focus === "artworks") {
      scrollToCatalogue();
    }
  }, [search.focus, search.scope, scrollToCatalogue]);

  const updateFilters = (next: CatalogueFilters) => {
    navigate({
      search: {
        q: next.q || "",
        scope: scope === "all" ? undefined : scope,
        focus: "catalogue",
        countries: next.countries.length ? next.countries : undefined,
        mediums: next.mediums.length ? next.mediums : undefined,
        genders: next.genders.length ? next.genders : undefined,
        cities: next.cities.length ? next.cities : undefined,
        artists: next.artists.length ? next.artists : undefined,
        age: next.ageRange ? `${next.ageRange[0]},${next.ageRange[1]}` : undefined,
        price: next.priceRange ? `${next.priceRange[0]},${next.priceRange[1]}` : undefined,
      } as never,
      replace: true,
    });
    scrollToCatalogue();
  };

  // Draft filters: user edits these in the filter bar; nothing in the
  // catalogue display updates until they hit Apply. Scrolling panes above
  // are unaffected (they don't read filters at all).
  const [draftFilters, setDraftFilters] = useState<CatalogueFilters>(filters);
  useEffect(() => {
    setDraftFilters(filters);
  }, [filters]);

  const submitDraftFilters = (nextFilters?: CatalogueFilters) => {
    // Guard: only accept a real filters object. If called with anything else
    // (e.g. a click event passed by onClick={submitDraftFilters}), fall back to draft.
    const next =
      nextFilters && Array.isArray((nextFilters as CatalogueFilters).countries)
        ? nextFilters
        : draftFilters;
    updateFilters(next);
    setOpenChip(null);
  };

  const resetDraftFilters = () => {
    setDraftFilters(EMPTY_FILTERS);
    updateFilters(EMPTY_FILTERS);
    setOpenChip(null);
  };

  void ((next: "all" | "artists" | "artworks") => {
    navigate({
      search: (prev: Record<string, unknown>) =>
        ({
          ...prev,
          scope: next === "all" ? undefined : next,
          focus: next === "all" ? "catalogue" : next,
        }) as never,
      replace: true,
    });
    scrollToCatalogue();
  });

  const openPaneDestination = (pane: Pane) => {
    if (pane.special === "lounge") {
      requestLounge();
      return;
    }
    if (pane.to === "/" && pane.scope) {
      setOpenId(null);
      navigate({
        search: (prev: Record<string, unknown>) =>
          ({ ...prev, scope: pane.scope, focus: pane.scope }) as never,
        replace: true,
      });
      scrollToCatalogue();
      return;
    }
    setOpenId(null);
    navigate({
      to: pane.to as never,
      ...(pane.to === "/lounge" && pane.loungeTab
        ? { search: { tab: pane.loungeTab } as never }
        : {}),
    });
  };

  const facets: FacetOptions = useMemo(() => {
    const set = (vals: (string | null | undefined)[]) =>
      Array.from(new Set(vals.filter((v): v is string => !!v && v.trim().length > 0))).sort();
    const currentYear = new Date().getFullYear();
    const ages = artworks
      .map((a) => {
        const y = a.year ? parseInt(String(a.year).trim().slice(0, 4), 10) : NaN;
        return Number.isFinite(y) ? Math.max(0, currentYear - y) : null;
      })
      .filter((n): n is number => n !== null);
    const prices = artworks
      .map((a) => (typeof a.price === "number" ? a.price : null))
      .filter((n): n is number => n !== null);
    const mergedCountries = Array.from(
      new Set([...AFRICAN_COUNTRIES, ...set(artworks.map((a) => a.artist?.country))]),
    ).sort();
    const mergedGenders = Array.from(
      new Set([...ALL_GENDERS, ...set(artworks.map((a) => a.artist?.gender))]),
    );
    const mergedArtists = Array.from(
      new Set([
        ...set(artworks.map((a) => a.artist?.name)),
        ...catalogueArtists.map((ca) => ca.name).filter((n): n is string => !!n),
      ]),
    ).sort();
    return {
      countries: mergedCountries,
      mediums: set(artworks.map((a) => a.medium)),
      genders: mergedGenders,
      cities: set(artworks.map((a) => a.artist?.domicile_city)),
      artists: mergedArtists,
      ageBounds: [0, Math.max(200, ages.length ? Math.max(...ages) : 0)] as [number, number],
      priceBounds: [0, PRICE_CEILING_USD],
    };
  }, [artworks, catalogueArtists]);

  const filteredArtworks = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    const clean = (v: string | null | undefined) => (v ?? "").trim().toLowerCase();
    const selectedMatches = (selected: string[], value: string | null | undefined) =>
      selected.length === 0 || selected.some((s) => clean(s) === clean(value));
    const artistMatches = (artist: ArtworkRow["artist"]) => {
      if (!selectedMatches(filters.countries, artist?.country)) return false;
      if (!selectedMatches(filters.genders, artist?.gender)) return false;
      if (!selectedMatches(filters.cities, artist?.domicile_city)) return false;
      if (!selectedMatches(filters.artists, artist?.name)) return false;
      return true;
    };
    const artworkMatches = (a: ArtworkRow) => {
      if (!selectedMatches(filters.mediums, a.medium)) return false;
      if (filters.ageRange) {
        const y = a.year ? parseInt(String(a.year).trim().slice(0, 4), 10) : NaN;
        if (!Number.isFinite(y)) return false;
        const age = Math.max(0, new Date().getFullYear() - y);
        if (age < filters.ageRange[0] || age > filters.ageRange[1]) return false;
      }
      if (filters.priceRange) {
        if (a.price === null || a.price < filters.priceRange[0] || a.price > filters.priceRange[1])
          return false;
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

  // Artists lane: unique artists whose own attributes match artist-level
  // filters AND who have at least one artwork passing the artwork-level
  // filters (so e.g. Medium=Painting still narrows the artist list to
  // artists who have paintings). Counts shown reflect matching pieces.
  type ArtistEntry = {
    artist: NonNullable<ArtworkRow["artist"]>;
    pieceCount: number;
    sample: ArtworkRow | null;
    portraitUrl?: string | null;
  };
  const filteredArtists = useMemo<ArtistEntry[]>(() => {
    const q = filters.q.trim().toLowerCase();
    const clean = (v: string | null | undefined) => (v ?? "").trim().toLowerCase();
    const selectedMatches = (selected: string[], value: string | null | undefined) =>
      selected.length === 0 || selected.some((s) => clean(s) === clean(value));
    const artistMatches = (artist: {
      name?: string | null;
      country?: string | null;
      gender?: string | null;
      domicile_city?: string | null;
    }) => {
      if (!selectedMatches(filters.countries, artist?.country)) return false;
      if (!selectedMatches(filters.genders, artist?.gender)) return false;
      if (!selectedMatches(filters.cities, artist?.domicile_city)) return false;
      if (!selectedMatches(filters.artists, artist?.name)) return false;
      return true;
    };
    const artworkMatches = (a: ArtworkRow) => {
      if (!selectedMatches(filters.mediums, a.medium)) return false;
      if (filters.ageRange) {
        const y = a.year ? parseInt(String(a.year).trim().slice(0, 4), 10) : NaN;
        if (!Number.isFinite(y)) return false;
        const age = Math.max(0, new Date().getFullYear() - y);
        if (age < filters.ageRange[0] || age > filters.ageRange[1]) return false;
      }
      if (filters.priceRange) {
        if (a.price === null || a.price < filters.priceRange[0] || a.price > filters.priceRange[1])
          return false;
      }
      return true;
    };
    const map = new Map<string, ArtistEntry>();
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
        map.set(a.artist.id, { artist: a.artist, pieceCount: 1, sample: a });
      }
    }
    const artworkFiltersActive =
      filters.mediums.length > 0 || filters.priceRange !== null || filters.ageRange !== null;
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
            date_of_birth: ca.date_of_birth,
          },
          pieceCount: 0,
          sample: null,
          portraitUrl: ca.portrait_url,
        });
      }
    }
    return Array.from(map.values()).sort((x, y) => x.artist.name.localeCompare(y.artist.name));
  }, [artworks, catalogueArtists, filters, scope]);

  const requestLounge = () => {
    if (authed) setLoungeOpen(true);
    else setGatePromptOpen(true);
  };

  const trackClick = async (entryPoint: "sell_your_work" | "stage_virtually", location: string) => {
    if (!sessionId) return;
    try {
      await recordClick({
        data: { entry_point: entryPoint, location, session_id: sessionId, user_id: userId },
      });
    } catch {
      // silently ignore analytics errors
    }
  };

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.min(el.clientWidth * 0.8, 520), behavior: "smooth" });
  };

  const active = panes.find((p) => p.id === openId) ?? null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-50">
        {/* Row 1 — brand on white */}
        <div className="bg-white border-b border-black/10">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 sm:px-6 sm:py-3">
            <Link to="/" className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white ring-2 ring-black sm:h-10 sm:w-10">
                <img
                  src={logo}
                  alt="MyAfriart logo"
                  className="h-7 w-7 sm:h-8 sm:w-8 object-contain"
                />
              </span>
              <span
                className="font-display text-xl tracking-tight sm:text-2xl bg-clip-text text-transparent"
                style={{
                  backgroundImage: "linear-gradient(90deg,#7e22ce 0%,#dc2626 55%,#f97316 100%)",
                }}
              >
                MyAfriArtX
              </span>
            </Link>
            <nav className="flex flex-shrink-0 items-center gap-2 text-sm sm:gap-3">
              <Link to="/login" className="px-1 text-black/70 hover:text-black">
                Sign in
              </Link>
            </nav>
          </div>
        </div>

        {/* Row 2 — search & filters (single panel, flush) */}
        <header className="bg-gradient-to-r from-purple-600 to-red-500 text-white border-b border-black/15 shadow-none">
          <div className="mx-auto max-w-6xl px-4 pt-3 pb-3 sm:px-6">
            <TopBarFilter
              filters={draftFilters}
              facets={facets}
              onChange={setDraftFilters}
              onSubmit={submitDraftFilters}
              onReset={resetDraftFilters}
              openChip={openChip}
              setOpenChip={setOpenChip}
              onOpenChat={() => setAiChatOpen(true)}
            />
          </div>
        </header>

        <FilterSubBar
          filters={draftFilters}
          facets={facets}
          onChange={setDraftFilters}
          onSubmit={submitDraftFilters}
          openChip={openChip}
          onClose={() => setOpenChip(null)}
          currency={currency}
          setCurrency={setCurrency}
          usdToNgn={usdToNgn}
        />
      </div>

      <main className="mx-auto max-w-6xl px-4 pb-32 pt-6 sm:px-6 sm:pt-10">
        <div className="max-w-2xl">
          <h1 className="font-display text-[28px] leading-[1.08] sm:text-5xl md:text-6xl md:leading-[1.05]">
            <span className="block">Discover African art.</span>
            <span className="block">Buy, sell, bid and</span>
            <span className="block">stage your space</span>
            <span className="block">virtually</span>
          </h1>
          <p className="mt-3 max-w-md text-sm text-muted-foreground sm:mt-4 sm:text-base">
            A curated catalogue of paintings, pastels and sculptures. Buy, sell, or bid in live
            auctions — and preview any piece on your wall first.
          </p>
        </div>

        {/* Scrolling panes */}
        <section className="relative mt-8 sm:mt-12">
          <div className="mb-3 flex items-end justify-between gap-3">
            <h2 className="font-display text-xl sm:text-2xl">This week on MyAfriart</h2>
            <div className="flex items-center gap-2">
              {paneFailedCount > 0 && (
                <button
                  type="button"
                  onClick={handleRetryPaneImages}
                  className="inline-flex h-9 items-center rounded-full border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-accent"
                >
                  Retry loading images ({paneFailedCount})
                </button>
              )}
              <button
                type="button"
                aria-label="Scroll left"
                onClick={() => scrollBy(-1)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground transition hover:bg-accent"
              >
                ←
              </button>
              <button
                type="button"
                aria-label="Scroll right"
                onClick={() => scrollBy(1)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground transition hover:bg-accent"
              >
                →
              </button>
            </div>
          </div>

          <div
            ref={scrollerRef}
            className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {panes.map((p) => (
              <PaneCard
                key={p.id}
                pane={p}
                retryNonce={paneRetryNonce}
                onFailureChange={registerPaneFailure}
                onOpen={() => {
                  setOpenId(p.id);
                }}
              />
            ))}
          </div>
        </section>

        {/* Merged Art Lounge CTA — between scrolling panes and the catalogue */}
        <section className="mt-10 sm:mt-14">
          <button
            type="button"
            onClick={() => {
              trackClick("sell_your_work", "lounge_merged_cta");
              requestLounge();
            }}
            className="group relative block w-full overflow-hidden rounded-2xl border border-amber-500/30 bg-zinc-950 text-left shadow-xl transition hover:shadow-2xl"
          >
            <div className="absolute inset-0 z-0">
              <img
                src={paneEvent}
                alt=""
                className="h-full w-full object-contain opacity-40 transition duration-700 group-hover:opacity-50"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/30" />
            </div>
            <div className="relative z-10 flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-10">
              <div className="max-w-xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-amber-400">
                  One place. Every move.
                </p>
                <h2 className="mt-2 font-display text-2xl leading-tight text-stone-50 sm:text-4xl">
                  Discover, bid, sell and stage — all inside the Art Lounge.
                </h2>
                <p className="mt-3 text-sm text-stone-300 sm:text-base">
                  Step through the doors to browse live auctions, buy and sell direct from
                  collectors, or stage any piece on your own wall.
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-md bg-amber-500 px-5 py-3 text-sm font-medium text-zinc-950 transition group-hover:bg-amber-400 sm:self-auto">
                Enter the Art Lounge →
              </span>
            </div>
          </button>
        </section>

        {/* Catalogue grid */}
        <section ref={catalogueRef} className="mt-12 sm:mt-16">
          <div className="mb-4 flex flex-wrap items-end justify-end gap-3">
            <p className="text-xs text-muted-foreground">
              {loadingCatalogue
                ? "Loading…"
                : `${filteredArtists.length} artist${filteredArtists.length === 1 ? "" : "s"} · ${filteredArtworks.length} piece${filteredArtworks.length === 1 ? "" : "s"}`}
            </p>
          </div>

          {/* Artists lane */}
          {(scope === "all" || scope === "artists") && (
            <div className="mb-10">
              <h3 className="mb-3 font-display text-lg sm:text-xl">
                Artists{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  ({filteredArtists.length})
                </span>
              </h3>
              {filteredArtists.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
                  No artists match these filters.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                  {filteredArtists.map((entry) => {
                    const code =
                      entry.artist.short_code ??
                      (entry.sample?.content_source !== "mock" &&
                      !String(entry.artist.id).startsWith("local-")
                        ? entry.artist.id
                        : null);
                    const card = (
                      <>
                        <div className="relative aspect-square overflow-hidden bg-muted">
                          {entry.sample?.image_url ? (
                            <img
                              src={bustImageUrl(
                                entry.sample.image_url,
                                entry.sample.updated_at ?? entry.sample.id,
                              )}
                              alt={`Work by ${entry.artist.name}`}
                              loading="lazy"
                              className="absolute inset-0 h-full w-full object-contain transition"
                            />
                          ) : entry.portraitUrl ? (
                            <img
                              src={bustImageUrl(entry.portraitUrl, entry.artist.id)}
                              alt={entry.artist.name}
                              loading="lazy"
                              className="absolute inset-0 h-full w-full object-contain transition"
                            />
                          ) : (
                            <div className="absolute inset-0 flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                              No image
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <p className="truncate text-sm font-semibold">{entry.artist.name}</p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {[entry.artist.country, entry.artist.domicile_city]
                              .filter(Boolean)
                              .join(" · ") || "—"}
                          </p>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {entry.pieceCount} matching piece{entry.pieceCount === 1 ? "" : "s"}
                          </p>
                        </div>
                      </>
                    );
                    return code ? (
                      <Link
                        key={entry.artist.id}
                        to="/artist/$code"
                        params={{ code }}
                        className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition hover:shadow-md"
                      >
                        {card}
                      </Link>
                    ) : (
                      <button
                        key={entry.artist.id}
                        type="button"
                        onClick={() => updateFilters({ ...filters, q: entry.artist.name })}
                        className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card text-left transition hover:shadow-md"
                      >
                        {card}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Artworks lane */}
          {(scope === "all" || scope === "artworks") && (
            <div>
              <h3 className="mb-3 font-display text-lg sm:text-xl">
                Artworks{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  ({filteredArtworks.length})
                </span>
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                {filteredArtworks.map((a) => (
                  <ArtworkCard key={a.id} artwork={a} />
                ))}
                {!loadingCatalogue && filteredArtworks.length === 0 && (
                  <div className="col-span-full rounded-lg border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
                    No works match these filters.{" "}
                    <button
                      type="button"
                      onClick={() => updateFilters(EMPTY_FILTERS)}
                      className="underline-offset-4 hover:underline"
                    >
                      Reset
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-zinc-900 bg-zinc-900 text-zinc-200 pb-24 md:pb-0">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-2 px-4 py-5 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-6">
          <div>© MyAfriart</div>
          <nav className="flex items-center gap-4">
            <Link to="/" className="font-medium text-white hover:text-white/80">
              Discover
            </Link>
            <Link to="/lounge" className="font-medium text-white hover:text-white/80">
              Art Lounge
            </Link>
            <Link to="/studio" className="font-medium text-white hover:text-white/80">
              Stage a room
            </Link>
          </nav>
        </div>
      </footer>

      <div className="fixed bottom-0 left-0 right-0 z-40 flex gap-2 border-t border-white/10 bg-zinc-900 p-3 md:hidden">
        <Link
          to="/studio"
          className="inline-flex flex-1 items-center justify-center bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 hover:bg-white/90"
        >
          Stage a room
        </Link>
      </div>

      {/* Reveal modal for standard panes */}
      {active && (
        <RevealModal
          active={active}
          onClose={() => setOpenId(null)}
          onExplore={() => openPaneDestination(active)}
        />
      )}

      {/* Sale Lounge — sliding doors */}
      {loungeOpen && <SaleLounge onClose={() => setLoungeOpen(false)} />}

      {/* Auth gate prompt for the Sale Lounge */}
      {gatePromptOpen && (
        <GatePrompt
          onClose={() => setGatePromptOpen(false)}
          onSignIn={() => {
            setGatePromptOpen(false);
            navigate({ to: "/login" });
          }}
        />
      )}

      <AiChatPanel
        open={aiChatOpen}
        onClose={() => setAiChatOpen(false)}
        sponsored={panes.map<SponsoredItem>((p) => ({
          id: p.id,
          kicker: p.kicker,
          title: p.title,
          summary: p.summary,
          image: paneImageFor(p),
          to:
            p.to === "/" && p.scope
              ? `/?scope=${p.scope}&focus=${p.scope}`
              : p.to === "/lounge" && p.loungeTab
                ? `/lounge?tab=${p.loungeTab}`
                : p.to,
        }))}
      />
    </div>
  );
}

function PaneCard({
  pane,
  onOpen,
  retryNonce,
  onFailureChange,
}: {
  pane: Pane;
  onOpen: () => void;
  retryNonce: number;
  onFailureChange: (failed: boolean) => void;
}) {
  const ref = useRef<HTMLButtonElement | null>(null);
  const recorded = useRef(false);
  const record = useServerFn(recordPaneView);
  const paneImage = paneImageFor(pane);
  const [failed, setFailed] = useState(false);
  const failedRef = useRef(false);
  useEffect(() => {
    // Reset on retry
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
      sid = (
        crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36)
      ).replace(/-/g, "");
      localStorage.setItem(KEY, sid);
    }
    const seenKey = `myafriart_pane_seen_${pane.id}_${new Date().toISOString().slice(0, 10)}`;
    if (sessionStorage.getItem(seenKey)) recorded.current = true;

    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !recorded.current) {
            recorded.current = true;
            sessionStorage.setItem(seenKey, "1");
            record({ data: { pane_id: pane.id, session_id: sid! } }).catch(() => {});
            obs.disconnect();
          }
        }
      },
      { threshold: 0.5 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [pane.id, record]);

  return (
    <button
      ref={ref}
      type="button"
      onClick={onOpen}
      className="group relative flex w-[260px] flex-shrink-0 snap-start flex-col overflow-hidden rounded-lg border border-border bg-card text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg sm:w-[320px]"
    >
      <div className="relative z-10 bg-card px-4 pt-3 pb-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {pane.kicker}
        </p>
        <h3 className="mt-1 font-display text-lg leading-tight text-foreground">{pane.title}</h3>
      </div>

      <div className={`relative h-48 overflow-hidden bg-gradient-to-br ${pane.gradient} sm:h-60`}>
        <img
          key={retryNonce}
          src={bustImageUrl(paneImage, `${PANE_ASSET_VERSION}-${retryNonce}`)}
          alt={pane.title}
          loading="eager"
          decoding="async"
          onError={(event) => {
            const image = event.currentTarget;
            const local = localPaneAssets[pane.id] || publicPaneAssets[pane.id] || localImageForKey(pane.id) || artistDefault;
            const tried = image.dataset.fallback || "0";
            if (tried === "0") {
              image.dataset.fallback = "1";
              image.src = local;
              return;
            }
            if (tried === "1") {
              image.dataset.fallback = "2";
              image.src = artistDefault;
              return;
            }
            if (!failedRef.current) {
              failedRef.current = true;
              setFailed(true);
              onFailureChange(true);
            }
          }}
          className="absolute inset-0 z-0 h-full w-full object-contain transition duration-500"
        />
        {failed && (
          <div className="absolute bottom-2 left-2 z-30 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
            Image failed to load
          </div>
        )}
        {pane.special === "lounge" && (
          <>
            <div className="absolute inset-y-0 left-0 z-20 w-1/2 border-r border-amber-400/40 bg-gradient-to-r from-black/70 to-black/5 transition-transform duration-500 group-hover:-translate-x-2" />
            <div className="absolute inset-y-0 right-0 z-20 w-1/2 bg-gradient-to-l from-black/70 to-black/5 transition-transform duration-500 group-hover:translate-x-2" />
            <div className="absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 text-3xl text-amber-400">
              ✦
            </div>
          </>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="line-clamp-3 text-sm leading-snug text-muted-foreground">{pane.summary}</p>
        <span className="text-xs font-medium text-primary transition group-hover:translate-x-1">
          {pane.special === "lounge" ? "Enter the lounge →" : "Reveal more →"}
        </span>
      </div>
    </button>
  );
}

function SaleLounge({ onClose }: { onClose: () => void }) {
  const [entered, setEntered] = useState(false);

  // Trigger door-open animation once after mount
  useEffect(() => {
    setEntered(true);
  }, []);

  const trapRef = useFocusTrap<HTMLDivElement>(true, onClose);

  return (
    <div
      ref={trapRef}
      role="dialog"
      aria-modal="true"
      aria-label="Sale Lounge"
      tabIndex={-1}
      className="fixed inset-0 z-50 overflow-hidden bg-black outline-none"
    >
      {/* Gallery curtain — slides sideways to reveal the lounge */}
      <div
        className={`absolute inset-0 z-20 transition-transform duration-[1400ms] ease-[cubic-bezier(0.65,0,0.35,1)] ${
          entered ? "-translate-x-full" : "translate-x-0"
        }`}
      >
        <img src={paneEvent} alt="Inside the gallery" className="h-full w-full object-contain" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-black/70" />
        <div className="absolute bottom-10 left-6 right-6 text-stone-100 sm:bottom-16 sm:left-12">
          <p className="text-[11px] uppercase tracking-[0.3em] text-amber-300">
            Opening the doors…
          </p>
          <h2 className="mt-2 font-display text-3xl sm:text-5xl">Welcome to the Art Lounge</h2>
        </div>
      </div>

      {/* Interior */}
      <div
        className={`relative z-10 flex h-full w-full flex-col bg-gradient-to-b from-stone-900 via-zinc-950 to-black text-stone-100 transition-opacity duration-700 ${
          entered ? "opacity-100" : "opacity-0"
        }`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close lounge"
          className="absolute right-4 top-4 z-30 h-9 w-9 rounded-full border border-amber-400/40 text-amber-300 hover:bg-amber-400/10"
        >
          ✕
        </button>

        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 py-10 text-center">
          <p className="text-[11px] uppercase tracking-[0.3em] text-amber-400">Sale Lounge</p>
          <h2 className="mt-3 font-display text-3xl leading-tight sm:text-5xl">
            Choose your next step.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-stone-400 sm:text-base">
            Three doors, one floor. Pick the one that fits the move you want to make.
          </p>

          <div className="mt-10 grid w-full gap-5 sm:grid-cols-3">
            <LoungeOption
              image={paneAuction}
              title="Bid in auction"
              desc="Live and timed sales. Place bids, set alerts, follow paddles in real time."
              cta="Enter auctions"
              to="/auction"
            />
            <LoungeOption
              image={paneArtist}
              title="Sell & buy"
              desc="List your own work or buy direct from verified collectors and artists."
              cta="Open the floor"
              to="/lounge"
            />
            <LoungeOption
              image={paneStage}
              title="Stage your wall"
              desc="Preview any piece at true scale on your own wall before you commit."
              cta="Open artstage"
              to="/studio"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function LoungeOption({
  image,
  title,
  desc,
  cta,
  to,
}: {
  image: string;
  title: string;
  desc: string;
  cta: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-amber-400/20 bg-white/5 text-left ring-1 ring-transparent transition hover:-translate-y-0.5 hover:ring-amber-400/60"
    >
      <div className="relative h-44 w-full overflow-hidden sm:h-56">
        <img
          src={image}
          alt={title}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-xl text-amber-200">{title}</h3>
        <p className="mt-2 flex-1 text-sm text-stone-300">{desc}</p>
        <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-amber-300 group-hover:text-amber-200">
          {cta} →
        </span>
      </div>
    </Link>
  );
}

function RevealModal({
  active,
  onClose,
  onExplore,
}: {
  active: Pane;
  onClose: () => void;
  onExplore: () => void;
}) {
  const trapRef = useFocusTrap<HTMLDivElement>(true, onClose);
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reveal-title"
        tabIndex={-1}
        className="w-full max-w-lg overflow-hidden rounded-lg border border-border bg-card shadow-2xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`relative h-40 bg-gradient-to-br ${active.gradient}`}>
          <img
            src={bustImageUrl(paneImageFor(active), PANE_ASSET_VERSION)}
            alt={active.title}
            loading="lazy"
            decoding="async"
            onError={(event) => {
              const image = event.currentTarget;
              if (image.src !== artistDefault) image.src = artistDefault;
            }}
            className="absolute inset-0 h-full w-full object-contain"
          />
        </div>
        <div className="p-5 sm:p-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-primary sm:text-xs">
            {active.kicker}
          </p>
          <h3 id="reveal-title" className="mt-1 font-display text-xl sm:text-2xl">
            {active.title}
          </h3>
          <p className="mt-3 text-sm text-muted-foreground">{active.summary}</p>
          <p className="mt-3 text-sm">{active.reveal}</p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent"
            >
              Close
            </button>
            <button
              type="button"
              onClick={onExplore}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              {active.exploreLabel ?? "Explore →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function GatePrompt({ onClose, onSignIn }: { onClose: () => void; onSignIn: () => void }) {
  const trapRef = useFocusTrap<HTMLDivElement>(true, onClose);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="gate-title"
        tabIndex={-1}
        className="relative w-full max-w-md rounded-xl border border-amber-500/30 bg-zinc-950 p-6 text-zinc-100 shadow-2xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[11px] uppercase tracking-[0.3em] text-amber-400">Members only</p>
        <h3 id="gate-title" className="mt-2 font-display text-2xl">
          The Sale Lounge is private
        </h3>
        <p className="mt-3 text-sm text-zinc-300">
          Sign in to step through the doors. Verified profiles can bid in live auctions and browse
          personal sales listed by registered art owners.
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            className="rounded-md border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-900"
            onClick={onClose}
          >
            Not now
          </button>
          <button
            className="rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-400"
            onClick={onSignIn}
          >
            Sign in to enter →
          </button>
        </div>
      </div>
    </div>
  );
}

function ArtworkCard({ artwork }: { artwork: ArtworkRow }) {
  const price =
    typeof artwork.price === "number"
      ? `${artwork.currency ?? "USD"} ${artwork.price.toLocaleString()}`
      : null;
  const inner = (
    <article className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="relative aspect-[4/5] overflow-hidden bg-muted">
        {artwork.image_url ? (
          <img
            src={bustImageUrl(artwork.image_url, artwork.updated_at ?? artwork.id)}
            alt={artwork.title}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-contain transition duration-500"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            No image
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="line-clamp-1 font-display text-sm leading-tight">{artwork.title}</p>
        <p className="line-clamp-1 text-xs text-muted-foreground">
          {artwork.artist?.name ?? "Unknown artist"}
          {artwork.artist?.country ? ` · ${artwork.artist.country}` : ""}
        </p>
        <div className="mt-1 flex items-center justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
          <span>{artwork.medium}</span>
          {price && <span className="text-foreground">{price}</span>}
        </div>
        {artwork.short_code && (
          <p className="text-[10px] text-muted-foreground">{artwork.short_code}</p>
        )}
      </div>
    </article>
  );
  const isMock =
    artwork.content_source === "mock" ||
    (typeof artwork.id === "string" && artwork.id.startsWith("local-"));
  // Mock pieces carry stable short_codes (PCE-M###) so detail routes resolve
  // offline; live pieces use their DB short_code or UUID.
  const linkCode = artwork.short_code ?? (!isMock ? artwork.id : null);
  return linkCode ? (
    <Link to="/piece/$code" params={{ code: linkCode }}>
      {inner}
    </Link>
  ) : (
    inner
  );
}

type ChipKey = "artist" | "country" | "medium" | "gender" | "city" | "age" | "price";

const CHIPS: { key: ChipKey; label: string }[] = [
  { key: "artist", label: "Artists" },
  { key: "country", label: "Country" },
  { key: "city", label: "City" },
  { key: "medium", label: "Medium" },
  { key: "age", label: "Age" },
  { key: "price", label: "Price" },
];

function chipCount(key: ChipKey, f: CatalogueFilters): number {
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
  onOpenChat,
}: {
  filters: CatalogueFilters;
  facets: FacetOptions;
  onChange: (next: CatalogueFilters) => void;
  onSubmit: (nextFilters?: CatalogueFilters) => void;
  onReset: () => void;
  openChip: ChipKey | null;
  setOpenChip: (key: ChipKey | null) => void;
  onOpenChat: () => void;
}) {
  const hasAny =
    filters.q ||
    filters.countries.length ||
    filters.mediums.length ||
    filters.genders.length ||
    filters.cities.length ||
    filters.artists.length ||
    filters.ageRange ||
    filters.priceRange;

  const applySmartSearch = () => {
    const tokens = (filters.q || "")
      .toLowerCase()
      .split(/[,\s]+/)
      .map((t) => t.trim())
      .filter(Boolean);
    if (!tokens.length) {
      onSubmit();
      return;
    }
    const next = { ...filters };
    const matchInto = (pool: string[], current: string[]): string[] => {
      const add = pool.filter((o) => tokens.some((t) => o.toLowerCase().includes(t)));
      return Array.from(new Set([...current, ...add]));
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
  const filterRectangleClass = `inline-flex ${controlH} ${fixedControlW} flex-none items-center justify-center gap-1.5 rounded-none px-2 text-sm ring-1 transition`;

  return (
    <div className="flex flex-col gap-2">
      {/* Row 1 — wide search + AI concierge button (outside input) */}
      <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[minmax(0,1fr)_7.5rem]">
        <div
          className={`flex ${controlH} flex-1 items-center gap-2 rounded-none bg-white/15 px-3 text-white ring-1 ring-white/25 backdrop-blur`}
        >
          <span className="text-white/70" aria-hidden>
            ⌕
          </span>
          <input
            value={filters.q}
            onChange={(e) => onChange({ ...filters, q: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onSubmit();
              }
            }}
            placeholder="Search artist or piece"
            aria-label="Search artist or piece"
            className="min-w-0 flex-1 bg-transparent text-[15px] font-normal text-white/65 outline-none placeholder:text-white/50"
          />
          {filters.q && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => onChange({ ...filters, q: "" })}
              className="text-xs text-white/80 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onOpenChat}
          aria-label="Ask the AI concierge"
          className={rectangleClass}
        >
          <span aria-hidden>✦</span>
          <span>AI concierge</span>
        </button>
      </div>

      {/* Row 2 — chips share left column (1fr), Reset + arrow stack inline under AI concierge */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1fr)_7.5rem] sm:items-center">
        <div className="contents sm:grid sm:grid-cols-7 sm:gap-2">
          <button
            type="button"
            onClick={applySmartSearch}
            className={`inline-flex ${controlH} w-full flex-none items-center justify-center gap-1 rounded-none bg-white/30 px-2 text-sm font-semibold text-white ring-1 ring-white/40 transition hover:bg-white/40`}
            aria-label="Run smart search using the search box above"
            title="Smart search uses the text from the search box above"
          >
            <span aria-hidden>⌕</span>
            <span className="truncate">Search by…</span>
          </button>

          {CHIPS.map(({ key, label }) => {
            const count = chipCount(key, filters);
            const total =
              key === "country"
                ? facets.countries.length
                : key === "medium"
                  ? facets.mediums.length
                  : key === "city"
                    ? facets.cities.length
                    : key === "artist"
                      ? facets.artists.length
                      : 0;
            const allSelected = total > 0 && count === total;
            const active = count > 0;
            const isOpen = openChip === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setOpenChip(isOpen ? null : key)}
                className={`inline-flex ${controlH} w-full flex-none items-center justify-center gap-1 rounded-none px-2 text-sm ring-1 transition ${
                  isOpen
                    ? "bg-white text-purple-700 ring-white"
                    : active
                      ? "bg-white/25 text-white ring-white/40"
                      : "bg-white/10 text-white ring-white/20 hover:bg-white/20"
                }`}
              >
                <span className="truncate">{label}</span>
                {count > 0 && (
                  <span className="rounded-none bg-purple-700 px-1 text-[10px] font-semibold text-white">
                    {allSelected ? "All" : count}
                  </span>
                )}
                <span className="text-[10px] opacity-80" aria-hidden>
                  {isOpen ? "▴" : "▾"}
                </span>
              </button>
            );
          })}
        </div>

        <div className={`flex ${controlH} items-center gap-2`}>
          <button
            type="button"
            onClick={onReset}
            className={`inline-flex ${controlH} flex-1 items-center justify-center rounded-none bg-transparent px-2 text-sm font-semibold text-white ring-1 ring-white/40 transition hover:bg-white/10 ${hasAny ? "" : "opacity-55"}`}
            aria-label="Reset filters"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => onSubmit()}
            className={`inline-flex ${controlH} w-9 flex-none items-center justify-center rounded-full bg-transparent text-white ring-1 ring-white/40 transition hover:bg-white/10`}
            aria-label="Apply filters and search"
            title="Apply filters and search"
          >
            <span aria-hidden className="text-base leading-none">
              →
            </span>
          </button>
        </div>
      </div>
    </div>
  );
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
  usdToNgn,
}: {
  filters: CatalogueFilters;
  facets: FacetOptions;
  onChange: (next: CatalogueFilters) => void;
  onSubmit: () => void;
  openChip: ChipKey | null;
  onClose: () => void;
  currency: "USD" | "NGN";
  setCurrency: (c: "USD" | "NGN") => void;
  usdToNgn: number;
}) {
  if (!openChip) return null;

  const toggle = (list: string[], v: string) =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

  const renderMulti = (
    options: string[],
    selected: string[],
    set: (next: string[]) => void,
    layout: "wrap" | "columns" = "wrap",
  ) => {
    const allOptions = ["ALL", ...options];
    const toggleWithAll = (list: string[], v: string) => {
      if (v === "ALL") return [];
      let next = list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
      if (next.includes("ALL")) next = next.filter((x) => x !== "ALL");
      return next;
    };
    const isColumns = layout === "columns";
    return (
      <div className={isColumns ? "w-full" : "flex flex-wrap items-center gap-1.5"}>
        {allOptions.length === 1 && (
          <span className="text-xs text-muted-foreground">No options available</span>
        )}
        <div
          className={
            isColumns
              ? "grid grid-cols-2 gap-x-8 gap-y-1.5 sm:grid-cols-3 md:grid-cols-4"
              : "contents"
          }
        >
          {allOptions.map((opt) => {
            const checked = opt === "ALL" ? selected.length === 0 : selected.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => set(toggleWithAll(selected, opt))}
                className={
                  isColumns
                    ? `flex w-full items-center gap-2 rounded-md border px-2.5 py-1 text-left text-xs transition ${
                        checked
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-transparent bg-transparent text-foreground hover:bg-muted"
                      }`
                    : `inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition ${
                        checked
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-foreground hover:border-foreground/30"
                      }`
                }
              >
                <Checkbox checked={checked} className="h-3 w-3 pointer-events-none" />
                <span className="truncate">{opt}</span>
              </button>
            );
          })}
        </div>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={() => set([])}
            className={`text-[11px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline ${
              isColumns ? "mt-3 block" : "ml-2"
            }`}
          >
            Clear
          </button>
        )}
      </div>
    );
  };

  const renderRange = (
    bounds: [number, number],
    value: [number, number] | null,
    step: number,
    format: (n: number) => string,
    set: (v: [number, number] | null) => void,
    ticks?: number[],
  ) => {
    const current: [number, number] = value ?? bounds;
    // Single grid template shared by all rows so min/max labels and ticks
    // always line up with the slider track regardless of container width.
    const gridStyle: React.CSSProperties = {
      display: "grid",
      gridTemplateColumns: "minmax(3.5rem, max-content) minmax(0, 1fr) minmax(3.5rem, max-content)",
      columnGap: "0.75rem",
      alignItems: "center",
      width: "100%",
    };
    return (
      <div className="flex w-full flex-col gap-2">
        <div style={gridStyle}>
          <span className="text-right text-sm font-bold tabular-nums text-foreground">
            {format(current[0])}
          </span>
          <Slider
            min={bounds[0]}
            max={bounds[1]}
            step={step}
            value={current}
            onValueChange={(v) => set([v[0], v[1]] as [number, number])}
            className="w-full"
          />
          <span className="text-left text-sm font-bold tabular-nums text-foreground">
            {format(current[1])}
          </span>
        </div>
        {ticks && ticks.length > 0 && (
          <div style={gridStyle}>
            <span aria-hidden />
            <div className="relative h-6 w-full select-none">
              {ticks.map((t) => {
                const pct = ((t - bounds[0]) / (bounds[1] - bounds[0])) * 100;
                const clampedPct = Math.max(0, Math.min(100, pct));
                // Avoid clipping the first/last labels by anchoring them to
                // the track edges instead of centering them on overflow.
                const translate =
                  clampedPct <= 0
                    ? "translateX(0)"
                    : clampedPct >= 100
                      ? "translateX(-100%)"
                      : "translateX(-50%)";
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      const distLow = Math.abs(t - current[0]);
                      const distHigh = Math.abs(t - current[1]);
                      if (distLow <= distHigh) {
                        set([Math.min(t, current[1]), current[1]]);
                      } else {
                        set([current[0], Math.max(t, current[0])]);
                      }
                    }}
                    className="absolute top-0 flex flex-col items-center gap-1 text-[10px] font-semibold tabular-nums text-muted-foreground hover:text-foreground"
                    style={{ left: `${clampedPct}%`, transform: translate }}
                    aria-label={`Snap nearest handle to ${t}`}
                  >
                    <span className="h-1.5 w-px bg-border" />
                    <span>{t}</span>
                  </button>
                );
              })}
            </div>
            <span aria-hidden />
          </div>
        )}
        {value !== null && (
          <div className="flex w-full justify-end">
            <button
              type="button"
              onClick={() => set(null)}
              className="text-[11px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Clear
            </button>
          </div>
        )}
      </div>
    );
  };

  let content: React.ReactNode = null;
  switch (openChip) {
    case "artist":
      content = (
        <div className="flex w-full flex-col gap-4">
          <div>
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Gender
            </div>
            {renderMulti(facets.genders, filters.genders, (v) =>
              onChange({ ...filters, genders: v }),
            )}
          </div>
          <div>
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Artists
            </div>
            {renderMulti(
              facets.artists,
              filters.artists,
              (v) => onChange({ ...filters, artists: v }),
              "columns",
            )}
          </div>
        </div>
      );
      break;
    case "country":
      content = renderMulti(
        facets.countries,
        filters.countries,
        (v) => onChange({ ...filters, countries: v }),
        "columns",
      );
      break;
    case "medium":
      content = renderMulti(facets.mediums, filters.mediums, (v) =>
        onChange({ ...filters, mediums: v }),
      );
      break;
    case "gender":
      content = renderMulti(facets.genders, filters.genders, (v) =>
        onChange({ ...filters, genders: v }),
      );
      break;
    case "city":
      content = renderMulti(facets.cities, filters.cities, (v) =>
        onChange({ ...filters, cities: v }),
      );
      break;
    case "age":
      content = renderRange(
        facets.ageBounds,
        filters.ageRange,
        1,
        (n) => {
          const year = new Date().getFullYear() - n;
          if (n === 0) return `<1 yr · ${year}`;
          if (n === 1) return `1 yr · ${year}`;
          return `${n} yrs · ${year}`;
        },
        (v) => onChange({ ...filters, ageRange: v }),
        [0, 25, 50, 75, 100, 125, 150, 175, 200],
      );
      break;
    case "price":
      content = (
        <PriceRange
          bounds={facets.priceBounds}
          value={filters.priceRange}
          currency={currency}
          setCurrency={setCurrency}
          usdToNgn={usdToNgn}
          onChange={(v) => onChange({ ...filters, priceRange: v })}
        />
      );
      break;
  }

  const label = CHIPS.find((c) => c.key === openChip)?.label ?? "";

  return (
    <div className="border-b border-border bg-muted">
      {/* Mobile: header row (label + actions) stacked above the full-width
          options; desktop: single row. Without the stack, the options grid
          collapses to ~100px on phones and every option truncates to nothing. */}
      <div className="mx-auto flex max-w-6xl flex-wrap items-start gap-3 px-4 py-3 sm:flex-nowrap sm:gap-4 sm:px-6">
        <div className="mt-1 flex flex-col">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </span>
          {openChip !== "age" && openChip !== "price" && (
            <span className="mt-0.5 text-[10px] text-muted-foreground/80">
              Tip: select multiple
            </span>
          )}
        </div>
        <div className="order-3 w-full min-w-0 sm:order-none sm:w-auto sm:flex-1">{content}</div>
        <div className="ml-auto flex items-center gap-2 sm:ml-0">
          <button
            type="button"
            onClick={() => onSubmit()}
            className="inline-flex h-8 items-center rounded-none bg-purple-700 px-3 text-xs font-semibold text-white transition hover:bg-purple-800"
          >
            Apply &amp; Search
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filter"
            className="text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

// Two-handle price slider with USD/NGN toggle and live conversion. Internal
// values are stored in USD; the display converts to the active currency.
function PriceRange({
  bounds,
  value,
  currency,
  setCurrency,
  usdToNgn,
  onChange,
}: {
  bounds: [number, number];
  value: [number, number] | null;
  currency: "USD" | "NGN";
  setCurrency: (c: "USD" | "NGN") => void;
  usdToNgn: number;
  onChange: (v: [number, number] | null) => void;
}) {
  const currentUsd: [number, number] = value ?? bounds;
  const isMaxOpen = currentUsd[1] >= bounds[1];

  const toDisplay = (usd: number) => (currency === "NGN" ? usd * usdToNgn : usd);
  const toUsd = (display: number) => (currency === "NGN" ? display / usdToNgn : display);

  const symbol = currency === "NGN" ? "₦" : "$";
  const fmt = (usd: number, isHighOpen = false) => {
    if (isHighOpen) return `${symbol}${Math.round(toDisplay(bounds[1])).toLocaleString()}+`;
    const n = toDisplay(usd);
    return `${symbol}${Math.round(n).toLocaleString()}`;
  };

  const sliderMax = Math.round(toDisplay(bounds[1]));
  const sliderStep = currency === "NGN" ? Math.max(1000, Math.round(usdToNgn * 50)) : 50;
  const sliderValue: [number, number] = [
    Math.round(toDisplay(currentUsd[0])),
    Math.round(toDisplay(currentUsd[1])),
  ];

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center rounded-full border border-border bg-card p-0.5 text-xs">
          {(["USD", "NGN"] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCurrency(c)}
              className={`rounded-full px-3 py-1 transition ${
                currency === c
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-muted-foreground">
          Live rate: $1 ≈ ₦{Math.round(usdToNgn).toLocaleString()}
        </span>
      </div>

      <div className="flex w-full items-center gap-6">
        <span className="w-28 shrink-0 text-right text-sm font-bold tabular-nums text-foreground">
          {fmt(currentUsd[0])}
        </span>
        <Slider
          min={0}
          max={sliderMax}
          step={sliderStep}
          value={sliderValue}
          onValueChange={(v) => {
            const lo = toUsd(v[0]);
            const hi = toUsd(v[1]);
            onChange([Math.max(0, Math.round(lo)), Math.min(bounds[1], Math.round(hi))]);
          }}
          className="flex-1"
        />
        <span className="w-28 shrink-0 text-left text-sm font-bold tabular-nums text-foreground">
          {fmt(currentUsd[1], isMaxOpen)}
        </span>
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Low</span>
        <span>{isMaxOpen ? "High (open-ended)" : "High"}</span>
      </div>

      {value !== null && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="self-start text-[11px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Clear price filter
        </button>
      )}
    </div>
  );
}
