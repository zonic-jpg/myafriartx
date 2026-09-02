import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const __get_admin = () =>
  import("@/integrations/supabase/client.server").then((m) => m.supabaseAdmin);

function ref(): string {
  return `pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * SECURITY (audit — CRITICAL): the amount to charge must be derived from the
 * server-side record, never taken from the client. Previously `amountNgn` came
 * straight from the request body, so a buyer could purchase any artwork/lot for
 * an arbitrary price (e.g. ₦100) and fulfillment would mark it sold to them.
 * This resolver looks up the authoritative price by purpose and also enforces
 * ownership/eligibility where relevant.
 */
async function resolveAuthoritativeAmountNgn(
  admin: any,
  purpose: string,
  metadata: Record<string, string>,
  userId: string,
): Promise<number> {
  if (purpose === "artwork_purchase") {
    const artworkId = metadata.artwork_id;
    if (!artworkId) throw new Error("artwork_id required");
    const { data: art, error } = await admin
      .from("artworks")
      .select("price, lifecycle_status")
      .eq("id", artworkId)
      .maybeSingle();
    if (error || !art) throw new Error("Artwork not found");
    if (art.lifecycle_status === "sold") throw new Error("Artwork already sold");
    const price = Number(art.price);
    if (!Number.isFinite(price) || price <= 0) throw new Error("Artwork price unavailable");
    return Math.round(price);
  }

  if (purpose === "auction_settlement") {
    const lotId = metadata.lot_id;
    if (!lotId) throw new Error("lot_id required");
    const { data: lot, error } = await admin
      .from("auction_lots")
      .select("current_bid, leading_bidder")
      .eq("id", lotId)
      .maybeSingle();
    if (error || !lot) throw new Error("Lot not found");
    if (lot.leading_bidder && lot.leading_bidder !== userId) {
      throw new Error("Only the leading bidder may settle this lot");
    }
    const amount = Number(lot.current_bid);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Lot amount unavailable");
    return Math.round(amount);
  }

  // Fee-based purposes: read the configured fee server-side; never trust client.
  const feeKey =
    purpose === "brokerage_fee"
      ? "brokerage_fee_ngn"
      : purpose === "collateral_fee"
        ? "collateral_fee_ngn"
        : null;
  if (feeKey) {
    const { data: setting } = await admin
      .from("app_settings")
      .select("value")
      .eq("key", feeKey)
      .maybeSingle();
    const fee = Number(setting?.value);
    if (!Number.isFinite(fee) || fee <= 0) throw new Error(`Fee not configured (${feeKey})`);
    return Math.round(fee);
  }

  throw new Error("Unsupported purpose");
}

export const initializePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        purpose: z.enum([
          "artwork_purchase",
          "auction_settlement",
          "brokerage_fee",
          "collateral_fee",
        ]),
        // Accepted for backward compatibility but IGNORED for pricing — the
        // authoritative amount is resolved server-side below.
        amountNgn: z.number().int().positive().optional(),
        metadata: z.record(z.string()).default({}),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const admin = await __get_admin();

    // Authoritative amount from the server record — client value is not trusted.
    const amountNgn = await resolveAuthoritativeAmountNgn(
      admin,
      data.purpose,
      data.metadata,
      context.userId,
    );

    // High-value escrow requires a verified identity (threshold in app_settings).
    if (data.metadata.escrow === "true") {
      const { data: setting } = await admin
        .from("app_settings")
        .select("value")
        .eq("key", "kyc_required_escrow_ngn")
        .maybeSingle();
      const threshold = Number(setting?.value ?? 500_000);
      if (amountNgn >= threshold) {
        const { requireVerifiedMember } = await import("@/lib/kyc.functions");
        await requireVerifiedMember(
          context.userId,
          `pay ₦${amountNgn.toLocaleString()} into escrow`,
        );
      }
    }

    const reference = ref();
    const paystackKey = process.env.PAYSTACK_SECRET_KEY;

    const { data: payment, error } = await admin
      .from("payments")
      .insert({
        user_id: context.userId,
        purpose: data.purpose,
        amount_ngn: amountNgn,
        status: "pending",
        provider: paystackKey ? "paystack" : "mock",
        provider_ref: reference,
        metadata: data.metadata,
      })
      .select("id")
      .single();

    if (error || !payment) throw new Error(error?.message ?? "Payment create failed");

    if (!paystackKey) {
      return {
        paymentId: payment.id,
        provider: "mock" as const,
        reference,
        authorizationUrl: `/checkout/mock?ref=${reference}&amount=${amountNgn}`,
      };
    }

    const email = (context.claims as { email?: string })?.email ?? "buyer@myafriart.com";

    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: amountNgn * 100,
        reference,
        callback_url: `${process.env.PUBLIC_APP_URL ?? "http://localhost:3000"}/checkout/callback?ref=${reference}`,
        metadata: { payment_id: payment.id, ...data.metadata },
      }),
    });

    const body = await res.json();
    if (!body.status) throw new Error(body.message ?? "Paystack init failed");

    return {
      paymentId: payment.id,
      provider: "paystack" as const,
      reference,
      authorizationUrl: body.data.authorization_url as string,
    };
  });

export const verifyPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ reference: z.string().min(3) }).parse(d))
  .handler(async ({ data, context }) => {
    const admin = await __get_admin();

    const { data: payment, error } = await admin
      .from("payments")
      .select("*")
      .eq("provider_ref", data.reference)
      .eq("user_id", context.userId)
      .single();

    if (error || !payment) throw new Error("Payment not found");
    if (payment.status === "succeeded") return { ok: true, paymentId: payment.id };

    const paystackKey = process.env.PAYSTACK_SECRET_KEY;
    if (paystackKey) {
      const res = await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(data.reference)}`,
        { headers: { Authorization: `Bearer ${paystackKey}` } },
      );
      const body = await res.json();
      if (body.data?.status !== "success") throw new Error("Payment not successful");
      // Defense in depth: the amount actually paid must match what we recorded.
      const paidNgn = Number(body.data?.amount ?? 0) / 100;
      if (paidNgn + 1 < Number(payment.amount_ngn)) throw new Error("Amount paid is short");
    }

    const { data: result, error: rpcErr } = await admin.rpc("fulfill_payment_record", {
      p_payment_id: payment.id,
      p_reference: data.reference,
    });
    if (rpcErr) throw new Error(rpcErr.message);
    if (result && typeof result === "object" && "ok" in result && !result.ok) {
      throw new Error("Fulfillment failed");
    }

    return { ok: true, paymentId: payment.id, purpose: payment.purpose };
  });
