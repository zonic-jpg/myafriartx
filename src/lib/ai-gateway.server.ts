import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

// Provider-agnostic AI gateway. Works with ANY OpenAI-compatible endpoint —
// OpenAI, Groq, OpenRouter, Together, or the legacy Lovable gateway.
// Configure via env: AI_API_URL, AI_API_KEY, AI_MODEL. LOVABLE_API_KEY still honoured.
const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
export const AI_MODEL =
  process.env.AI_MODEL || (GEMINI_KEY && !process.env.AI_API_KEY ? "gemini-flash-latest" : "gpt-4o-mini");

export function getAiProvider() {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const apiKey = process.env.AI_API_KEY || lovableKey || GEMINI_KEY || "";
  const baseURL =
    process.env.AI_API_URL ||
    (lovableKey && !GEMINI_KEY
      ? "https://ai.gateway.lovable.dev/v1"
      : GEMINI_KEY && !process.env.AI_API_KEY
        ? "https://generativelanguage.googleapis.com/v1beta/openai"
        : "https://api.openai.com/v1");
  const headers: Record<string, string> = {};
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

// Back-compat for any remaining caller of the old factory.
export const createLovableAiGatewayProvider = (lovableApiKey: string) =>
  createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey: lovableApiKey,
    headers: { "Lovable-API-Key": lovableApiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
