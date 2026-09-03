import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { getAiProvider, AI_MODEL } from "@/lib/ai-gateway.server";

const SYSTEM =
  "You are the MyAfriArt concierge — a warm, knowledgeable assistant helping visitors discover African art, artists, events, auctions, and the artstage room-preview tool. Keep replies short, useful, and friendly. Use markdown sparingly.";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages } = (await request.json()) as { messages?: UIMessage[] };
        if (!Array.isArray(messages)) return new Response("Messages are required", { status: 400 });

        const { provider, configured } = getAiProvider();
        if (!configured) {
          // Graceful fallback so the concierge never hard-fails without a key.
          const text =
            "I'm the MyAfriArt concierge. The live assistant isn't configured yet — set AI_API_KEY (any OpenAI-compatible provider, e.g. OpenAI or Groq) to switch it on. Meanwhile you can browse Artists and Pieces from the landing page, open the Studio to stage a work on your wall, or check the Live Auction and Sale Lounge.";
          return new Response(text, {
            status: 200,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        }

        const result = streamText({
          model: provider(AI_MODEL),
          system: SYSTEM,
          messages: await convertToModelMessages(messages),
        });
        return result.toUIMessageStreamResponse({ originalMessages: messages });
      },
    },
  },
});
