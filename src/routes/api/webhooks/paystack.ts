import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";
import { fulfillPaymentByReference, logWebhookEvent } from "@/lib/payments-core.server";

export const Route = createFileRoute("/api/webhooks/paystack")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.PAYSTACK_SECRET_KEY;
        if (!secret) {
          return new Response(JSON.stringify({ error: "Webhook not configured" }), { status: 503 });
        }

        const signature = request.headers.get("x-paystack-signature");
        const body = await request.text();

        if (!signature) {
          return new Response(JSON.stringify({ error: "Missing signature" }), { status: 401 });
        }

        const hash = createHmac("sha512", secret).update(body).digest("hex");
        const valid =
          hash.length === signature.length &&
          timingSafeEqual(Buffer.from(hash), Buffer.from(signature));

        if (!valid) {
          return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401 });
        }

        const event = JSON.parse(body) as {
          event: string;
          data: { reference?: string; id?: number; status?: string };
        };

        const eventId = String(event.data?.id ?? event.event + body.slice(0, 32));
        const reference = event.data?.reference;

        try {
          await logWebhookEvent("paystack", eventId, reference ?? null, event);
        } catch {
          // duplicate — idempotent ok
          return new Response(JSON.stringify({ ok: true, duplicate: true }));
        }

        if (event.event === "charge.success" && reference && event.data?.status === "success") {
          await fulfillPaymentByReference(reference);
        }

        return new Response(JSON.stringify({ ok: true }));
      },
    },
  },
});
