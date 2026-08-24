import { createFileRoute } from "@tanstack/react-router";
import { getAdmin } from "@/lib/payments-core.server";

export const Route = createFileRoute("/api/cron/auctions")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = process.env.CRON_SECRET;
        const auth = request.headers.get("authorization");
        if (!secret || auth !== `Bearer ${secret}`) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }

        const admin = await getAdmin();
        const { data: settled, error } = await admin.rpc("settle_expired_auction_lots");
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }

        return new Response(JSON.stringify({ settled: settled ?? 0 }));
      },
    },
  },
});
