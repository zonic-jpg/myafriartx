import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const __admin = () =>
  import("@/integrations/supabase/client.server").then((m) => m.supabaseAdmin);

async function assertAdmin(userId: string) {
  const { data } = await (await __admin())
    .from("user_roles").select("id").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Forbidden: admin only");
}

function parseLoose(txt: string) {
  const clean = (txt || "").replace(/```json/gi, "").replace(/```/g, "").trim();
  const a = clean.indexOf("{"), b = clean.lastIndexOf("}");
  if (a === -1 || b === -1) return null;
  try { return JSON.parse(clean.slice(a, b + 1)); } catch { return null; }
}

async function anthropic(body: unknown) {
  const key = process.env.AI_API_KEY ?? process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("AI_API_KEY not configured");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return (data.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n");
}

/**
 * Content intake: upload a consented image to storage (service role) AND enrich
 * it with a vision model — all SERVER-SIDE, so the AI key is never exposed to the
 * browser. Returns catalogue attributes + the stored image URL. Admin-only.
 */
export const enrichContentImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      imageBase64: z.string().min(16),
      mediaType: z.string().max(60),
      categories: z.array(z.string()).min(1),
      noun: z.string().max(60).default("item"),
      appName: z.string().max(60).default("MyAfriArt"),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const admin = await __admin();

    // 1) store the image (service role bypasses RLS; bucket is public-read)
    const ext = (data.mediaType.split("/")[1] || "jpg").replace("+xml", "");
    const path = `intake/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const bytes = Buffer.from(data.imageBase64, "base64");
    const up = await admin.storage.from("content-intake").upload(path, bytes, { contentType: data.mediaType, upsert: false });
    if (up.error) throw new Error(up.error.message);
    const { data: pub } = admin.storage.from("content-intake").getPublicUrl(path);

    // 2) enrich
    const prompt =
      `You are a cataloguing assistant for ${data.appName}, an African creative marketplace. ` +
      `Analyse this ${data.noun} image for a listing. Return ONLY strict JSON:\n` +
      `{"title":string,"category":one of ${JSON.stringify(data.categories)},"subcategory":string,` +
      `"description":string (2 warm, specific sentences),"attributes":{"materials":string,"colors":string,` +
      `"style":string,"originGuess":string,"dimensionsEstimate":string},"culturalTags":string[],` +
      `"suggestedPriceBand":string (Naira range),"quality":string[] (any of "low_resolution","watermarked","blurry","cluttered_background","ok"),` +
      `"needsVetting":boolean (true if it shows a real person, brand logo, currency, or a claim needing checks),` +
      `"confidence":number 0..1,"note":string}\n` +
      `Never invent a brand or a real person's identity. If unsure, lower confidence.`;
    const txt = await anthropic({
      model: "claude-sonnet-4-6", max_tokens: 700,
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: data.mediaType, data: data.imageBase64 } },
        { type: "text", text: prompt },
      ] }],
    });
    const ai = parseLoose(txt);
    if (!ai) throw new Error("Enrichment failed to parse");
    return { ...ai, imageUrl: pub.publicUrl };
  });

/**
 * Letter Studio: propose a recipient's public business-contact details, grounded
 * by web search. Server-side; admin-only. Returns AI proposals to VERIFY, never
 * to auto-send. (Requires the web_search tool to be enabled on the API key.)
 */
export const enrichRecipient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ brand: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const prompt =
      `Find publicly listed business-contact details for legitimate B2B outreach. Use web search. ` +
      `Return ONLY strict JSON: {"address":string|null,"proprietorName":string|null,"email":string|null,` +
      `"confidence":"high"|"medium"|"low","note":string}. Only give an email you can actually find publicly; ` +
      `never invent one.\n\nBrand/company: ${data.brand}\nCountry hint: Nigeria / Africa unless the name says otherwise.`;
    const txt = await anthropic({
      model: "claude-sonnet-4-6", max_tokens: 700,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{ role: "user", content: prompt }],
    });
    return parseLoose(txt) ?? { address: null, proprietorName: null, email: null, confidence: "low", note: "No result." };
  });
