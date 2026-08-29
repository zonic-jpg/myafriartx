/**
 * Editorial seed — Dotun Popoola / Scrap Art Museum.
 * Facts drawn from public reporting (Wikipedia, Punch, LinkedIn/Substack features).
 * Imagery uses on-site pane assets as rights-safe editorial stand-ins (not artist photos).
 * See /tmp/myafriart-dotun-seed.md after deploy for source notes.
 */
import { publicPaneAssets, localImageForKey } from "@/lib/local-image-assets";

export const DOTUN_ARTIST_ID = "seed-artist-dotun-popoola";
export const DOTUN_ARTIST_CODE = "ART-DOTUN";

export const FEATURED_SEED_ARTISTS: any[] = [
  {
    id: DOTUN_ARTIST_ID,
    short_code: DOTUN_ARTIST_CODE,
    name: "Dotun Popoola",
    country: "Nigeria",
    gender: "Male",
    domicile_city: "Ile-Ife",
    date_of_birth: "1981-04-07",
    portrait_url: publicPaneAssets.artist,
    bio: "Contemporary Nigerian sculptor known for synergetic scrap-metal forms. Founder of the Scrap Art Museum in Ile-Ife (est. 2020), transforming discarded metal into animal anatomies and public sculpture. Alumni of Auchi Polytechnic and Obafemi Awolowo University; works held in museum collections across Nigeria, the US, Qatar, Azerbaijan and Bahrain.",
    view_count: 1280,
  },
];

export const FEATURED_SEED_ARTWORKS: any[] = [
  {
    id: "seed-piece-scrap-museum-opening",
    short_code: "PCE-DOTUN-01",
    title: "Scrap Art Museum — Ile-Ife",
    medium: "Sculpture",
    image_url: publicPaneAssets.event,
    content_source: "mock",
    price: 0,
    currency: "USD",
    year: "2020",
    description:
      "Editorial feature on Africa’s first dedicated scrap-art museum, founded by Dotun Popoola in Ile-Ife with a mission to promote recycled arts, sustainability, and cultural preservation. Image is a rights-safe MyAfriArt editorial stand-in — not an official museum photograph.",
    lifecycle_status: "in_catalogue",
    view_count: 640,
    is_active: true,
    is_pledged: false,
    artist_id: DOTUN_ARTIST_ID,
    artist: FEATURED_SEED_ARTISTS[0],
  },
  {
    id: "seed-piece-reclaimed-beauty",
    short_code: "PCE-DOTUN-02",
    title: "Reclaimed Beauty (editorial)",
    medium: "Sculpture",
    image_url: publicPaneAssets.piece,
    content_source: "mock",
    price: 18500,
    currency: "USD",
    year: "2026",
    description:
      "Editorial catalogue note referencing Popoola’s 2026 solo exhibition Reclaimed Beauty at The Village by Tikera, Abuja (Jun–Sep 2026). Stand-in imagery only — rights-safe local asset.",
    lifecycle_status: "in_catalogue",
    view_count: 410,
    is_active: true,
    is_pledged: false,
    artist_id: DOTUN_ARTIST_ID,
    artist: FEATURED_SEED_ARTISTS[0],
  },
  {
    id: "seed-piece-junk-unmade",
    short_code: "PCE-DOTUN-03",
    title: "Junk Is Just Unmade Art",
    medium: "Mixed media",
    image_url: publicPaneAssets.stage,
    content_source: "mock",
    price: 9200,
    currency: "USD",
    year: "2024",
    description:
      "Inspired by Scrap Art Museum programming (including the 2024 ‘Junk is Just Unmade Art’ conference). Editorial stand-in image for staging & discussion.",
    lifecycle_status: "in_catalogue",
    view_count: 288,
    is_active: true,
    is_pledged: false,
    artist_id: DOTUN_ARTIST_ID,
    artist: FEATURED_SEED_ARTISTS[0],
  },
];

export type BlogPost = {
  slug: string;
  title: string;
  kicker: string;
  excerpt: string;
  body: string[];
  publishedAt: string;
  image: string;
  imageCredit: string;
  tags: string[];
  sources: Array<{ label: string; href: string }>;
};

export type DiscussionThread = {
  id: string;
  title: string;
  author: string;
  publishedAt: string;
  replies: Array<{ author: string; body: string; publishedAt: string }>;
  relatedSlug?: string;
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "dotun-popoola-scrap-art-museum",
    title: "Scrap Art Museum: Dotun Popoola’s Ile-Ife opening and why it matters",
    kicker: "Museum opening · Editorial",
    excerpt:
      "Nigeria’s Scrap Art Museum — founded by sculptor Dotun Popoola in Ile-Ife — turns discarded metal into a public argument for sustainability, craft, and cultural memory.",
    body: [
      "Dotun Popoola (b. 1981, Lagos) is a contemporary Nigerian sculptor who builds synergetic forms from scrap metal — a practice he frames as turning trash into treasure and waste into wealth.",
      "In 2020 he founded the Scrap Art Museum in Ile-Ife, Osun State: an institution dedicated to recycled art, environmental consciousness, employment, and cultural preservation. Public features describe its core values as creativity, innovation, sustainability, and cultural preservation.",
      "Since opening, the museum has hosted conferences and community programmes — among them the launch of Toyeeb Ajayi’s Godzilla statue, the ‘Junk is Just Unmade Art’ conference with plastic upcyclist Gbenga Adeku, and National Arts in Health Week programming on arts and environment.",
      "Popoola studied at Auchi Polytechnic and Obafemi Awolowo University, later serving as a curator at the National Gallery of Art. His metal animal anatomies and public works have appeared in exhibitions including ART X Lagos and the solo show Irin Ajo (Journey), with pieces held in museum collections from Lagos to Alabama, Qatar, Azerbaijan and Bahrain.",
      "In 2026, reporting also covered his eighth solo exhibition, Reclaimed Beauty, at The Village by Tikera in Abuja — a separate chapter from the Ile-Ife museum, but continuous with the same scrap-to-form language.",
      "MyAfriArt seeds this editorial so collectors can stage related works, discuss provenance, and follow the museum’s public mission. Imagery on this page uses rights-safe MyAfriArt stand-ins, not copyrighted museum or exhibition photography.",
    ],
    publishedAt: "2026-08-28",
    image: publicPaneAssets.event,
    imageCredit:
      "Editorial stand-in (MyAfriArt /media) — not an official Scrap Art Museum photograph.",
    tags: ["museum", "sculpture", "sustainability", "Nigeria", "Ile-Ife"],
    sources: [
      {
        label: "Wikipedia — Dotun Popoola",
        href: "https://en.wikipedia.org/wiki/Dotun_Popoola",
      },
      {
        label: "Punch — interview (Apr 2025)",
        href: "https://punchng.com/i-started-making-money-from-artworks-at-nine-sculptor-popoola/",
      },
      {
        label: "Scrap Art Museum feature (Feb 2025)",
        href: "https://www.linkedin.com/pulse/dotun-popoolas-scrap-art-museum-new-era-imeobong-utuk-sfxve",
      },
      {
        label: "Official site",
        href: "https://dotunpopo.com/",
      },
    ],
  },
  {
    slug: "staging-scrap-metal-sculpture",
    title: "How to stage scrap-metal sculpture on your wall (and when to visit a museum instead)",
    kicker: "Studio tips · Discussion seed",
    excerpt:
      "Room staging helps you feel scale before you commit — but living sculpture still asks to be seen in person. Here’s how collectors use MyAfriArt Studio alongside museum visits.",
    body: [
      "Scrap-metal sculpture reads differently in a lounge than in a museum courtyard. Weight, rust patina, and shadow matter. Use Studio to drop a catalogue stand-in onto your wall photo at true scale, then visit Ile-Ife — or the next touring show — before you buy.",
      "When you stage, prefer high-contrast walls and daylight. Metal catches specular highlights; a muddy room photo under-sells the work.",
      "Certificates and provenance remain with the gallery or museum workflow. MyAfriArt’s certificate registry is for platform-settled sales — museum visits and private acquisitions should keep their own paperwork.",
    ],
    publishedAt: "2026-08-29",
    image: publicPaneAssets.stage,
    imageCredit: "MyAfriArt Studio editorial stand-in.",
    tags: ["studio", "staging", "collecting"],
    sources: [
      {
        label: "Dotun Popoola — about",
        href: "https://en.wikipedia.org/wiki/Dotun_Popoola",
      },
    ],
  },
];

export const DISCUSSION_THREADS: DiscussionThread[] = [
  {
    id: "disc-museum-opening",
    title: "Have you visited the Scrap Art Museum in Ile-Ife?",
    author: "Collector desk",
    publishedAt: "2026-08-28",
    relatedSlug: "dotun-popoola-scrap-art-museum",
    replies: [
      {
        author: "Amina K.",
        body: "Went for the Arts & Environment week last year — the courtyard pieces feel monumental in person. Photos don’t capture the weld seams.",
        publishedAt: "2026-08-28",
      },
      {
        author: "Tunde O.",
        body: "The ‘Junk is Just Unmade Art’ conference framing stuck with me. Curious how MyAfriArt will list authenticated scrap works with certificates.",
        publishedAt: "2026-08-29",
      },
      {
        author: "MyAfriArt editorial",
        body: "We’re seeding Popoola as a featured artist with editorial stand-in imagery only. Live lots and certificates will attach once consignors submit rights-cleared photos.",
        publishedAt: "2026-08-29",
      },
    ],
  },
  {
    id: "disc-reclaimed-beauty",
    title: "Reclaimed Beauty (Abuja 2026) — impressions?",
    author: "Lounge",
    publishedAt: "2026-08-20",
    relatedSlug: "dotun-popoola-scrap-art-museum",
    replies: [
      {
        author: "Chioma E.",
        body: "Opening night energy was high — metal animals reading as both industrial and ceremonial. Hoping a Lagos stop follows.",
        publishedAt: "2026-08-21",
      },
    ],
  },
];

export const MOCK_AUCTION_LOTS = [
  {
    id: "00000000-0000-4000-8000-000000000101",
    code: "LOT-DOTUN-01",
    title: "Editorial — Scrap Art Museum highlight",
    artist: "Dotun Popoola",
    medium: "Sculpture (editorial stand-in)",
    image: publicPaneAssets.auction,
    description:
      "Demo auction lot for mobile QA. Image is a rights-safe stand-in; not a live consignment.",
    estimateLow: 8000,
    estimateHigh: 14000,
    startingBid: 6500,
    reserve: 0,
    currentBid: 7200,
    bidCount: 3,
    leadingBidderId: null,
    leadingBidderName: "Collector · Lagos",
    status: "live" as const,
    endsAt: Date.now() + 1000 * 60 * 60 * 36,
    reserveMet: true,
  },
  {
    id: "00000000-0000-4000-8000-000000000102",
    code: "LOT-AFRI-02",
    title: "Market Colour Study",
    artist: "Studio catalogue",
    medium: "Oil",
    image: localImageForKey("auction-lot-2"),
    description: "Timed demo lot for SPA fallback when Supabase auction RPC is offline.",
    estimateLow: 1200,
    estimateHigh: 2800,
    startingBid: 900,
    reserve: 0,
    currentBid: 1100,
    bidCount: 5,
    leadingBidderId: null,
    leadingBidderName: "You?",
    status: "live" as const,
    endsAt: Date.now() + 1000 * 60 * 60 * 18,
    reserveMet: true,
  },
];

export const MOCK_CERTIFICATES = [
  {
    code: "MAFX-DOTUN-DEMO",
    title: "Scrap Art Museum — editorial certificate (demo)",
    artist: "Dotun Popoola",
    issuedAt: "2026-08-28",
    certificate_url: null as string | null,
    status: "valid" as const,
    note: "Demo registry entry for SPA verify flow — not a real COA.",
  },
];

export function getBlogPost(slug: string) {
  return BLOG_POSTS.find((p) => p.slug === slug) ?? null;
}
