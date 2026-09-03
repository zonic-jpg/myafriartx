/**
 * Netlify Function — owner/admin bridge for MyAfriArtX.
 * POST /api/admin-bridge  { action, ... }
 *
 * The production site is a static SPA, so TanStack `createServerFn` endpoints do
 * not exist at runtime and the owner may sign in through the orbit admin gate,
 * which deliberately holds no Supabase JWT. Every privileged read/write therefore
 * goes through this one function using the service role key.
 *
 * Authorisation (server-side only — never trust client-supplied email headers):
 *   1. Bearer Supabase JWT whose user has the 'admin' role in user_roles, or
 *      whose email claim is OWNER_EMAIL.
 *   2. Orbit gate password in `x-orbit-gate-password` or body.orbitPassword,
 *      verified case-insensitively against the Zonic orbit standard password.
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (required),
 *      SUPABASE_PUBLISHABLE_KEY (JWT verification),
 *      RESEND_API_KEY + LETTERS_FROM (letters.send).
 */
import { createClient } from "@supabase/supabase-js";

const OWNER_EMAIL = "oadeagbo@gmail.com";
const ORBIT_GATE_PASSWORD = "zonicgate2026";
const APP_ID = "myafriartx";
const AUTH_FAIL_LIMIT = 20;
const AUTH_FAIL_WINDOW_MS = 15 * 60 * 1000;
const authFailBuckets = new Map();
const MEDIA_ENUM = [
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

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-orbit-gate-password",
  "Content-Type": "application/json",
};

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

function header(event, name) {
  const h = event.headers || {};
  return h[name] || h[name.toLowerCase()] || h[name.toUpperCase()] || "";
}

const norm = (v) => String(v ?? "").trim().toLowerCase();

function clientIp(event) {
  const fwd = header(event, "x-forwarded-for");
  if (fwd) return String(fwd).split(",")[0].trim();
  return header(event, "client-ip") || "unknown";
}

function authRateLimited(ip) {
  const now = Date.now();
  const bucket = authFailBuckets.get(ip);
  if (!bucket || now - bucket.startedAt > AUTH_FAIL_WINDOW_MS) {
    authFailBuckets.set(ip, { count: 0, startedAt: now });
    return false;
  }
  return bucket.count >= AUTH_FAIL_LIMIT;
}

function recordAuthFailure(ip) {
  const now = Date.now();
  const bucket = authFailBuckets.get(ip);
  if (!bucket || now - bucket.startedAt > AUTH_FAIL_WINDOW_MS) {
    authFailBuckets.set(ip, { count: 1, startedAt: now });
    return;
  }
  bucket.count += 1;
}

function isOrbitGatePassword(value) {
  return norm(value) === ORBIT_GATE_PASSWORD;
}

function orbitPasswordFromRequest(event, body) {
  const fromHeader = header(event, "x-orbit-gate-password");
  if (fromHeader) return fromHeader;
  if (body && typeof body.orbitPassword === "string") return body.orbitPassword;
  return "";
}

async function resolveActor(event, supabaseUrl, serviceKey, body = {}) {
  const ip = clientIp(event);
  if (authRateLimited(ip)) {
    return { ok: false, reason: "Too many failed admin sign-in attempts. Try again later." };
  }

  const anonKey = env("SUPABASE_PUBLISHABLE_KEY", "VITE_SUPABASE_PUBLISHABLE_KEY", "VITE_SUPABASE_ANON_KEY");
  const token = String(header(event, "authorization")).replace(/^Bearer\s+/i, "").trim();

  if (token && anonKey) {
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data } = await userClient.auth.getUser();
    const user = data?.user;
    if (user) {
      const email = norm(user.email);
      if (email === OWNER_EMAIL) {
        return { ok: true, email, userId: user.id, via: "jwt-owner" };
      }
      const admin = createClient(supabaseUrl, serviceKey);
      const { data: role } = await admin
        .from("user_roles")
        .select("id")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (role) return { ok: true, email: email || OWNER_EMAIL, userId: user.id, via: "jwt" };
    }
  }

  const orbitPassword = orbitPasswordFromRequest(event, body);
  if (orbitPassword && isOrbitGatePassword(orbitPassword)) {
    return { ok: true, email: "orbit-gate@myafriart", userId: null, via: "orbit-gate" };
  }

  if (orbitPassword || token) recordAuthFailure(ip);

  return {
    ok: false,
    reason: "Sign in with your Supabase account or the orbit admin password to use this action.",
  };
}

async function hostInboxImage(admin, dataUrl) {
  const match = String(dataUrl || "").match(/^data:(image\/[a-z+]+);base64,(.+)$/i);
  if (!match) return null;
  const ext = match[1] === "image/png" ? "png" : match[1] === "image/webp" ? "webp" : "jpg";
  const path = `inbox/${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(match[2], "base64");
  const { error } = await admin.storage
    .from("submissions")
    .upload(path, buffer, { contentType: match[1], upsert: false });
  if (error && !/already exists/i.test(error.message)) return null;
  const { data } = admin.storage.from("submissions").getPublicUrl(path);
  return data?.publicUrl || null;
}

function numeric(value) {
  const parsed = Number(String(value ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function sizeText(item) {
  const parts = [numeric(item.widthCm), numeric(item.heightCm), numeric(item.depthCm)].filter(Boolean);
  if (parts.length < 2) return null;
  return `${parts.join(" × ")} cm`;
}

async function submitBatchItem(admin, artistName, item) {
  const imageUrl = (await hostInboxImage(admin, item.imageDataUrl)) || item.imageDataUrl;
  const { data, error } = await admin
    .from("artwork_submissions")
    .insert({
      artist_name: artistName,
      submitter_name: artistName,
      title: String(item.title || "").trim(),
      medium: item.medium || null,
      width_cm: numeric(item.widthCm),
      height_cm: numeric(item.heightCm),
      depth_cm: numeric(item.depthCm),
      size_text: sizeText(item),
      year_created: String(item.yearCreated || "").trim() || null,
      country_of_origin: String(item.countryOfOrigin || "").trim() || null,
      price_amount: numeric(item.priceAmount),
      price_currency: item.priceCurrency || "USD",
      context: String(item.context || "").trim(),
      image_url: imageUrl,
      status: "pending",
    })
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.id ?? null;
}

/** Storage-backed https URL with an image extension — what `artworks` requires. */
async function ensureHostedImage(admin, submission) {
  const url = String(submission.image_url || "");
  if (/^https:\/\//i.test(url) && /\.(jpg|jpeg|png|webp)([?#]|$)/i.test(url)) return url;

  const match = url.match(/^data:(image\/[a-z+]+);base64,(.+)$/i);
  if (!match) return null;

  const ext = match[1] === "image/png" ? "png" : match[1] === "image/webp" ? "webp" : "jpg";
  const path = `approved/${submission.id}.${ext}`;
  const buffer = Buffer.from(match[2], "base64");
  const { error } = await admin.storage
    .from("submissions")
    .upload(path, buffer, { contentType: match[1], upsert: true });
  if (error && !/already exists/i.test(error.message)) return null;

  const { data } = admin.storage.from("submissions").getPublicUrl(path);
  return data?.publicUrl || null;
}

async function approveSubmission(admin, submission, actorEmail, note) {
  const imageUrl = await ensureHostedImage(admin, submission);
  if (!imageUrl) {
    throw new Error(
      "This submission has no publicly hosted image yet, so it cannot be published to the board.",
    );
  }

  const artistName = String(submission.artist_name || "").trim() || "Unattributed artist";
  let artistId = null;
  const { data: existingArtist } = await admin
    .from("artists")
    .select("id")
    .ilike("name", artistName)
    .limit(1)
    .maybeSingle();

  if (existingArtist) {
    artistId = existingArtist.id;
  } else {
    const { data: createdArtist } = await admin
      .from("artists")
      .insert({
        name: artistName,
        country: submission.country_of_origin || null,
        content_source: "live",
      })
      .select("id")
      .maybeSingle();
    artistId = createdArtist?.id ?? null;
  }

  const medium = MEDIA_ENUM.includes(String(submission.medium)) ? submission.medium : "mixed_media";
  const { data: artwork, error: artworkError } = await admin
    .from("artworks")
    .insert({
      artist_id: artistId,
      title: submission.title,
      medium,
      year: submission.year_created || null,
      image_url: imageUrl,
      description: submission.context || null,
      price: submission.price_amount ?? null,
      currency: submission.price_currency || "USD",
      width_cm: submission.width_cm ?? null,
      height_cm: submission.height_cm ?? null,
      depth_cm: submission.depth_cm ?? null,
      size_text: submission.size_text || null,
      submission_id: submission.id,
      content_source: "live",
      is_active: true,
    })
    .select("id, short_code")
    .maybeSingle();
  if (artworkError) throw new Error(artworkError.message);

  const { error: updateError } = await admin
    .from("artwork_submissions")
    .update({
      status: "approved",
      review_note: note || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: actorEmail,
      artwork_id: artwork?.id ?? null,
      image_url: imageUrl,
    })
    .eq("id", submission.id);
  if (updateError) throw new Error(updateError.message);

  return { artworkId: artwork?.id ?? null, shortCode: artwork?.short_code ?? null };
}

async function sendLetter(admin, body, actorEmail) {
  const key = env("RESEND_API_KEY");
  const from = env("LETTERS_FROM") || "MyAfriArt <partnerships@myafriart.com>";
  const base = {
    sent_by_email: actorEmail,
    audience: body.audience,
    recipient_brand: String(body.recipientBrand || "").slice(0, 200),
    recipient_email: body.to,
    subject: String(body.subject || "").slice(0, 300),
    body_html: String(body.html || "").slice(0, 100000),
  };

  if (!key) {
    await admin
      .from("letters_sent")
      .insert({ ...base, status: "failed", error_message: "RESEND_API_KEY is not configured on Netlify." });
    return {
      ok: false,
      status: "failed",
      reason: "Email sending is not configured yet — add RESEND_API_KEY on Netlify and redeploy.",
    };
  }

  let providerId = null;
  let failure = null;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: body.to, subject: base.subject, html: base.body_html }),
    });
    const payload = await res.json().catch(() => ({}));
    if (res.ok && !payload?.error) providerId = payload?.id ?? null;
    else failure = payload?.error?.message || `Email provider rejected the letter (${res.status}).`;
  } catch (e) {
    failure = e?.message || "Could not reach the email provider.";
  }

  const { data: row } = await admin
    .from("letters_sent")
    .insert({
      ...base,
      provider_id: providerId,
      status: failure ? "failed" : "sent",
      error_message: failure,
    })
    .select("id, created_at")
    .maybeSingle();

  if (failure) return { ok: false, status: "failed", reason: failure, id: row?.id ?? null };
  return {
    ok: true,
    status: "sent",
    id: row?.id ?? null,
    providerId,
    sentAt: row?.created_at ?? new Date().toISOString(),
  };
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };
  if (event.httpMethod !== "POST") return respond(405, { error: "POST JSON to /api/admin-bridge" });

  const supabaseUrl = env("SUPABASE_URL", "VITE_SUPABASE_URL");
  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return respond(501, {
      error:
        "Admin bridge is not configured — set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on Netlify, then redeploy.",
    });
  }

  let body = {};
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return respond(400, { error: "Invalid JSON" });
  }

  const action = String(body.action || "");
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Requesting access is the one thing an unauthenticated visitor may do.
  if (action === "access.request") {
    const email = norm(body.email);
    if (!email) return respond(400, { error: "email required" });
    if (email === OWNER_EMAIL) return respond(200, { status: "owner" });
    const { data: existing } = await admin
      .from("admin_access_requests")
      .select("status")
      .ilike("email", email)
      .eq("app", APP_ID)
      .maybeSingle();
    if (existing) return respond(200, { status: existing.status });
    const { error } = await admin.from("admin_access_requests").insert({
      email,
      identity: String(body.identity || "").slice(0, 200) || null,
      app: APP_ID,
      status: "pending",
    });
    if (error) return respond(500, { error: error.message });
    return respond(200, { status: "pending" });
  }

  if (action === "access.status") {
    const email = norm(body.email);
    if (!email) return respond(400, { error: "email required" });
    if (email === OWNER_EMAIL) return respond(200, { status: "owner" });
    const { data } = await admin
      .from("admin_access_requests")
      .select("status")
      .ilike("email", email)
      .eq("app", APP_ID)
      .maybeSingle();
    return respond(200, { status: data?.status ?? "none" });
  }

  const actor = await resolveActor(event, supabaseUrl, serviceKey, body);
  if (!actor.ok) return respond(403, { error: actor.reason });

  try {
    switch (action) {
      case "access.list": {
        const { data, error } = await admin
          .from("admin_access_requests")
          .select("id, email, identity, app, status, requested_at, decided_at, decided_by")
          .eq("app", APP_ID)
          .order("requested_at", { ascending: false })
          .limit(300);
        if (error) throw new Error(error.message);
        return respond(200, { requests: data ?? [], via: actor.via });
      }

      case "access.decide": {
        const email = norm(body.email);
        const decision = body.decision === "approved" ? "approved" : "rejected";
        if (!email) return respond(400, { error: "email required" });
        const { error } = await admin
          .from("admin_access_requests")
          .update({
            status: decision,
            decided_at: new Date().toISOString(),
            decided_by: actor.email,
            note: String(body.note || "").slice(0, 500) || null,
          })
          .ilike("email", email)
          .eq("app", APP_ID);
        if (error) throw new Error(error.message);
        return respond(200, { ok: true, email, status: decision });
      }

      case "submissions.list": {
        let query = admin
          .from("artwork_submissions")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200);
        if (body.status && body.status !== "all") query = query.eq("status", body.status);
        const { data, error } = await query;
        if (error) throw new Error(error.message);
        return respond(200, { submissions: data ?? [] });
      }

      case "submissions.decide": {
        const id = String(body.id || "");
        if (!id) return respond(400, { error: "id required" });
        const { data: submission, error } = await admin
          .from("artwork_submissions")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (error || !submission) return respond(404, { error: "Submission not found" });

        if (body.decision === "approved") {
          const result = await approveSubmission(admin, submission, actor.email, body.note);
          return respond(200, { ok: true, status: "approved", ...result });
        }

        const { error: rejectError } = await admin
          .from("artwork_submissions")
          .update({
            status: "rejected",
            review_note: String(body.note || "").slice(0, 500) || null,
            reviewed_at: new Date().toISOString(),
            reviewed_by: actor.email,
          })
          .eq("id", id);
        if (rejectError) throw new Error(rejectError.message);
        return respond(200, { ok: true, status: "rejected" });
      }

      case "batch.submit": {
        const artistName = String(body.artistName || "").trim();
        const items = Array.isArray(body.items) ? body.items : [];
        if (!artistName) return respond(400, { error: "artistName required" });
        if (!items.length) return respond(400, { error: "items required" });
        const results = [];
        for (const item of items.slice(0, 100)) {
          const clientId = String(item.clientId || "");
          try {
            const submissionId = await submitBatchItem(admin, artistName, item);
            results.push({ clientId, ok: true, submissionId });
          } catch (e) {
            results.push({ clientId, ok: false, error: e?.message || "Submit failed" });
          }
        }
        return respond(200, { results });
      }

      case "letters.send": {
        if (!body.to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(body.to))) {
          return respond(400, { error: "A valid recipient email is required." });
        }
        const result = await sendLetter(admin, body, actor.email);
        return respond(result.ok ? 200 : 502, result);
      }

      case "letters.list": {
        const { data, error } = await admin
          .from("letters_sent")
          .select("id, audience, recipient_brand, recipient_email, subject, status, error_message, created_at")
          .order("created_at", { ascending: false })
          .limit(100);
        if (error) throw new Error(error.message);
        return respond(200, { letters: data ?? [] });
      }

      case "letterhead.save": {
        const { error } = await admin.from("app_settings").upsert({
          key: "letterhead",
          value: body.letterhead ?? {},
          updated_at: new Date().toISOString(),
        });
        if (error) throw new Error(error.message);
        return respond(200, { ok: true });
      }

      default:
        return respond(400, { error: `Unknown action: ${action || "(none)"}` });
    }
  } catch (e) {
    console.error("[admin-bridge]", action, e);
    return respond(500, { error: e?.message || "Admin bridge failed" });
  }
}
