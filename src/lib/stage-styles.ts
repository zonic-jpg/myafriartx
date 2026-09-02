/**
 * Curated staging styles — used when DB `styles` is empty (gate mode / fresh project)
 * and as seed rows for Admin upsert. Stable UUIDs so client + Netlify agree.
 */
export type StageStyle = {
  id: string;
  slug: string;
  name: string;
  description: string;
  prompt_fragment: string;
  sort_order: number;
  is_active: boolean;
};

export const LOCAL_MOCK_STYLES: StageStyle[] = [
  {
    id: "a1000001-0001-4000-8000-000000000001",
    slug: "modern-gallery",
    name: "Modern gallery",
    description: "Clean white walls, museum spacing, soft daylight.",
    prompt_fragment:
      "modern gallery aesthetic: clean white or light plaster walls, generous negative space, soft museum daylight, thin dark frame if needed, calm contemporary interior",
    sort_order: 10,
    is_active: true,
  },
  {
    id: "a1000001-0001-4000-8000-000000000002",
    slug: "warm-living",
    name: "Warm living room",
    description: "Lived-in warmth — wood, textiles, soft lamps.",
    prompt_fragment:
      "warm residential living room: honey wood tones, soft lamp light, inviting textiles, natural shadows, artwork feels collected not staged",
    sort_order: 20,
    is_active: true,
  },
  {
    id: "a1000001-0001-4000-8000-000000000003",
    slug: "minimal-scandi",
    name: "Minimal Scandi",
    description: "Pale wood, airy light, restrained palette.",
    prompt_fragment:
      "Scandinavian minimal interior: pale oak, airy white walls, restrained palette, plenty of daylight, quiet framing, uncluttered wall plane",
    sort_order: 30,
    is_active: true,
  },
  {
    id: "a1000001-0001-4000-8000-000000000004",
    slug: "bold-afropolitan",
    name: "Bold Afropolitan",
    description: "Rich colour, pattern dialogue, confident placement.",
    prompt_fragment:
      "Afropolitan interior: rich wall colour or patterned context, confident artwork scale, dialogue with textiles and craft, dramatic but realistic lighting",
    sort_order: 40,
    is_active: true,
  },
  {
    id: "a1000001-0001-4000-8000-000000000005",
    slug: "loft-industrial",
    name: "Loft industrial",
    description: "Brick, concrete, tall windows, urban loft.",
    prompt_fragment:
      "urban loft: exposed brick or concrete, tall windows, industrial metal accents, large-scale wall placement, cool daylight with soft falloff",
    sort_order: 50,
    is_active: true,
  },
];

export function mergeStyles(dbStyles: StageStyle[] | null | undefined): StageStyle[] {
  const fromDb = Array.isArray(dbStyles) ? dbStyles.filter((s) => s && s.is_active !== false) : [];
  if (fromDb.length) return fromDb;
  return LOCAL_MOCK_STYLES;
}

export function styleById(id: string, list?: StageStyle[]) {
  const pool = list?.length ? list : LOCAL_MOCK_STYLES;
  return pool.find((s) => s.id === id) || LOCAL_MOCK_STYLES.find((s) => s.id === id) || null;
}
