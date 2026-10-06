import { createFileRoute } from "@tanstack/react-router";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  type UIMessage,
} from "ai";
import { getAiProvider, AI_MODEL } from "@/lib/ai-gateway.server";
// @ts-expect-error plain JS helper shared with the Netlify function
import { conciergeFallback } from "@/lib/concierge-guide.js";

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
          const text: string = conciergeFallback(messages, body.catalogue);
          // Must be a UI-message stream: useChat cannot parse a bare text body.
          const stream = createUIMessageStream({
            execute: ({ writer }) => {
              writer.write({ type: "text-start", id: "concierge-guide" });
              writer.write({ type: "text-delta", id: "concierge-guide", delta: text });
              writer.write({ type: "text-end", id: "concierge-guide" });
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
