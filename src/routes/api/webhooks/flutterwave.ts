import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "node:crypto";
import { fulfillPaymentByReference, logWebhookEvent } from "@/lib/payments-core.server";

/**
 * Flutterwave verifies webhooks with a static secret hash configured in the
 * dashboard (Settings → Webhooks), sent back verbatim in the `verif-hash`
 * header — unlike Paystack, it is NOT an HMAC of the body. Set
 * FLUTTERWAVE_SECRET_HASH on Netlify to the same value entered there.
 */
export const Route = createFileRoute("/api/webhooks/flutterwave")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secretHash = process.env.FLUTTERWAVE_SECRET_HASH;
        if (!secretHash) {
          return new Response(JSON.stringify({ error: "Webhook not configured" }), { status: 503 });
        }

        const signature = request.headers.get("verif-hash") ?? "";
        const body = await request.text();

        const sigBuf = Buffer.from(signature);
        const secretBuf = Buffer.from(secretHash);
        const valid = sigBuf.length === secretBuf.length && timingSafeEqual(sigBuf, secretBuf);
        if (!valid) {
          return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401 });
        }

        const event = JSON.parse(body) as {
          event?: string;
          data?: { id?: number; tx_ref?: string; status?: string };
        };

        const eventId = String(event.data?.id ?? (event.event ?? "") + body.slice(0, 32));
        const reference = event.data?.tx_ref ?? null;

        try {
          await logWebhookEvent("flutterwave", eventId, reference, event);
        } catch {
          // duplicate — idempotent ok
          return new Response(JSON.stringify({ ok: true, duplicate: true }));
        }

        if (
          event.event === "charge.completed" &&
          reference &&
          event.data?.status === "successful"
        ) {
          await fulfillPaymentByReference(reference);
        }

        return new Response(JSON.stringify({ ok: true }));
      },
    },
  },
});
