// NotifyMe server functions: preferences, reels, sponsor panes, generator.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// De-Lovabled build: server-only deps loaded lazily so they never enter the
// client bundle (TanStack Start import-protection). Handlers still run server-side.
const __get_admin = () =>
  import("@/integrations/supabase/client.server").then((m) => m.supabaseAdmin);
const assertAdmin = async (...__a: any[]): Promise<any> =>
  ((await import("./auth-helpers.server")).assertAdmin as any)(...__a);

const MEDIA = [
  "oil",
  "watercolor",
  "pastel",
  "sculpture",
  "photograph",
  "print",
  "mixed_media",
] as const;
const GENDERS = ["male", "female", "other"] as const;
const REEL_ARTWORK_COUNT = 10;
const REEL_SPONSOR_COUNT = 2;
const SPONSOR_POSITIONS = [4, 9]; // 1-based positions in the 12-pane reel.
const DEFAULT_MAX_FREQ = 3;

// ---------- helpers ----------
async function getMaxFreq(): Promise<number> {
  const { data } = await (await __get_admin())
    .from("app_settings")
    .select("value")
    .eq("key", "notify_max_freq_per_week")
    .maybeSingle();
  const v = data?.value;
  const n = typeof v === "number" ? v : typeof v === "string" ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) && n > 0 && n <= 14 ? n : DEFAULT_MAX_FREQ;
}

function ageToDob(min?: number | null, max?: number | null) {
  const today = new Date();
  const yr = today.getUTCFullYear();
  // "age min" means born no later than (year - min); "age max" means born no earlier than (year - max - 1) + 1.
  const oldestBirth = max != null ? `${yr - max - 1}-01-01` : null;
  const newestBirth = min != null ? `${yr - min}-12-31` : null;
  return { oldestBirth, newestBirth };
}

// ---------- preferences ----------
export const getNotifyPreferences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const max = await getMaxFreq();
    const { data, error } = await context.supabase
      .from("notify_preferences")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { preferences: data ?? null, maxFrequencyPerWeek: max };
  });

const PrefsIn = z.object({
  enabled: z.boolean(),
  frequency_per_week: z.number().int().min(1).max(14),
  categories: z.array(z.enum(MEDIA)).max(7),
  countries: z.array(z.string().min(1).max(64)).max(40),
  genders: z.array(z.enum(GENDERS)).max(3),
  artist_age_min: z.number().int().min(0).max(120).nullable(),
  artist_age_max: z.number().int().min(0).max(120).nullable(),
  price_min: z.number().min(0).max(100_000_000).nullable(),
  price_max: z.number().min(0).max(100_000_000).nullable(),
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .default("USD"),
});

export const upsertNotifyPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => PrefsIn.parse(d))
  .handler(async ({ data, context }) => {
    const max = await getMaxFreq();
    const freq = Math.min(data.frequency_per_week, max);
    const patch = {
      ...data,
      frequency_per_week: freq,
      user_id: context.userId,
      updated_at: new Date().toISOString(),
    };
    const { error } = await context.supabase
      .from("notify_preferences")
      .upsert(patch, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true, frequency_per_week: freq };
  });

// ---------- reels list / detail ----------
export const listMyReels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("notify_reels")
      .select("id, status, delivered_at, viewed_at, email_sent_at, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return { reels: data ?? [], unread: (data ?? []).filter((r: any) => !r.viewed_at).length };
  });

export const getReel = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: reel, error: rerr } = await context.supabase
      .from("notify_reels")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (rerr) throw new Error(rerr.message);
    if (!reel) return { reel: null, panes: [] };

    const { data: panes } = await context.supabase
      .from("notify_reel_panes")
      .select("position, kind, artwork_id, sponsor_pane_id")
      .eq("reel_id", data.id)
      .order("position");

    const artworkIds = (panes ?? []).filter((p: any) => p.artwork_id).map((p: any) => p.artwork_id);
    const sponsorIds = (panes ?? [])
      .filter((p: any) => p.sponsor_pane_id)
      .map((p: any) => p.sponsor_pane_id);

    const [{ data: arts }, { data: sponsors }] = await Promise.all([
      artworkIds.length
        ? (await __get_admin())
            .from("artworks")
            .select(
              "id, short_code, title, image_url, price, currency, medium, year, artist:artists(id, short_code, name, country)",
            )
            .in("id", artworkIds)
        : Promise.resolve({ data: [] as any[] }),
      sponsorIds.length
        ? (await __get_admin())
            .from("sponsor_panes")
            .select("id, image_url, headline, link_url")
            .in("id", sponsorIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const artMap = new Map((arts ?? []).map((a: any) => [a.id, a]));
    const sponsorMap = new Map((sponsors ?? []).map((s: any) => [s.id, s]));

    const fullPanes = (panes ?? []).map((p: any) => ({
      position: p.position,
      kind: p.kind,
      artwork: p.kind === "artwork" ? (artMap.get(p.artwork_id) ?? null) : null,
      sponsor: p.kind === "sponsor" ? (sponsorMap.get(p.sponsor_pane_id) ?? null) : null,
    }));

    return { reel, panes: fullPanes };
  });

export const markReelViewed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const now = new Date().toISOString();
    const { error } = await context.supabase
      .from("notify_reels")
      .update({ status: "viewed", viewed_at: now, delivered_at: now })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markReelDelivered = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("notify_reels")
      .update({ status: "delivered", delivered_at: new Date().toISOString() })
      .eq("id", data.id)
      .is("delivered_at", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getUndeliveredReel = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("notify_reels")
      .select("id")
      .eq("user_id", context.userId)
      .is("viewed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return { reelId: data?.id ?? null };
  });

// ---------- generator (admin or service-role contexts) ----------
// Shared generator core: assumes caller has authority. Returns reel id.
export async function generateReelForUser(userId: string): Promise<string | null> {
  const { data: prefs } = await (await __get_admin())
    .from("notify_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (!prefs || !prefs.enabled) return null;

  // Build artwork query with joined artist filters.
  let q = (await __get_admin())
    .from("artworks")
    .select("id, price, currency, medium, artist:artists!inner(id, country, gender, date_of_birth)")
    .eq("is_active", true)
    .eq("lifecycle_status", "in_catalogue")
    .limit(400);

  if (prefs.categories?.length) q = q.in("medium", prefs.categories);
  if (prefs.price_min != null) q = q.gte("price", prefs.price_min);
  if (prefs.price_max != null) q = q.lte("price", prefs.price_max);
  if (prefs.countries?.length) q = q.in("artist.country", prefs.countries);
  if (prefs.genders?.length) q = q.in("artist.gender", prefs.genders);

  const { oldestBirth, newestBirth } = ageToDob(prefs.artist_age_min, prefs.artist_age_max);
  if (oldestBirth) q = q.gte("artist.date_of_birth", oldestBirth);
  if (newestBirth) q = q.lte("artist.date_of_birth", newestBirth);

  const { data: candidates } = await q;
  const pool = (candidates ?? []).filter((c: any) => c.artist);
  if (pool.length === 0) return null;

  // Shuffle and take REEL_ARTWORK_COUNT.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const artworks = pool.slice(0, REEL_ARTWORK_COUNT);
  if (artworks.length === 0) return null;

  // Sponsor panes (weighted random).
  const { data: sp } = await (await __get_admin())
    .from("sponsor_panes")
    .select("id, weight")
    .eq("is_active", true);
  const sponsors = (sp ?? []) as any[];
  const sponsorPicks: string[] = [];
  for (let i = 0; i < REEL_SPONSOR_COUNT; i++) {
    if (sponsors.length === 0) break;
    const totalW = sponsors.reduce((s, x) => s + Math.max(1, x.weight), 0);
    let r = Math.random() * totalW;
    let pickIdx = 0;
    for (let k = 0; k < sponsors.length; k++) {
      r -= Math.max(1, sponsors[k].weight);
      if (r <= 0) {
        pickIdx = k;
        break;
      }
    }
    sponsorPicks.push(sponsors[pickIdx].id);
    sponsors.splice(pickIdx, 1); // unique within reel if pool allows
  }

  // Build 12 ordered panes with sponsor positions at 4 and 9.
  const panes: {
    position: number;
    kind: "artwork" | "sponsor";
    artwork_id: string | null;
    sponsor_pane_id: string | null;
  }[] = [];
  let artIdx = 0;
  for (let pos = 1; pos <= 12; pos++) {
    const sIdx = SPONSOR_POSITIONS.indexOf(pos);
    if (sIdx !== -1 && sponsorPicks[sIdx]) {
      panes.push({
        position: pos,
        kind: "sponsor",
        artwork_id: null,
        sponsor_pane_id: sponsorPicks[sIdx],
      });
    } else if (artIdx < artworks.length) {
      panes.push({
        position: pos,
        kind: "artwork",
        artwork_id: artworks[artIdx].id,
        sponsor_pane_id: null,
      });
      artIdx++;
    }
  }

  const { data: reel, error: rerr } = await (await __get_admin())
    .from("notify_reels")
    .insert({ user_id: userId, status: "queued" })
    .select("id")
    .single();
  if (rerr) throw new Error(rerr.message);

  const { error: perr } = await (await __get_admin())
    .from("notify_reel_panes")
    .insert(panes.map((p) => ({ ...p, reel_id: reel.id })));
  if (perr) throw new Error(perr.message);
  return reel.id;
}

// Manual trigger for the signed-in user (used by "Send me a sample" button).
export const generateMyReelNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const id = await generateReelForUser(context.userId);
    return { reelId: id };
  });

// ---------- sponsor panes (admin) ----------
export const adminListSponsorPanes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await (await __get_admin())
      .from("sponsor_panes")
      .select("*")
      .order("sort_order")
      .order("created_at");
    if (error) throw new Error(error.message);
    return { panes: data ?? [] };
  });

const SponsorIn = z.object({
  id: z.string().uuid().optional(),
  image_url: z.string().url(),
  headline: z.string().max(200).nullable().optional(),
  link_url: z.string().url().nullable().optional(),
  is_active: z.boolean().default(true),
  weight: z.number().int().min(0).max(100).default(1),
  sort_order: z.number().int().min(0).max(999).default(0),
});
export const adminSaveSponsorPane = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SponsorIn.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { id, ...patch } = data;
    const q = id
      ? await (await __get_admin())
          .from("sponsor_panes")
          .update(patch)
          .eq("id", id)
          .select()
          .single()
      : await (await __get_admin()).from("sponsor_panes").insert(patch).select().single();
    if (q.error) throw new Error(q.error.message);
    return q.data;
  });

export const adminDeleteSponsorPane = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await (await __get_admin()).from("sponsor_panes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- admin: max freq per week ----------
export const adminGetMaxFreq = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const value = await getMaxFreq();
    return { maxFrequencyPerWeek: value };
  });

export const adminSetMaxFreq = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ value: z.number().int().min(1).max(14) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await (await __get_admin()).from("app_settings").upsert({
      key: "notify_max_freq_per_week",
      value: data.value as any,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
