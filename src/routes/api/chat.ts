import { createFileRoute } from "@tanstack/react-router";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  type UIMessage,
} from "ai";
import { getAiProvider, AI_MODEL } from "@/lib/ai-gateway.server";

const SYSTEM =
  "You are the MyAfriArt concierge — a warm, knowledgeable assistant helping visitors discover African art, artists, events, auctions, and the artstage room-preview tool. Keep replies short, useful, and friendly. Use markdown sparingly.";

function withCatalogue(base: string, catalogue: unknown): string {
  if (!Array.isArray(catalogue) || !catalogue.length) return base;
  const lines = catalogue
    .filter((l): l is string => typeof l === "string")
    .slice(0, 80)
    .map((l) => `- ${l.slice(0, 240)}`);
  return `${base}\n\nCatalogue currently on the site (answer artist/piece questions from this; if something is not listed, say so rather than inventing details):\n${lines.join("\n")}`;
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as {
          messages?: UIMessage[];
          catalogue?: unknown;
        };
        const { messages } = body;
        if (!Array.isArray(messages)) return new Response("Messages are required", { status: 400 });

        const { provider, configured } = getAiProvider();
        if (!configured) {
          // Graceful fallback so the concierge never hard-fails without a key.
          const text =
            "I'm the MyAfriArt concierge. The live assistant isn't configured yet — set AI_API_KEY (any OpenAI-compatible provider, e.g. OpenAI or Groq) to switch it on. Meanwhile you can browse Artists and Pieces from the landing page, open the Studio to stage a work on your wall, or check the Live Auction and Sale Lounge.";
          // Must be a UI-message stream: useChat cannot parse a bare text body.
          const stream = createUIMessageStream({
            execute: ({ writer }) => {
              writer.write({ type: "text-start", id: "concierge-not-configured" });
              writer.write({ type: "text-delta", id: "concierge-not-configured", delta: text });
              writer.write({ type: "text-end", id: "concierge-not-configured" });
            },
          });
          return createUIMessageStreamResponse({ stream });
        }

        const result = streamText({
          model: provider(AI_MODEL),
          system: withCatalogue(SYSTEM, body.catalogue),
          messages: await convertToModelMessages(messages),
        });
        return result.toUIMessageStreamResponse({ originalMessages: messages });
      },
    },
  },
});
