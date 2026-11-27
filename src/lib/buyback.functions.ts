import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireVerifiedMember } from "@/lib/kyc.functions";
import { sniffDocMime } from "@/lib/doc-sniff";

/** Anonymous, fire-and-forget report to the ZonicMe hub (no identity, names or prices). Server-only module, loaded on demand. */
async function zonicEmit(name: string, attrs: Record<string, string | number | boolean | null> = {}) {
  try {
    (await import("./zonic-egress.server")).zonicEmit(name, attrs);
  } catch {
    /* never blocks the request */
  }
}

/**
 * SELL WITH A BUYBACK OPTION — MyAfriArt is the venue only.
 *
 * What the platform does: checks the seller's identity, checks that proof of ownership was
 * uploaded, publishes the listing, records each step, and charges a flat listing fee.
 * What it never does: value the work, guarantee authenticity, hold the sale money, lend.
 * Buyer and seller pay each other directly and each confirms the other's step here.
 *
 * Every stage change goes through one database function (buyback_transition), which checks
 * who is asking and whether that step is allowed. This file only decides who may ask.
 */

export const BUYBACK_TERMS_VERSION = "bb-2026-11";

// The new tables are not in the generated types yet, so the admin client is used untyped here.
const db = async (): Promise<any> =>
  (await import("@/integrations/supabase/client.server")).supabaseAdmin;

async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await (await db()).from("user_roles").select("id").eq("user_id", userId).eq("role", "admin").maybeSingle();
  return !!data;
}
async function assertAdmin(userId: string) {
  if (!(await isAdmin(userId))) throw new Error("Forbidden: admin only");
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Admin-set rules. The database enforces the outer limits (14 to 365 days, at most double the price). */
async function readSettings() {
  const { data } = await (await db())
    .from("app_settings")
    .select("key, value")
    .in("key", ["buyback_fee_ngn", "buyback_buyer_fee_ngn", "buyback_exercise_fee_ngn", "buyback_max_uplift_percent", "buyback_min_days", "buyback_max_days"]);
  const m = new Map<string, unknown>((data ?? []).map((r: { key: string; value: unknown }) => [r.key, r.value]));
  const num = (k: string, d: number) => {
    const n = Number(m.get(k));
    return Number.isFinite(n) ? n : d;
  };
  const minDays = clamp(Math.round(num("buyback_min_days", 14)), 14, 365);
  return {
    feeNgn: Math.max(0, Math.round(num("buyback_fee_ngn", 0))),
    buyerFeeNgn: Math.max(0, Math.round(num("buyback_buyer_fee_ngn", 0))),
    exerciseFeeNgn: Math.max(0, Math.round(num("buyback_exercise_fee_ngn", 0))),
    maxUpliftPercent: clamp(num("buyback_max_uplift_percent", 20), 0, 100),
    minDays,
    maxDays: clamp(Math.round(num("buyback_max_days", 180)), minDays, 365),
    termsVersion: BUYBACK_TERMS_VERSION,
  };
}

export const getBuybackConfig = createServerFn({ method: "GET" }).handler(async () => readSettings());

// ---------- uploads (artwork photo is public; proof of ownership is private) ----------
const FILE_TYPES: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", pdf: "application/pdf",
};

export const uploadBuybackFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      kind: z.enum(["image", "proof"]),
      base64: z.string().min(100).max(5_600_000),
      filename: z.string().min(1).max(200),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const b64 = data.base64.includes(",") ? data.base64.split(",")[1] : data.base64;
    const bin = atob(b64);
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    const ext = (data.filename.split(".").pop() || "").toLowerCase();
    const declared = FILE_TYPES[ext];
    if (!declared || (data.kind === "image" && declared === "application/pdf"))
      throw new Error(data.kind === "image" ? "Use a JPG, PNG or WebP photo." : "Use a JPG, PNG, WebP or PDF document.");
    // The file's real contents must match its name, so nothing else can be smuggled in.
    if (sniffDocMime(buf) !== declared) throw new Error("File contents do not match its extension.");
    const admin = await db();
    const path = `buyback/${context.userId}/${crypto.randomUUID()}.${ext}`;
    const bucket = data.kind === "image" ? "listings" : "kyc";
    const up = await admin.storage.from(bucket).upload(path, buf, { contentType: declared, upsert: false });
    if (up.error) throw new Error("Upload failed. Please try again.");
    if (data.kind === "proof") return { kind: "proof" as const, path, url: null };
    return { kind: "image" as const, path, url: admin.storage.from(bucket).getPublicUrl(path).data.publicUrl as string };
  });

// ---------- seller: list a work ----------
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Artist or collector? Decided here, not by the seller's choice alone. */
async function sellerIsTheArtist(userId: string, artistName: string, declared: boolean): Promise<boolean> {
  if (declared) return true;
  const admin = await db();
  const target = norm(artistName);
  const { data: prof } = await admin.from("profiles").select("display_name").eq("id", userId).maybeSingle();
  if (prof?.display_name && norm(prof.display_name) === target) return true;
  const { data: claims } = await admin
    .from("legacy_myafriart_artists")
    .select("full_name, matched_artist_id")
    .eq("claimed_profile_id", userId);
  for (const c of claims ?? []) {
    if (c.full_name && norm(c.full_name) === target) return true;
    if (c.matched_artist_id) {
      const { data: a } = await admin.from("artists").select("name").eq("id", c.matched_artist_id).maybeSingle();
      if (a?.name && norm(a.name) === target) return true;
    }
  }
  return false;
}

export const createBuybackOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      title: z.string().trim().min(2).max(200),
      artistName: z.string().trim().min(2).max(160),
      iAmTheArtist: z.boolean().default(false),
      medium: z.string().trim().max(120).optional().nullable(),
      year: z.number().int().min(1000).max(2100).optional().nullable(),
      widthCm: z.number().positive().max(100000).optional().nullable(),
      heightCm: z.number().positive().max(100000).optional().nullable(),
      depthCm: z.number().positive().max(100000).optional().nullable(),
      edition: z.string().trim().max(80).optional().nullable(),
      description: z.string().trim().max(3000).optional().nullable(),
      provenance: z.string().trim().min(20, "Describe how you came to own this work (at least a sentence).").max(3000),
      imageUrl: z.string().url(),
      proofPath: z.string().max(300).optional().nullable(),
      priceNgn: z.number().int().min(1000),
      buybackPriceNgn: z.number().int().positive().optional().nullable(),
      buybackDays: z.number().int().positive().optional().nullable(),
      paymentInstructions: z.string().trim().min(10, "Tell the buyer how to pay you.").max(600),
      acceptTerms: z.literal(true, { errorMap: () => ({ message: "Please accept the terms to continue." }) }),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await (await import("./service-gate.server")).assertServiceAccess("collateral", context.userId, "Selling with a buyback option");
    await requireVerifiedMember(context.userId, "list a work for sale here");
    const uid = context.userId;
    const mine = `/buyback/${uid}/`;
    if (!data.imageUrl.includes(`/listings${mine}`)) throw new Error("Please upload the artwork photo again.");
    if (data.proofPath && !data.proofPath.startsWith(mine.slice(1))) throw new Error("Please upload the proof of ownership again.");

    const s = await readSettings();
    const artist = await sellerIsTheArtist(uid, data.artistName, data.iAmTheArtist);
    const wantsOption = data.buybackPriceNgn != null || data.buybackDays != null;
    if (artist && wantsOption)
      throw new Error("An artist's own work is sold as an ordinary sale, without a buyback option.");
    if (!artist && !data.proofPath)
      throw new Error("Upload proof that you own this work (a receipt, invoice or the artist's certificate).");
    if (wantsOption) {
      if (data.buybackPriceNgn == null || data.buybackDays == null)
        throw new Error("Enter both the buyback price and the number of days.");
      const ceiling = Math.floor(data.priceNgn * (1 + s.maxUpliftPercent / 100));
      if (data.buybackPriceNgn < data.priceNgn) throw new Error("The buyback price cannot be lower than the selling price.");
      if (data.buybackPriceNgn > ceiling)
        throw new Error(`The buyback price cannot be more than ₦${ceiling.toLocaleString()} (${s.maxUpliftPercent}% above the selling price).`);
      if (data.buybackDays < s.minDays || data.buybackDays > s.maxDays)
        throw new Error(`The buyback period must be between ${s.minDays} and ${s.maxDays} days.`);
    }

    const { data: row, error } = await (await db())
      .from("buyback_offers")
      .insert({
        seller_id: uid,
        seller_type: artist ? "artist" : "collector",
        title: data.title,
        artist_name: data.artistName,
        medium: data.medium || null,
        year: data.year ?? null,
        width_cm: data.widthCm ?? null,
        height_cm: data.heightCm ?? null,
        depth_cm: data.depthCm ?? null,
        edition: data.edition || null,
        description: data.description || null,
        provenance: data.provenance,
        image_url: data.imageUrl,
        proof_path: data.proofPath || null,
        payment_instructions: data.paymentInstructions,
        price_ngn: data.priceNgn,
        buyback_price_ngn: wantsOption ? data.buybackPriceNgn : null,
        buyback_days: wantsOption ? data.buybackDays : null,
        status: s.feeNgn > 0 ? "awaiting_fee" : "pending_review",
        fee_ngn: s.feeNgn,
        exercise_fee_ngn: wantsOption ? s.exerciseFeeNgn : 0,
        terms_version: BUYBACK_TERMS_VERSION,
        terms_accepted_at: new Date().toISOString(),
      })
      .select("id, short_code, status, fee_ngn")
      .single();
    if (error) throw new Error("We could not save this listing. Please check the details and try again.");
    await zonicEmit("buyback_listed", { seller_type: artist ? "artist" : "collector", has_buyback: data.buybackPriceNgn != null });
    return row as { id: string; short_code: string; status: string; fee_ngn: number };
  });

// ---------- what each viewer may see ----------
type Row = Record<string, any>;
const PUBLIC_FIELDS = [
  "id", "short_code", "title", "artist_name", "medium", "year", "width_cm", "height_cm", "depth_cm", "edition",
  "description", "provenance", "image_url", "price_ngn", "buyback_price_ngn", "buyback_days", "status", "seller_type", "created_at",
] as const;
const PARTY_FIELDS = [
  "reserved_until", "buyer_payment_ref", "buyer_paid_at", "paid_at", "handed_over_at", "carrier", "tracking_ref", "received_at",
  "option_expires_at", "exercise_ref", "exercise_sent_at", "option_exercised_at", "fee_ngn",
  "buyer_fee_ngn", "buyer_fee_paid_at", "exercise_fee_ngn", "exercise_fee_paid_at",
] as const;

function shape(r: Row, viewer: string | null, names: Map<string, string>) {
  const out: Row = {};
  for (const k of PUBLIC_FIELDS) out[k] = r[k];
  out.has_proof = !!r.proof_path;
  out.seller_name = names.get(r.seller_id) ?? "Member";
  out.role = viewer && r.seller_id === viewer ? "seller" : viewer && r.buyer_id === viewer ? "buyer" : "visitor";
  if (out.role === "visitor") return out;
  for (const k of PARTY_FIELDS) out[k] = r[k];
  out.buyer_name = r.buyer_id ? (names.get(r.buyer_id) ?? "Member") : null;
  // Fee gates: the other side's payment details stay hidden until the fee that unlocks them has cleared.
  if (out.role === "seller") {
    out.review_note = r.review_note;
    out.payment_instructions = r.payment_instructions;
    const exerciseUnlocked = !(Number(r.exercise_fee_ngn) > 0) || !!r.exercise_fee_paid_at;
    out.buyer_payout_note =
      ["sold", "exercise_sent", "option_exercised"].includes(r.status) && exerciseUnlocked ? r.buyer_payout_note : null;
  } else {
    out.payment_instructions = r.buyer_fee_paid_at ? r.payment_instructions : null;
    out.buyer_payout_note = r.buyer_payout_note;
  }
  return out;
}

async function namesFor(rows: Row[]): Promise<Map<string, string>> {
  const ids = Array.from(new Set(rows.flatMap((r) => [r.seller_id, r.buyer_id]).filter(Boolean)));
  if (!ids.length) return new Map();
  const { data } = await (await db()).from("profiles").select("id, display_name").in("id", ids);
  return new Map((data ?? []).map((p: { id: string; display_name: string | null }) => [p.id, p.display_name ?? "Member"]));
}

export const listBuybackMarket = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await db();
    await admin.rpc("buyback_tick"); // frees expired reservations, lapses expired options
    const { data, error } = await admin.from("buyback_offers").select("*").eq("status", "open").order("created_at", { ascending: false }).limit(200);
    if (error) throw new Error("Could not load the works on offer.");
    const names = await namesFor(data ?? []);
    return (data ?? []).map((r: Row) => shape(r, context.userId, names));
  });

export const listMyBuyback = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await db();
    await admin.rpc("buyback_tick");
    const { data, error } = await admin
      .from("buyback_offers")
      .select("*")
      .or(`seller_id.eq.${context.userId},buyer_id.eq.${context.userId}`)
      .order("updated_at", { ascending: false })
      .limit(200);
    if (error) throw new Error("Could not load your sales and purchases.");
    const names = await namesFor(data ?? []);
    return (data ?? []).map((r: Row) => shape(r, context.userId, names));
  });

const MEMBER_ACTIONS = [
  "withdraw", "confirm_payment", "hand_over", "exercise_send", "reserve", "release", "mark_paid", "confirm_receipt", "confirm_exercise",
] as const;

/** A seller or buyer takes their next step. The database decides whether it is allowed. */
export const buybackAct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      action: z.enum(MEMBER_ACTIONS),
      reference: z.string().trim().max(120).optional(),
      carrier: z.string().trim().max(120).optional(),
      note: z.string().trim().max(600).optional(),
      acceptTerms: z.boolean().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    if (data.action === "reserve") {
      if (!data.acceptTerms) throw new Error("Please accept the terms to continue.");
      await requireVerifiedMember(context.userId, "buy a work here");
    }
    const { data: res, error } = await (await db()).rpc("buyback_transition", {
      p_actor: context.userId,
      p_id: data.id,
      p_action: data.action,
      p_payload: {
        reference: data.reference ?? "",
        carrier: data.carrier ?? "",
        note: data.note ?? "",
        buyer_fee: data.action === "reserve" ? String((await readSettings()).buyerFeeNgn) : "0",
      },
    });
    if (error) throw new Error(error.message || "That step could not be completed.");
    await zonicEmit(`buyback_${data.action}`, { status: (res as { status?: string })?.status ?? null });
    return res as { id: string; status: string };
  });

// ---------- admin ----------
export const adminListBuyback = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const admin = await db();
    await admin.rpc("buyback_tick");
    const { data, error } = await admin.from("buyback_offers").select("*").order("created_at", { ascending: false }).limit(500);
    if (error) throw new Error(error.message);
    const names = await namesFor(data ?? []);
    return (data ?? []).map((r: Row) => ({
      ...r,
      proof_path: undefined,
      has_proof: !!r.proof_path,
      seller_name: names.get(r.seller_id) ?? "Member",
      buyer_name: r.buyer_id ? (names.get(r.buyer_id) ?? "Member") : null,
    }));
  });

export const adminBuybackProofUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const admin = await db();
    const { data: row } = await admin.from("buyback_offers").select("proof_path").eq("id", data.id).maybeSingle();
    if (!row?.proof_path) throw new Error("No proof of ownership was uploaded for this work.");
    const { data: signed, error } = await admin.storage.from("kyc").createSignedUrl(row.proof_path, 600);
    if (error || !signed?.signedUrl) throw new Error("Could not open the document.");
    return { url: signed.signedUrl as string };
  });

export const adminBuybackAct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      action: z.enum(["approve", "reject", "waive_fee", "admin_cancel", "admin_reopen"]),
      note: z.string().trim().max(1000).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: res, error } = await (await db()).rpc("buyback_transition", {
      p_actor: context.userId, p_id: data.id, p_action: data.action, p_payload: { note: data.note ?? "" },
    });
    if (error) throw new Error(error.message);
    await zonicEmit(`buyback_admin_${data.action}`, { status: (res as { status?: string })?.status ?? null });
    return res as { id: string; status: string };
  });

export const adminSetBuybackSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      feeNgn: z.number().int().min(0).max(10_000_000),
      buyerFeeNgn: z.number().int().min(0).max(10_000_000),
      exerciseFeeNgn: z.number().int().min(0).max(10_000_000),
      maxUpliftPercent: z.number().min(0).max(100),
      minDays: z.number().int().min(14).max(365),
      maxDays: z.number().int().min(14).max(365),
    }).refine((v) => v.maxDays >= v.minDays, "The longest period cannot be shorter than the shortest.").parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const now = new Date().toISOString();
    const { error } = await (await db()).from("app_settings").upsert([
      { key: "buyback_fee_ngn", value: data.feeNgn, updated_at: now },
      { key: "buyback_buyer_fee_ngn", value: data.buyerFeeNgn, updated_at: now },
      { key: "buyback_exercise_fee_ngn", value: data.exerciseFeeNgn, updated_at: now },
      { key: "buyback_max_uplift_percent", value: data.maxUpliftPercent, updated_at: now },
      { key: "buyback_min_days", value: data.minDays, updated_at: now },
      { key: "buyback_max_days", value: data.maxDays, updated_at: now },
    ]);
    if (error) throw new Error(error.message);
    return readSettings();
  });

// ---------- artist certificates ----------
export const CERT_DESIGNS = ["classic", "modern", "heritage"] as const;

export const adminListCertArtists = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await (await db())
      .from("artists")
      .select("id, name, short_code, cert_service_enabled, cert_brand_name, cert_logo_url, cert_design, cert_next_no")
      .order("name")
      .limit(2000);
    if (error) throw new Error(error.message);
    return (data ?? []) as Row[];
  });

export const adminSetArtistCertificate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      artistId: z.string().uuid(),
      enabled: z.boolean(),
      brandName: z.string().trim().max(120).optional().nullable(),
      logoUrl: z.string().url().max(600).optional().nullable().or(z.literal("")),
      design: z.enum(CERT_DESIGNS),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    // The running number (cert_next_no) is never touched here, so changing design keeps the numbering continuous.
    const { error } = await (await db())
      .from("artists")
      .update({
        cert_service_enabled: data.enabled,
        cert_brand_name: data.brandName || null,
        cert_logo_url: data.logoUrl || null,
        cert_design: data.design,
      })
      .eq("id", data.artistId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminCertificateReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await (await db())
      .from("authenticity_certificates")
      .select("id, serial, sequence_no, artist_id, title, medium, year_text, brand_name, design, issued_at, status, gender_snapshot, country_snapshot")
      .order("issued_at", { ascending: false })
      .limit(5000);
    if (error) throw new Error(error.message);
    return (data ?? []) as Row[];
  });

export const adminWithdrawCertificate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), reason: z.string().trim().min(3).max(300) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    // Withdrawn, never erased: the serial stays on record and the verify page says it was withdrawn.
    const { error } = await (await db())
      .from("authenticity_certificates")
      .update({ status: "withdrawn", withdrawn_at: new Date().toISOString(), withdrawn_reason: data.reason })
      .eq("id", data.id)
      .eq("status", "valid");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Issue a certificate for a work that sold before the artist switched the service on. */
export const adminIssueCertificateNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ artworkId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: serial, error } = await (await db()).rpc("admin_issue_certificate", { p_artwork: data.artworkId });
    if (error) throw new Error(error.message);
    if (!serial) throw new Error("No certificate issued: the artist has not switched the service on, or this work already has one.");
    return { serial: serial as string };
  });

// ---------- certificate download ----------
const SITE = () => (process.env.PUBLIC_SITE_URL || "https://myafriart.com").replace(/\/$/, "");

/** Public: anyone holding a serial may fetch its PDF. A withdrawn certificate is refused, and the price is never in the data. */
export const getArtistCertificatePdf = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ serial: z.string().min(10).max(40) }).parse(d))
  .handler(async ({ data }) => {
    const { data: v, error } = await (await db()).rpc("verify_certificate_serial", { p_serial: data.serial });
    if (error || !v) throw new Error("Certificate not found.");
    if (v.status !== "valid") throw new Error("This certificate has been withdrawn.");
    const { renderCertificatePdf } = await import("./certificate-pdf.server");
    const bytes = await renderCertificatePdf(v, `${SITE()}/verify/cert/${encodeURIComponent(v.serial)}`);
    return { filename: `${v.serial}.pdf`, base64: Buffer.from(bytes).toString("base64") };
  });
