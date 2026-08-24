// Public landing-page catalogue queries (read-only, anon-allowed).
// Honors the admin `mock_catalogue_enabled` setting to switch between
// mock and live content sources. For Studio (logged-in render workflow)
// catalogue helpers, see `studio-catalog.functions.ts`.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// De-Lovabled build: server-only deps loaded lazily so they never enter the
// client bundle (TanStack Start import-protection). Handlers still run server-side.
const __get_admin = () =>
  import("@/integrations/supabase/client.server").then((m) => m.supabaseAdmin);
const assertAdmin = async (...__a: any[]): Promise<any> =>
  ((await import("./auth-helpers.server")).assertAdmin as any)(...__a);

const CATALOGUE_CAP = 40;

// Deterministic shuffle for stable per-request sampling.
function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Given allocations (country -> percent) and a pool of items keyed by country,
// return up to CATALOGUE_CAP items, distributed proportionally. Countries with
// no available items have their share reproportioned across the rest.
function applyAllocation<T>(
  pool: Record<string, T[]>,
  allocations: { country: string; percent: number }[],
  cap: number,
): T[] {
  const present = allocations.filter((a) => (pool[a.country]?.length ?? 0) > 0 && a.percent > 0);
  const totalPct = present.reduce((sum, a) => sum + a.percent, 0);

  // No allocations configured (or none of them match content): use everything.
  if (!present.length || totalPct === 0) {
    const all = Object.values(pool).flat();
    return shuffle(all).slice(0, cap);
  }

  // Compute quota per country, then take from each pool.
  const quotas = present.map((a) => ({
    country: a.country,
    quota: Math.floor((a.percent / totalPct) * cap),
  }));

  // Distribute remainder by largest fractional share.
  const used = quotas.reduce((s, q) => s + q.quota, 0);
  let remainder = cap - used;
  const remainders = present
    .map((a, i) => ({ i, frac: (a.percent / totalPct) * cap - quotas[i].quota }))
    .sort((x, y) => y.frac - x.frac);
  for (let k = 0; k < remainders.length && remainder > 0; k++) {
    quotas[remainders[k].i].quota += 1;
    remainder--;
  }

  const out: T[] = [];
  const leftovers: T[] = [];
  for (const q of quotas) {
    const bucket = shuffle(pool[q.country] ?? []);
    out.push(...bucket.slice(0, q.quota));
    leftovers.push(...bucket.slice(q.quota));
  }
  // Top up if some country's pool was smaller than its quota.
  if (out.length < cap) {
    out.push(...shuffle(leftovers).slice(0, cap - out.length));
  }
  return out.slice(0, cap);
}

// ============================================================
// Public: Catalogue pieces
// ============================================================
export const getCataloguePieces = createServerFn({ method: "GET" }).handler(async () => {
  const { data: settings } = await (await __get_admin())
    .from("app_settings")
    .select("value")
    .eq("key", "mock_catalogue_enabled")
    .maybeSingle();
  const source = (typeof settings?.value === "boolean" ? settings.value : true) ? "mock" : "live";

  const [{ data: alloc }, { data: rows }] = await Promise.all([
    (await __get_admin()).from("catalogue_allocations_pieces").select("country, percent"),
    (await __get_admin())
      .from("artworks")
      .select(
        "id, short_code, title, medium, year, image_url, price, currency, lifecycle_status, view_count, content_source, created_at, artist:artists!inner(id, short_code, name, country, gender, domicile_city, date_of_birth)",
      )
      .eq("is_active", true)
      .eq("lifecycle_status", "in_catalogue")
      .eq("content_source", source)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const items = (rows ?? []) as any[];
  const pool: Record<string, any[]> = {};
  for (const item of items) {
    const country = item.artist?.country ?? "Unknown";
    (pool[country] ??= []).push(item);
  }
  return {
    pieces: applyAllocation(pool, alloc ?? [], CATALOGUE_CAP),
    totalAvailable: items.length,
  };
});

// ============================================================
// Public: Catalogue artists
// ============================================================
export const getCatalogueArtists = createServerFn({ method: "GET" }).handler(async () => {
  const { data: settings } = await (await __get_admin())
    .from("app_settings")
    .select("value")
    .eq("key", "mock_catalogue_enabled")
    .maybeSingle();
  const source = (typeof settings?.value === "boolean" ? settings.value : true) ? "mock" : "live";

  const [{ data: alloc }, { data: rows }] = await Promise.all([
    (await __get_admin()).from("catalogue_allocations_artists").select("country, percent"),
    (await __get_admin())
      .from("artists")
      .select(
        "id, short_code, name, country, gender, domicile_city, date_of_birth, portrait_url, view_count, content_source, created_at",
      )
      .eq("content_source", source)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const items = (rows ?? []) as any[];
  const pool: Record<string, any[]> = {};
  for (const item of items) {
    const country = item.country ?? "Unknown";
    (pool[country] ??= []).push(item);
  }
  return {
    artists: applyAllocation(pool, alloc ?? [], CATALOGUE_CAP),
    totalAvailable: items.length,
  };
});

// ============================================================
// Public: Detail by short_code or UUID
// ============================================================
const idSchema = z.object({ idOrCode: z.string().min(1).max(64) });
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const matchKey = (s: string) => (UUID_RE.test(s) ? "id" : "short_code");

export const getPieceDetail = createServerFn({ method: "GET" })
  .inputValidator((d) => idSchema.parse(d))
  .handler(async ({ data }) => {
    const { getMockPiece, isMockCatalogueCode } = await import("@/lib/mock-catalogue");
    if (isMockCatalogueCode(data.idOrCode)) {
      const mock = getMockPiece(data.idOrCode);
      if (mock) return { piece: mock };
    }
    try {
      const key = matchKey(data.idOrCode);
      const { data: piece } = await (await __get_admin())
        .from("artworks")
        .select(
          "id, short_code, title, medium, year, image_url, price, currency, lifecycle_status, view_count, description, dominant_palette, default_frame, content_source, is_active, is_pledged, created_at, updated_at, artist:artists(id, short_code, name, country, gender, domicile_city, date_of_birth, portrait_url, bio)",
        )
        .eq(key, data.idOrCode)
        .maybeSingle();
      if (piece) return { piece };
    } catch {
      // Fall through to mock when Supabase is unavailable.
    }
    const mock = getMockPiece(data.idOrCode);
    return { piece: mock };
  });

export const getArtistDetail = createServerFn({ method: "GET" })
  .inputValidator((d) => idSchema.parse(d))
  .handler(async ({ data }) => {
    const { getMockArtist, isMockCatalogueCode } = await import("@/lib/mock-catalogue");
    if (isMockCatalogueCode(data.idOrCode)) {
      const mock = getMockArtist(data.idOrCode);
      if (mock) return mock;
    }
    try {
      const key = matchKey(data.idOrCode);
      const { data: artist } = await (await __get_admin())
        .from("artists")
        .select(
          "id, short_code, name, country, gender, domicile_city, date_of_birth, portrait_url, bio, era, alma_mater, view_count, created_at, updated_at",
        )
        .eq(key, data.idOrCode)
        .maybeSingle();
      if (artist) {
        const { data: works } = await (await __get_admin())
          .from("artworks")
          .select(
            "id, short_code, title, medium, year, image_url, price, currency, lifecycle_status, view_count, created_at",
          )
          .eq("artist_id", artist.id)
          .order("created_at", { ascending: false });
        return { artist, works: works ?? [] };
      }
    } catch {
      // Fall through to mock when Supabase is unavailable.
    }
    const mock = getMockArtist(data.idOrCode);
    return mock ?? { artist: null, works: [] };
  });

// ============================================================
// Public: Bump view counter
// ============================================================
export const bumpView = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ target: z.enum(["artworks", "artists"]), id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { error } = await (
      await __get_admin()
    ).rpc("increment_view", {
      target_table: data.target,
      target_id: data.id,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================================================
// Admin: allocations
// ============================================================
const scopeSchema = z.enum(["pieces", "artists"]);
const tableFor = (scope: "pieces" | "artists") =>
  scope === "pieces" ? "catalogue_allocations_pieces" : "catalogue_allocations_artists";

export const getAllocations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ scope: scopeSchema }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: rows, error } = await (await __get_admin())
      .from(tableFor(data.scope))
      .select("country, percent")
      .order("country");
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });

export const saveAllocations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        scope: scopeSchema,
        rows: z
          .array(
            z.object({
              country: z.string().min(1).max(64),
              percent: z.number().min(0).max(100),
            }),
          )
          .max(80),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const total = data.rows.reduce((s, r) => s + r.percent, 0);
    if (data.rows.length > 0 && Math.round(total) !== 100) {
      throw new Error(`Allocations must sum to 100% (got ${total.toFixed(1)}%).`);
    }
    const table = tableFor(data.scope);
    await (await __get_admin()).from(table).delete().not("country", "is", null);
    if (data.rows.length > 0) {
      const { error } = await (await __get_admin())
        .from(table)
        .insert(data.rows.map((r) => ({ country: r.country, percent: r.percent })));
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

// ============================================================
// Admin: ID lookup (UUID or short_code; auto-detect type)
// ============================================================
export const lookupById = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ query: z.string().min(1).max(64) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const q = data.query.trim();
    const isUuid = UUID_RE.test(q);
    const prefix = q.slice(0, 4).toUpperCase();

    // Try by short code prefix first
    if (!isUuid && (prefix === "ART-" || prefix === "PCE-" || prefix === "TXN-")) {
      if (prefix === "ART-") return { kind: "artist", payload: await loadArtist(q) };
      if (prefix === "PCE-") return { kind: "piece", payload: await loadPiece(q) };
      if (prefix === "TXN-") return { kind: "transaction", payload: await loadTxn(q) };
    }
    // Try UUID across all three tables.
    if (isUuid) {
      const [a, p, t] = await Promise.all([loadArtist(q), loadPiece(q), loadTxn(q)]);
      if (a) return { kind: "artist", payload: a };
      if (p) return { kind: "piece", payload: p };
      if (t) return { kind: "transaction", payload: t };
    }
    return { kind: "not_found", payload: null };
  });

async function loadArtist(idOrCode: string) {
  const key = matchKey(idOrCode);
  const { data: artist } = await (await __get_admin())
    .from("artists")
    .select("*")
    .eq(key, idOrCode)
    .maybeSingle();
  if (!artist) return null;
  const { data: works } = await (await __get_admin())
    .from("artworks")
    .select("id, short_code, title, lifecycle_status, view_count, price, currency, created_at")
    .eq("artist_id", artist.id)
    .order("created_at", { ascending: false });
  return { artist, works: works ?? [] };
}

async function loadPiece(idOrCode: string) {
  const key = matchKey(idOrCode);
  const { data: piece } = await (await __get_admin())
    .from("artworks")
    .select("*, artist:artists(id, short_code, name, country)")
    .eq(key, idOrCode)
    .maybeSingle();
  return piece ?? null;
}

async function loadTxn(idOrCode: string) {
  const key = matchKey(idOrCode);
  const { data: txn } = await (await __get_admin())
    .from("admin_transactions")
    .select("*")
    .eq(key, idOrCode)
    .maybeSingle();
  return txn ?? null;
}

// ============================================================
// Admin: transactions list (for the admin tab)
// ============================================================
export const listTransactions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await (await __get_admin())
      .from("admin_transactions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return { rows: data ?? [] };
  });
