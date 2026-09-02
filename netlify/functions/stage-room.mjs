/**
 * Netlify Function — ArtStage room staging (AI composite).
 * POST /api/stage-room
 * Auth: Bearer Supabase JWT (optional for canvas-less AI only when service role set;
 *   without auth we still run AI and return data URL, skipping DB/storage).
 * Env: GOOGLE_API_KEY and/or LOVABLE_API_KEY / AI_API_KEY,
 *      SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (optional persistence),
 *      VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (JWT verify).
 */
import { createClient } from "@supabase/supabase-js";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
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

function parseDataUrl(s) {
  if (!s || typeof s !== "string") return null;
  const m = s.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  return { mime: m[1], data: m[2] };
}

function ensureDataUrl(s) {
  return s.startsWith("data:") ? s : `data:image/jpeg;base64,${s}`;
}

function base64ToBuffer(s) {
  const b64 = s.includes(",") ? s.split(",")[1] : s;
  return Buffer.from(b64, "base64");
}

async function fetchAsInline(url) {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    const mime = r.headers.get("content-type") || "image/jpeg";
    return { mime: mime.split(";")[0], data: buf.toString("base64") };
  } catch {
    return null;
  }
}

async function lovableEdit({ prompt, roomDataUrl, artworkDataUrls, apiKey }) {
  const content = [
    { type: "text", text: prompt },
    { type: "image_url", image_url: { url: roomDataUrl } },
    ...artworkDataUrls.map((url) => ({ type: "image_url", image_url: { url } })),
  ];
  const aiBase = (env("AI_API_URL") || "https://ai.gateway.lovable.dev/v1").replace(/\/$/, "");
  const model = env("AI_IMAGE_MODEL", "LOVABLE_IMAGE_MODEL") || "google/gemini-3-pro-image-preview";
  const r = await fetch(`${aiBase}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content }],
      modalities: ["image", "text"],
    }),
  });
  if (!r.ok) {
    const text = await r.text();
    return { image: null, error: `Lovable ${r.status}: ${text.slice(0, 400)}` };
  }
  const json = await r.json();
  const dataUrl = json?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!dataUrl) return { image: null, error: "Lovable returned no image" };
  return { image: dataUrl, provider: "lovable" };
}

async function geminiEdit({ prompt, room, artworks, apiKey }) {
  const model = env("GEMINI_IMAGE_MODEL", "AI_IMAGE_MODEL") || "gemini-2.5-flash-image";
  const parts = [
    { inline_data: { mime_type: room.mime, data: room.data } },
    ...artworks.slice(0, 3).map((a) => ({ inline_data: { mime_type: a.mime, data: a.data } })),
    { text: prompt },
  ];
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
      }),
    },
  );
  if (!r.ok) {
    const errText = await r.text();
    return { image: null, error: `Gemini ${r.status}: ${errText.slice(0, 400)}` };
  }
  const d = await r.json();
  const out = d?.candidates?.[0]?.content?.parts?.find(
    (p) => p.inlineData?.data || p.inline_data?.data,
  );
  const b64 = out?.inlineData?.data || out?.inline_data?.data;
  if (!b64) return { image: null, error: "Gemini returned no image" };
  const mime = out?.inlineData?.mimeType || out?.inline_data?.mime_type || "image/png";
  return { image: `data:${mime};base64,${b64}`, provider: model };
}

async function runAiCascade({ prompt, roomDataUrl, artworkUrls }) {
  const errors = [];
  const room = parseDataUrl(roomDataUrl);
  if (!room) return { image: null, provider: null, errors: ["Invalid room image"] };

  const artInlines = [];
  const artDataUrls = [];
  for (const u of artworkUrls.slice(0, 3)) {
    if (u.startsWith("data:")) {
      const p = parseDataUrl(u);
      if (p) {
        artInlines.push(p);
        artDataUrls.push(u);
      }
    } else {
      const fetched = await fetchAsInline(u);
      if (fetched) {
        artInlines.push(fetched);
        artDataUrls.push(`data:${fetched.mime};base64,${fetched.data}`);
      } else {
        errors.push(`Could not fetch artwork ${u.slice(0, 80)}`);
      }
    }
  }

  const lovableKey = env("AI_API_KEY", "LOVABLE_API_KEY");
  if (lovableKey) {
    const out = await lovableEdit({
      prompt,
      roomDataUrl,
      artworkDataUrls: artDataUrls,
      apiKey: lovableKey,
    });
    if (out.image) return { image: out.image, provider: out.provider, errors };
    errors.push(out.error);
  }

  const googleKey = env("GOOGLE_API_KEY", "GEMINI_API_KEY");
  if (googleKey) {
    const out = await geminiEdit({
      prompt,
      room,
      artworks: artInlines,
      apiKey: googleKey,
    });
    if (out.image) return { image: out.image, provider: out.provider, errors };
    errors.push(out.error);
  }

  return { image: null, provider: null, errors };
}

export async function handler(event) {
  try {
    if (event.httpMethod === "OPTIONS") {
      return { statusCode: 204, headers: cors, body: "" };
    }
    if (event.httpMethod !== "POST") {
      return respond(405, { error: "POST JSON to /api/stage-room" });
    }

    const hasAi = !!(env("AI_API_KEY", "LOVABLE_API_KEY") || env("GOOGLE_API_KEY", "GEMINI_API_KEY"));
    if (!hasAi) {
      return respond(501, {
        error:
          "AI staging not configured — set GOOGLE_API_KEY or LOVABLE_API_KEY / AI_API_KEY on Netlify, then redeploy.",
      });
    }

    let body = {};
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return respond(400, { error: "Invalid JSON" });
    }

    const roomB64 = body.sourceImageBase64;
    if (!roomB64 || String(roomB64).length < 100) {
      return respond(400, { error: "sourceImageBase64 required" });
    }
    if (String(roomB64).length > 10_000_000) {
      return respond(413, { error: "Room photo too large" });
    }

    const stylePrompt =
      body.stylePrompt ||
      "photorealistic interior staging, respectful of existing architecture";
    const artworks = Array.isArray(body.artworks) ? body.artworks : [];
    const artworkIds = Array.isArray(body.artworkIds) ? body.artworkIds : [];
    if (!artworks.length && !artworkIds.length) {
      return respond(400, { error: "artworks or artworkIds required" });
    }

    const supabaseUrl = env("SUPABASE_URL", "VITE_SUPABASE_URL");
    const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = env("SUPABASE_PUBLISHABLE_KEY", "VITE_SUPABASE_ANON_KEY", "VITE_SUPABASE_PUBLISHABLE_KEY");

    let userId = null;
    let userClient = null;
    const authHeader = event.headers.authorization || event.headers.Authorization || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (token && supabaseUrl && anonKey) {
      userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: userData } = await userClient.auth.getUser();
      userId = userData?.user?.id || null;
    }

    const admin = supabaseUrl && serviceKey ? createClient(supabaseUrl, serviceKey) : null;

    // Resolve artwork image URLs
    let resolvedArts = artworks.filter((a) => a?.image_url);
    if ((!resolvedArts.length || resolvedArts.length < artworkIds.length) && admin && artworkIds.length) {
      const { data } = await admin
        .from("artworks")
        .select("id,title,image_url,medium")
        .in("id", artworkIds);
      if (data?.length) resolvedArts = data;
    }
    if (!resolvedArts.length) {
      return respond(400, { error: "No artwork images available for staging" });
    }

    const placement = String(body.placementRequest || "")
      .replace(/[<>]/g, "")
      .replace(/[\r\n\t]+/g, " ")
      .trim()
      .slice(0, 500);

    const prompt = [
      "Photorealistic edit of the provided room photograph.",
      "Stage the following artworks on the most suitable empty wall surface(s) in the room:",
      ...resolvedArts.map((a, i) => `- Artwork ${i + 1}: "${a.title || "Untitled"}" (${a.medium || "art"}).`),
      placement
        ? `User placement request (placement only): ${placement}`
        : "Choose the strongest wall placement automatically.",
      "Respect perspective, realistic scale (~A2/A1 framed for paintings; pedestal for sculptures), cast realistic shadows, and match the room's existing white balance and lighting.",
      `Decor style direction: ${stylePrompt}.`,
      "Do NOT alter furniture, flooring, ceiling, windows or architecture. Output a single composited image.",
    ].join("\n");

    const roomDataUrl = ensureDataUrl(roomB64);
    const ai = await runAiCascade({
      prompt,
      roomDataUrl,
      artworkUrls: resolvedArts.map((a) => a.image_url),
    });

    if (!ai.image) {
      return respond(502, {
        error: "AI staging failed — no image returned",
        provider_errors: ai.errors || [],
      });
    }

    // Persist when we have auth + service role
    let renderId = `ephemeral_${Date.now()}`;
    let resultUrl = ai.image;
    let sourceUrl = roomDataUrl;

    if (admin && userId) {
      try {
        const sourcePath = `${userId}/${crypto.randomUUID()}.jpg`;
        const sourceBuf = base64ToBuffer(roomDataUrl);
        await admin.storage.from("rooms").upload(sourcePath, sourceBuf, {
          contentType: "image/jpeg",
          upsert: false,
        });
        const { data: signedSrc } = await admin.storage.from("rooms").createSignedUrl(sourcePath, 3600);
        sourceUrl = signedSrc?.signedUrl || roomDataUrl;

        const { data: render, error: insErr } = await admin
          .from("renders")
          .insert({
            user_id: userId,
            source_image_url: sourcePath,
            style_id: body.styleId && String(body.styleId).includes("-") ? body.styleId : null,
            artwork_ids: artworkIds.length ? artworkIds : resolvedArts.map((a) => a.id).filter(Boolean),
            media_filter: body.mediaFilter || [],
            status: "processing",
            prompt,
          })
          .select()
          .single();

        if (!insErr && render) {
          renderId = render.id;
          const resultBuf = base64ToBuffer(ai.image);
          const resultPath = `${userId}/${render.id}.png`;
          await admin.storage.from("renders").upload(resultPath, resultBuf, {
            contentType: "image/png",
            upsert: true,
          });
          const { data: signedRes } = await admin.storage
            .from("renders")
            .createSignedUrl(resultPath, 3600);
          resultUrl = signedRes?.signedUrl || ai.image;
          await admin
            .from("renders")
            .update({ status: "completed", result_image_url: resultPath, prompt })
            .eq("id", render.id);
        }
      } catch (persistErr) {
        console.error("[stage-room] persist soft-fail", persistErr?.message || persistErr);
        // Keep ephemeral AI result
      }
    }

    return respond(200, {
      id: renderId,
      resultUrl,
      sourceUrl,
      provider: ai.provider,
    });
  } catch (e) {
    console.error("[stage-room]", e);
    return respond(500, { error: e?.message || "Internal stage-room error" });
  }
}
