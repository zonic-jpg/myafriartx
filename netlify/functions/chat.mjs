/**
 * Netlify Function — MyAfriArt Concierge chat.
 * POST /api/chat (redirected to /.netlify/functions/chat by netlify.toml)
 *
 * This app deploys as a static client (`publish = "dist/client"`) plus
 * explicit Netlify Functions — there is no TanStack Start SSR function
 * wired into this deploy. `src/routes/api/chat.ts` is a TanStack Start
 * *server route*; it only runs under `netlify/v1/functions/server.mjs`
 * (an SSR entry point), which this site's netlify.toml never publishes
 * or redirects to. The `/api/*` redirect sends every /api/* request to
 * `/.netlify/functions/:splat` instead, so `/api/chat` needs a real
 * function living at this path, matching the pattern already used by
 * `stage-room.mjs`.
 *
 * Netlify Functions here run in the classic (v1, buffered) handler
 * style — no true token-by-token streaming — so rather than hand-roll
 * the AI SDK's UI-message-stream wire format, we build the exact same
 * Response the TanStack route builds (via the real `ai` package
 * helpers, so the wire format can't drift from what `useChat` +
 * `DefaultChatTransport` on the client expects), then buffer it to a
 * string. The client still shows its own "..." loading state while
 * this is in flight, so the lack of incremental streaming is not
 * user-visible as a regression from a real backend perspective.
 */
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
} from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { conciergeFallback } from "./_concierge-guide.mjs";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

// Inlined from src/lib/ai-gateway.server.ts (kept in sync deliberately,
// not imported): that file is a TanStack Start server-only module living
// outside netlify/functions, and this function is bundled independently
// by esbuild per-function, so importing across that boundary is fragile.
// Same provider-agnostic contract: AI_API_URL / AI_API_KEY / AI_MODEL,
// with LOVABLE_API_KEY honoured as a legacy alias.
const AI_MODEL =
  process.env.AI_MODEL ||
  ((process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) && !process.env.AI_API_KEY ? "gemini-2.0-flash" : "gpt-4o-mini");

function getAiProvider() {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
  const apiKey = process.env.AI_API_KEY || lovableKey || geminiKey || "";
  const baseURL =
    process.env.AI_API_URL ||
    (lovableKey && !geminiKey ? "https://ai.gateway.lovable.dev/v1" : geminiKey && !process.env.AI_API_KEY ? "https://generativelanguage.googleapis.com/v1beta/openai" : "https://api.openai.com/v1");
  const headers = {};
  if (lovableKey && !process.env.AI_API_KEY) {
    headers["Lovable-API-Key"] = lovableKey;
    headers["X-Lovable-AIG-SDK"] = "vercel-ai-sdk";
  }
  const provider = createOpenAICompatible({
    name: "artstage-ai",
    baseURL,
    apiKey: apiKey || undefined,
    headers,
  });
  return { provider, configured: Boolean(apiKey) };
}

const SYSTEM =
  "You are the MyAfriArt concierge — a warm, knowledgeable assistant helping visitors discover African art, artists, events, auctions, and the artstage room-preview tool. Keep replies short, useful, and friendly. Use markdown sparingly.";

function withCatalogue(base, catalogue) {
  if (!Array.isArray(catalogue) || !catalogue.length) return base;
  const lines = catalogue
    .filter((l) => typeof l === "string")
    .slice(0, 80)
    .map((l) => "- " + l.slice(0, 240));
  return base + "\n\nCatalogue currently on the site (answer artist/piece questions from this; if something is not listed, say so rather than inventing details):\n" + lines.join("\n");
}

async function toNetlifyResponse(response) {
  const body = await response.text();
  const headers = { ...cors };
  for (const [k, v] of response.headers.entries()) headers[k] = v;
  return { statusCode: response.status, headers, body };
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: cors, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: cors, body: JSON.stringify({ error: "POST JSON to /api/chat" }) };
  }

  let messages;
  let catalogue;
  try {
    const parsed = JSON.parse(event.body || "{}");
    messages = parsed.messages;
    catalogue = parsed.catalogue;
  } catch {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "Invalid JSON" }) };
  }
  if (!Array.isArray(messages)) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "Messages are required" }) };
  }

  try {
    const { provider, configured } = getAiProvider();

    if (!configured) {
      const text = conciergeFallback(messages, catalogue);
      const stream = createUIMessageStream({
        execute: ({ writer }) => {
          const id = "concierge-guide";
          writer.write({ type: "text-start", id });
          writer.write({ type: "text-delta", id, delta: text });
          writer.write({ type: "text-end", id });
        },
      });
      return toNetlifyResponse(createUIMessageStreamResponse({ stream }));
    }

    const result = streamText({
      model: provider(AI_MODEL),
      system: withCatalogue(SYSTEM, catalogue),
      messages: await convertToModelMessages(messages),
    });
    return toNetlifyResponse(result.toUIMessageStreamResponse({ originalMessages: messages }));
  } catch (e) {
    console.error("[chat]", e);
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: e?.message || "Internal chat error" }),
    };
  }
}
