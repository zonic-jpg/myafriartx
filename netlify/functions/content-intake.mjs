/**
 * Netlify Function — Content Intake Studio backend.
 * POST /api/content-intake  { action, ...payload }
 * Auth: EITHER a Bearer Supabase JWT for a user with an admin row in
 *   user_roles (verified via anon key, same two-step pattern as
 *   stage-room.mjs) OR the site's existing "orbit" admin gate password
 *   (see src/lib/adminGate.ts), sent as `x-admin-gate-password`. The gate
 *   path exists because production has zero rows in auth.users today — the
 *   real admin/owner signs in through that client-side password gate, not
 *   Supabase auth, so a JWT-only check would lock them out entirely. The
 *   password list here MUST be kept in sync with adminGate.ts's
 *   ORBIT_ADMIN_PASSWORDS by hand — it's already public in the shipped
 *   client bundle, so duplicating it server-side adds no new exposure.
 *   staged_by is nullable for exactly this reason: gate-mode actions have
 *   no real auth.users id to attribute them to.
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_PUBLISHABLE_KEY
 *      (or VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY / VITE_SUPABASE_PUBLISHABLE_KEY).
 *
 * Actions:
 *   listArtists            -> { artists: [...] }
 *   createArtist           { name, bio?, country?, portrait_url? } -> { artist }
 *   updateArtist           { id, ...fields } -> { artist }   (incl. exhibition_interest, exhibition_notes)
 *   exhibitionInterest     -> { groups: [{ notes, artists: [{id,name}] }] }  (admin-only aggregate view)
 *   enrichImage            { imageBase64, mediaType, categories, noun?, appName? } -> AI catalogue fields + imageUrl
 *                          (moved here from ai.functions.ts's enrichContentImage — same prompt/logic,
 *                           just running behind a real Netlify Function instead of a dead server fn)
 *   bulkStage              { items: [...] } -> { ok, staged, received }
 *   listStagedForArtist    { artist_id } -> { items }
 *   listPendingQueue       -> { artists }
 *   approveArtistBatch     { artist_id } -> { ok, published, heldForVetting }
 *   deleteStagedItem       { id } -> { ok }
 */
import { createClient } from "@supabase/supabase-js";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-admin-gate-password",
  "Content-Type": "application/json",
};

// Mirrors src/lib/adminGate.ts's ORBIT_ADMIN_PASSWORDS exactly — see the
// file header comment above for why this exists and why duplicating it
// here is safe. Keep the two lists in sync if the password ever changes.
const ORBIT_ADMIN_PASSWORDS = new Set(["admintester1", "admin123", "rubbaxadmin1"]);

function respond(status, body) {
  return { statusCode: status, headers: cors, body: JSON.stringify(body) };
}

function env(...keys) {
  for (const k of keys) {
    const v = process.env[k];
    if (v && String(v).trim()) return String(v).trim();
  }
  return "";
}

const MEDIA = [
  "oil",
  "watercolor",
  "pastel",
  "sculpture",
  "photograph",
  "print",
  "mixed_media",
  "acrylic",
  "drawing",
];

function badRequest(msg) {
  const e = new Error(msg);
  e.status = 400;
  return e;
}

function assertString(v, field, { max = 4000, required = true } = {}) {
  if (v === undefined || v === null || v === "") {
    if (required) throw badRequest(`${field} required`);
    return undefined;
  }
  if (typeof v !== "string" || v.length > max) throw badRequest(`${field} invalid`);
  return v;
}

function assertUuid(v, field) {
  const s = assertString(v, field, { max: 64 });
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) {
    throw badRequest(`${field} must be a uuid`);
  }
  return s;
}

function normalizeItem(raw, userId) {
  if (!raw || typeof raw !== "object") throw badRequest("invalid item");
  const title = assertString(raw.title, "title", { max: 300 });
  const artist_id = assertUuid(raw.artist_id, "artist_id");
  const medium = raw.medium !== undefined ? assertString(raw.medium, "medium", { max: 40 }) : undefined;
  if (medium && !MEDIA.includes(medium)) throw badRequest(`medium must be one of ${MEDIA.join(", ")}`);
  return {
    source_name: raw.source_name !== undefined ? assertString(raw.source_name, "source_name", { max: 300, required: false }) : undefined,
    image_hash: raw.image_hash !== undefined ? assertString(raw.image_hash, "image_hash", { max: 128, required: false }) : undefined,
    image_url: raw.image_url !== undefined ? assertString(raw.image_url, "image_url", { max: 2000, required: false }) : undefined,
    title,
    category: raw.category !== undefined ? assertString(raw.category, "category", { max: 120, required: false }) : undefined,
    subcategory: raw.subcategory !== undefined ? assertString(raw.subcategory, "subcategory", { max: 120, required: false }) : undefined,
    description: raw.description !== undefined ? assertString(raw.description, "description", { max: 4000, required: false }) : undefined,
    attributes: raw.attributes && typeof raw.attributes === "object" ? raw.attributes : {},
    cultural_tags: Array.isArray(raw.cultural_tags) ? raw.cultural_tags.slice(0, 20).map((t) => String(t).slice(0, 60)) : [],
    price_band: raw.price_band !== undefined ? assertString(raw.price_band, "price_band", { max: 120, required: false }) : undefined,
    needs_vetting: !!raw.needs_vetting,
    confidence: typeof raw.confidence === "number" ? Math.max(0, Math.min(1, raw.confidence)) : undefined,
    artist_id,
    medium,
    year: raw.year !== undefined ? assertString(raw.year, "year", { max: 20, required: false }) : undefined,
    origin: raw.origin !== undefined ? assertString(raw.origin, "origin", { max: 200, required: false }) : undefined,
    staged_by: userId,
    status: "pending_publish",
  };
}

async function listArtists(admin) {
  const { data, error } = await admin
    .from("artists")
    .select("id,name,bio,country,portrait_url,content_source,exhibition_interest,exhibition_notes,created_at")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return { artists: data ?? [] };
}

async function createArtist(admin, data) {
  const name = assertString(data.name, "name", { max: 300 });
  const row = {
    name,
    bio: data.bio !== undefined ? assertString(data.bio, "bio", { max: 4000, required: false }) : undefined,
    country: data.country !== undefined ? assertString(data.country, "country", { max: 120, required: false }) : undefined,
    portrait_url: data.portrait_url !== undefined ? assertString(data.portrait_url, "portrait_url", { max: 2000, required: false }) : undefined,
    content_source: "live",
  };
  const { data: ins, error } = await admin.from("artists").insert(row).select().single();
  if (error) throw new Error(error.message);
  return { artist: ins };
}

async function updateArtist(admin, data) {
  const id = assertUuid(data.id, "id");
  const patch = {};
  if (data.name !== undefined) patch.name = assertString(data.name, "name", { max: 300 });
  if (data.bio !== undefined) patch.bio = assertString(data.bio, "bio", { max: 4000, required: false }) ?? null;
  if (data.country !== undefined) patch.country = assertString(data.country, "country", { max: 120, required: false }) ?? null;
  if (data.portrait_url !== undefined) patch.portrait_url = assertString(data.portrait_url, "portrait_url", { max: 2000, required: false }) ?? null;
  if (data.exhibition_interest !== undefined) patch.exhibition_interest = !!data.exhibition_interest;
  if (data.exhibition_notes !== undefined) patch.exhibition_notes = assertString(data.exhibition_notes, "exhibition_notes", { max: 1000, required: false }) ?? null;
  if (!Object.keys(patch).length) throw badRequest("no fields to update");
  const { data: upd, error } = await admin.from("artists").update(patch).eq("id", id).select().single();
  if (error) throw new Error(error.message);
  return { artist: upd };
}

/** Admin-only aggregate: artists opted into exhibition cost-sharing, grouped by
 * their free-text target (so admin can spot "2+ artists interested in Dakar Biennale"
 * at a glance) — no public form, per the confirmed design. */
async function exhibitionInterest(admin) {
  const { data, error } = await admin
    .from("artists")
    .select("id,name,exhibition_notes")
    .eq("exhibition_interest", true)
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  const groups = new Map();
  for (const a of data ?? []) {
    const key = (a.exhibition_notes || "").trim() || "Unspecified / general interest";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ id: a.id, name: a.name });
  }
  return {
    groups: [...groups.entries()].map(([notes, artists]) => ({ notes, artists })),
    total: (data ?? []).length,
  };
}

function parseLoose(txt) {
  const clean = (txt || "").replace(/```json/gi, "").replace(/```/g, "").trim();
  const a = clean.indexOf("{");
  const b = clean.lastIndexOf("}");
  if (a === -1 || b === -1) return null;
  try {
    return JSON.parse(clean.slice(a, b + 1));
  } catch {
    return null;
  }
}

async function anthropic(body) {
  const key = env("AI_API_KEY", "ANTHROPIC_API_KEY");
  if (!key) throw new Error("AI_API_KEY not configured");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `Anthropic ${res.status}`);
  return (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
}

/**
 * Content intake: upload a consented image to storage (service role) AND enrich
 * it with a vision model — all server-side, so the AI key never reaches the
 * browser. Returns catalogue attributes + the stored public image URL.
 * Ported verbatim (prompt + storage path scheme) from the old dead server fn.
 */
async function enrichImage(admin, data) {
  const imageBase64 = assertString(data.imageBase64, "imageBase64", { max: 10_000_000 });
  const mediaType = assertString(data.mediaType, "mediaType", { max: 60 });
  const categories = Array.isArray(data.categories) && data.categories.length ? data.categories : ["Painting"];
  const noun = data.noun ? assertString(data.noun, "noun", { max: 60, required: false }) : "item";
  const appName = data.appName ? assertString(data.appName, "appName", { max: 60, required: false }) : "MyAfriArt";

  const ext = (mediaType.split("/")[1] || "jpg").replace("+xml", "");
  const path = `intake/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const bytes = Buffer.from(imageBase64, "base64");
  const up = await admin.storage.from("content-intake").upload(path, bytes, { contentType: mediaType, upsert: false });
  if (up.error) throw new Error(up.error.message);
  const { data: pub } = admin.storage.from("content-intake").getPublicUrl(path);

  const prompt =
    `You are a cataloguing assistant for ${appName}, an African creative marketplace. ` +
    `Analyse this ${noun} image for a listing. Return ONLY strict JSON:\n` +
    `{"title":string,"category":one of ${JSON.stringify(categories)},"subcategory":string,` +
    `"description":string (2 warm, specific sentences),"attributes":{"materials":string,"colors":string,` +
    `"style":string,"originGuess":string,"dimensionsEstimate":string},"culturalTags":string[],` +
    `"suggestedPriceBand":string (Naira range),"quality":string[] (any of "low_resolution","watermarked","blurry","cluttered_background","ok"),` +
    `"needsVetting":boolean (true if it shows a real person, brand logo, currency, or a claim needing checks),` +
    `"confidence":number 0..1,"note":string}\n` +
    `Never invent a brand or a real person's identity. If unsure, lower confidence.`;
  const txt = await anthropic({
    model: "claude-sonnet-4-6",
    max_tokens: 700,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
          { type: "text", text: prompt },
        ],
      },
    ],
  });
  const ai = parseLoose(txt);
  if (!ai) throw new Error("Enrichment failed to parse");
  return { ...ai, imageUrl: pub.publicUrl };
}

async function bulkStage(admin, data, userId) {
  if (!Array.isArray(data.items) || !data.items.length) throw badRequest("items required");
  if (data.items.length > 200) throw badRequest("max 200 items per batch");
  const rows = data.items.map((raw) => normalizeItem(raw, userId));
  const { data: ins, error } = await admin
    .from("content_staging")
    .upsert(rows, { onConflict: "image_hash", ignoreDuplicates: true })
    .select("id");
  if (error) throw new Error(error.message);
  return { ok: true, staged: ins?.length ?? 0, received: rows.length };
}

async function listStagedForArtist(admin, data) {
  const artist_id = assertUuid(data.artist_id, "artist_id");
  const { data: rows, error } = await admin
    .from("content_staging")
    .select("*")
    .eq("artist_id", artist_id)
    .eq("status", "pending_publish")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return { items: rows ?? [] };
}

async function listPendingQueue(admin) {
  const { data: rows, error } = await admin
    .from("content_staging")
    .select("id,artist_id,image_url,title,needs_vetting,created_at")
    .eq("status", "pending_publish")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  const artistIds = [...new Set((rows ?? []).map((r) => r.artist_id).filter(Boolean))];
  const { data: artists } = artistIds.length
    ? await admin.from("artists").select("id,name,portrait_url").in("id", artistIds)
    : { data: [] };
  const byArtist = new Map();
  for (const r of rows ?? []) {
    if (!r.artist_id) continue;
    if (!byArtist.has(r.artist_id)) {
      const a = artists?.find((x) => x.id === r.artist_id);
      byArtist.set(r.artist_id, {
        id: r.artist_id,
        name: a?.name ?? "Unknown artist",
        portrait_url: a?.portrait_url ?? null,
        items: [],
      });
    }
    byArtist.get(r.artist_id).items.push(r);
  }
  return { artists: [...byArtist.values()] };
}

async function approveArtistBatch(admin, data) {
  const artist_id = assertUuid(data.artist_id, "artist_id");
  const { data: rows, error } = await admin
    .from("content_staging")
    .select("*")
    .eq("artist_id", artist_id)
    .eq("status", "pending_publish");
  if (error) throw new Error(error.message);
  if (!rows?.length) return { ok: true, published: 0, heldForVetting: 0 };

  const ready = rows.filter((r) => !r.needs_vetting && r.image_url);
  const held = rows.length - ready.length;
  if (!ready.length) return { ok: true, published: 0, heldForVetting: held };

  const artworkRows = ready.map((r) => ({
    artist_id,
    title: r.title,
    medium: MEDIA.includes(r.medium) ? r.medium : "mixed_media",
    year: r.year ?? null,
    image_url: r.image_url,
    description: r.description ?? null,
    origin: r.origin ?? null,
  }));
  const { error: insErr } = await admin.from("artworks").insert(artworkRows);
  if (insErr) throw new Error(insErr.message);

  const { error: updErr } = await admin
    .from("content_staging")
    .update({ status: "published" })
    .in("id", ready.map((r) => r.id));
  if (updErr) throw new Error(updErr.message);

  return { ok: true, published: ready.length, heldForVetting: held };
}

async function deleteStagedItem(admin, data) {
  const id = assertUuid(data.id, "id");
  const { error } = await admin
    .from("content_staging")
    .delete()
    .eq("id", id)
    .eq("status", "pending_publish");
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function handler(event) {
  try {
    if (event.httpMethod === "OPTIONS") {
      return { statusCode: 204, headers: cors, body: "" };
    }
    if (event.httpMethod !== "POST") {
      return respond(405, { error: "POST JSON to /api/content-intake" });
    }

    let body = {};
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return respond(400, { error: "Invalid JSON" });
    }

    const action = body.action;
    const VALID_ACTIONS = [
      "listArtists",
      "createArtist",
      "updateArtist",
      "exhibitionInterest",
      "enrichImage",
      "bulkStage",
      "listStagedForArtist",
      "listPendingQueue",
      "approveArtistBatch",
      "deleteStagedItem",
    ];
    if (!VALID_ACTIONS.includes(action)) {
      return respond(400, { error: `action must be one of ${VALID_ACTIONS.join(", ")}` });
    }

    const supabaseUrl = env("SUPABASE_URL", "VITE_SUPABASE_URL");
    const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = env("SUPABASE_PUBLISHABLE_KEY", "VITE_SUPABASE_ANON_KEY", "VITE_SUPABASE_PUBLISHABLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      return respond(500, { error: "Server not configured: missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY" });
    }

    // Every action here is admin-only. Two independent ways in — either is
    // sufficient (see the file header for why both exist):
    //   1) A real Supabase JWT for a user with an admin row in user_roles.
    //   2) The site's existing gate password, sent as x-admin-gate-password.
    const admin = createClient(supabaseUrl, serviceKey);
    let userId = null;
    let authorized = false;

    const gatePassword = String(
      event.headers["x-admin-gate-password"] || event.headers["X-Admin-Gate-Password"] || "",
    )
      .trim()
      .toLowerCase();
    if (gatePassword && ORBIT_ADMIN_PASSWORDS.has(gatePassword)) {
      authorized = true;
    }

    if (!authorized) {
      const authHeader = event.headers.authorization || event.headers.Authorization || "";
      const token = authHeader.replace(/^Bearer\s+/i, "").trim();
      if (token && anonKey) {
        const userClient = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: userData } = await userClient.auth.getUser();
        userId = userData?.user?.id || null;
        if (userId) {
          const { data: roleRow } = await admin
            .from("user_roles")
            .select("id")
            .eq("user_id", userId)
            .eq("role", "admin")
            .maybeSingle();
          if (roleRow) authorized = true;
        }
      }
    }

    if (!authorized) {
      return respond(401, { error: "Unauthorized: sign in as an admin, or use the admin gate password" });
    }

    switch (action) {
      case "listArtists":
        return respond(200, await listArtists(admin));
      case "createArtist":
        return respond(200, await createArtist(admin, body));
      case "updateArtist":
        return respond(200, await updateArtist(admin, body));
      case "exhibitionInterest":
        return respond(200, await exhibitionInterest(admin));
      case "enrichImage":
        return respond(200, await enrichImage(admin, body));
      case "bulkStage":
        return respond(200, await bulkStage(admin, body, userId));
      case "listStagedForArtist":
        return respond(200, await listStagedForArtist(admin, body));
      case "listPendingQueue":
        return respond(200, await listPendingQueue(admin));
      case "approveArtistBatch":
        return respond(200, await approveArtistBatch(admin, body));
      case "deleteStagedItem":
        return respond(200, await deleteStagedItem(admin, body));
      default:
        return respond(400, { error: "Unhandled action" });
    }
  } catch (e) {
    const status = e?.status && Number.isInteger(e.status) ? e.status : 500;
    console.error("[content-intake]", e);
    return respond(status, { error: e?.message || "Internal content-intake error" });
  }
}
