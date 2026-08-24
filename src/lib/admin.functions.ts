import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// De-Lovabled build: server-only deps loaded lazily so they never enter the
// client bundle (TanStack Start import-protection). Handlers still run server-side.
const __get_admin = () =>
  import("@/integrations/supabase/client.server").then((m) => m.supabaseAdmin);
const signRenderImageUrls = async (...__a: any[]): Promise<any> =>
  ((await import("./render-urls.server")).signRenderImageUrls as any)(...__a);
const assertAdmin = async (...__a: any[]): Promise<any> =>
  ((await import("./auth-helpers.server")).assertAdmin as any)(...__a);

function boolSetting(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

export const adminGetAll = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAdmin(userId);
    const [artists, artworks, styles, renders, panes, settings] = await Promise.all([
      supabase.from("artists").select("*").order("name"),
      supabase.from("artworks").select("*").order("title"),
      supabase.from("styles").select("*").order("sort_order"),
      supabase.from("renders").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("landing_panes").select("*").order("sort_order"),
      supabase.from("app_settings").select("key,value").in("key", ["mock_catalogue_enabled"]),
    ]);
    const signedRenders = await Promise.all((renders.data ?? []).map(signRenderImageUrls));
    const settingsMap = Object.fromEntries(
      (settings.data ?? []).map((row: any) => [row.key, row.value]),
    );
    return {
      artists: artists.data ?? [],
      artworks: artworks.data ?? [],
      styles: styles.data ?? [],
      renders: signedRenders,
      panes: panes.data ?? [],
      settings: {
        mock_catalogue_enabled: boolSetting(settingsMap.mock_catalogue_enabled, true),
      },
    };
  });

export const setMockCatalogueEnabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ enabled: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await (await __get_admin()).from("app_settings").upsert({
      key: "mock_catalogue_enabled",
      value: data.enabled as any,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setRenderFeatured = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        is_featured: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await context.supabase
      .from("renders")
      .update({ is_featured: data.is_featured })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteRender = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await context.supabase.from("renders").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const ArtistIn = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  bio: z.string().max(2000).nullable().optional(),
  era: z.string().max(100).nullable().optional(),
  country: z.string().max(100).nullable().optional(),
  alma_mater: z.string().max(200).nullable().optional(),
  portrait_url: z.string().url().nullable().optional(),
  content_source: z.enum(["live", "mock"]).default("live"),
  gender: z.string().max(20).nullable().optional(),
  domicile_city: z.string().max(100).nullable().optional(),
  date_of_birth: z.string().max(20).nullable().optional(),
  short_code: z.string().max(20).nullable().optional(),
});
export const saveArtist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ArtistIn.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { id, ...patch } = data;
    const q = id
      ? await context.supabase
          .from("artists")
          .update(patch as any)
          .eq("id", id)
          .select()
          .single()
      : await context.supabase
          .from("artists")
          .insert(patch as any)
          .select()
          .single();
    if (q.error) throw new Error(q.error.message);
    return q.data;
  });

export const deleteArtist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await context.supabase.from("artists").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const MEDIA = [
  "oil",
  "watercolor",
  "pastel",
  "sculpture",
  "photograph",
  "print",
  "mixed_media",
] as const;
const MAX_DECODED_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 80_000_000;
const IMAGE_CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};
const BLOCKED_TEXT_SIGNATURES = ["<svg", "<script", "javascript:", "<?php", "<html", "<!doctype"];

// Sniff the actual image type from magic bytes. Returns the canonical MIME or null.
function sniffImageMime(buf: Uint8Array): string | null {
  if (buf.length < 12) return null;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  )
    return "image/png";
  // WEBP: "RIFF"...."WEBP"
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  )
    return "image/webp";
  return null;
}

function readU32BE(buf: Uint8Array, offset: number) {
  return (
    ((buf[offset] << 24) | (buf[offset + 1] << 16) | (buf[offset + 2] << 8) | buf[offset + 3]) >>> 0
  );
}

function getImageDimensions(
  buf: Uint8Array,
  mime: string,
): { width: number; height: number } | null {
  if (mime === "image/png" && buf.length >= 24)
    return { width: readU32BE(buf, 16), height: readU32BE(buf, 20) };
  if (mime === "image/jpeg") {
    for (let i = 2; i + 9 < buf.length; ) {
      if (buf[i] !== 0xff) {
        i++;
        continue;
      }
      const marker = buf[i + 1];
      const len = (buf[i + 2] << 8) + buf[i + 3];
      if (len < 2) return null;
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { height: (buf[i + 5] << 8) + buf[i + 6], width: (buf[i + 7] << 8) + buf[i + 8] };
      }
      i += 2 + len;
    }
  }
  if (mime === "image/webp" && buf.length >= 30) {
    const chunk = String.fromCharCode(buf[12], buf[13], buf[14], buf[15]);
    if (chunk === "VP8X")
      return {
        width: 1 + buf[24] + (buf[25] << 8) + (buf[26] << 16),
        height: 1 + buf[27] + (buf[28] << 8) + (buf[29] << 16),
      };
    if (chunk === "VP8 " && buf.length >= 30)
      return {
        width: (buf[26] | (buf[27] << 8)) & 0x3fff,
        height: (buf[28] | (buf[29] << 8)) & 0x3fff,
      };
    if (chunk === "VP8L" && buf.length >= 25)
      return {
        width: 1 + (((buf[22] & 0x3f) << 8) | buf[21]),
        height: 1 + (((buf[24] & 0x0f) << 10) | (buf[23] << 2) | ((buf[22] & 0xc0) >> 6)),
      };
  }
  return null;
}

function assertImageSafe(buf: Uint8Array, mime: string) {
  const startsWith = (...bytes: number[]) => bytes.every((byte, index) => buf[index] === byte);
  if (
    startsWith(0x4d, 0x5a) ||
    startsWith(0x7f, 0x45, 0x4c, 0x46) ||
    startsWith(0x25, 0x50, 0x44, 0x46) ||
    startsWith(0x50, 0x4b, 0x03, 0x04) ||
    startsWith(0x52, 0x61, 0x72, 0x21) ||
    startsWith(0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c)
  )
    throw new Error("Image rejected: unsafe file signature detected.");
  const text = new TextDecoder("latin1")
    .decode(buf.slice(0, Math.min(buf.length, 2_000_000)))
    .toLowerCase();
  for (const sig of BLOCKED_TEXT_SIGNATURES) {
    if (text.includes(sig.toLowerCase()))
      throw new Error("Image rejected: unsafe embedded content detected.");
  }
  const dims = getImageDimensions(buf, mime);
  if (!dims || dims.width < 1 || dims.height < 1)
    throw new Error("Image rejected: dimensions could not be verified.");
  if (dims.width * dims.height > MAX_IMAGE_PIXELS)
    throw new Error("Image rejected: dimensions are too large to process safely.");
}

async function scanImageForMalware(buf: Uint8Array, filename: string, contentType: string) {
  assertImageSafe(buf, contentType);
  const apiKey = process.env.VIRUSTOTAL_API_KEY;
  if (!apiKey) return;
  const form = new FormData();
  const copy = new ArrayBuffer(buf.byteLength);
  new Uint8Array(copy).set(buf);
  form.append("file", new Blob([copy], { type: contentType }), filename);
  const upload = await fetch("https://www.virustotal.com/api/v3/files", {
    method: "POST",
    headers: { "x-apikey": apiKey },
    body: form,
  });
  if (!upload.ok) throw new Error("Image rejected: malware scanner is unavailable.");
  const uploaded: any = await upload.json();
  const analysisId = uploaded?.data?.id;
  if (!analysisId) throw new Error("Image rejected: malware scan could not start.");
  for (let i = 0; i < 8; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const res = await fetch(`https://www.virustotal.com/api/v3/analyses/${analysisId}`, {
      headers: { "x-apikey": apiKey },
    });
    if (!res.ok) throw new Error("Image rejected: malware scan could not complete.");
    const json: any = await res.json();
    const stats = json?.data?.attributes?.stats;
    if (stats && (stats.malicious > 0 || stats.suspicious > 0))
      throw new Error("Image rejected: malware detected.");
    if (json?.data?.attributes?.status === "completed") return;
  }
  throw new Error("Image rejected: malware scan timed out.");
}

const ArtworkIn = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  artist_id: z.string().uuid().nullable().optional(),
  medium: z.enum(MEDIA),
  year: z.string().max(20).nullable().optional(),
  image_url: z
    .union([z.string().url(), z.literal("")])
    .nullable()
    .optional()
    .transform((v) => v ?? ""),
  description: z.string().max(2000).nullable().optional(),
  is_active: z.boolean().default(true),
  content_source: z.enum(["live", "mock"]).default("live"),
  price: z.number().min(0).max(100_000_000).nullable().optional(),
  currency: z
    .string()
    .min(3)
    .max(3)
    .regex(/^[A-Z]{3}$/)
    .default("USD"),
  lifecycle_status: z.enum(["in_catalogue", "sold", "withdrawn"]).default("in_catalogue"),
});
export const saveArtwork = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ArtworkIn.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { id, ...patch } = data;
    const q = id
      ? await context.supabase
          .from("artworks")
          .update(patch as any)
          .eq("id", id)
          .select()
          .single()
      : await context.supabase
          .from("artworks")
          .insert(patch as any)
          .select()
          .single();
    if (q.error) throw new Error(q.error.message);
    return q.data;
  });

export const deleteArtwork = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await context.supabase.from("artworks").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const StyleIn = z.object({
  id: z.string().uuid().optional(),
  slug: z
    .string()
    .min(1)
    .max(60)
    .regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable().optional(),
  prompt_fragment: z.string().min(1).max(1000),
  sort_order: z.number().int().min(0).max(999).default(0),
  is_active: z.boolean().default(true),
});
export const saveStyle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => StyleIn.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { id, ...patch } = data;
    const q = id
      ? await context.supabase.from("styles").update(patch).eq("id", id).select().single()
      : await context.supabase.from("styles").insert(patch).select().single();
    if (q.error) throw new Error(q.error.message);
    return q.data;
  });

export const deleteStyle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await context.supabase.from("styles").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Upload an artwork image to storage (admin only). Returns public URL.
export const uploadArtworkImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        base64: z.string().min(100).max(20_000_000),
        filename: z.string().min(1).max(200),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const b64 = data.base64.includes(",") ? data.base64.split(",")[1] : data.base64;
    const bin = atob(b64);
    const buf = new Uint8Array(bin.length);
    if (buf.length > MAX_DECODED_IMAGE_BYTES)
      throw new Error("Image too large. Use a file under 10 MB.");
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    const ext = (data.filename.split(".").pop() || "").toLowerCase();
    const declaredType = IMAGE_CONTENT_TYPES[ext];
    if (!declaredType) throw new Error("Unsupported image format. Use JPG, PNG, or WEBP.");
    const sniffedType = sniffImageMime(buf);
    if (!sniffedType) throw new Error("File is not a recognised image. Use JPG, PNG, or WEBP.");
    if (sniffedType !== declaredType) {
      throw new Error("File contents do not match its extension. Use a real JPG, PNG, or WEBP.");
    }
    await scanImageForMalware(buf, data.filename, sniffedType);
    const path = `library/${crypto.randomUUID()}.${ext}`;
    const up = await (await __get_admin()).storage
      .from("artworks")
      .upload(path, buf, { contentType: sniffedType, upsert: false });

    if (up.error) {
      console.error("[admin] artwork upload error:", up.error.message);
      throw new Error("Artwork upload failed. Please try again.");
    }
    const { data: pub } = (await __get_admin()).storage.from("artworks").getPublicUrl(path);
    return { url: pub.publicUrl };
  });

export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await (await __get_admin())
      .from("user_roles")
      .select("id")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    return { isAdmin: !!data };
  });

// Image URL validation removed per user request.

const PaneIn = z.object({
  id: z.string().uuid().optional(),
  pane_id: z
    .string()
    .min(1)
    .max(60)
    .regex(/^[a-z0-9_-]+$/),
  kicker: z.string().min(1).max(120),
  title: z.string().min(1).max(200),
  summary: z.string().min(1).max(500),
  reveal: z.string().max(1000).default(""),
  image_url: z.string().url().nullable().optional(),
  image_url_mobile: z.string().url().nullable().optional(),
  sort_order: z.number().int().min(0).max(999).default(0),
  is_active: z.boolean().default(true),
  status: z.enum(["draft", "published"]).default("draft"),
});
export const savePane = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => PaneIn.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    // Image URL validation intentionally removed per user request.

    const { id, ...patch } = data;

    const q = id
      ? await context.supabase.from("landing_panes").update(patch).eq("id", id).select().single()
      : await context.supabase.from("landing_panes").insert(patch).select().single();
    if (q.error) throw new Error(q.error.message);
    return q.data;
  });

export const deletePane = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await context.supabase.from("landing_panes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reorderPanes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        order: z
          .array(z.object({ id: z.string().uuid(), sort_order: z.number().int().min(0).max(999) }))
          .min(1)
          .max(100),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    for (const row of data.order) {
      const { error } = await context.supabase
        .from("landing_panes")
        .update({ sort_order: row.sort_order })
        .eq("id", row.id);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const setPaneStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["draft", "published"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await context.supabase
      .from("landing_panes")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
