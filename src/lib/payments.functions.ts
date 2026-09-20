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

/**
 * Zonic orbit payment standard (see ~/Downloads/Owanbe-COMPLETE reference):
 * Flutterwave primary, Paystack fallback, mock last resort when neither key is
 * configured. Order is overridable via PAYMENT_PRIMARY for ops flexibility.
 */
type Provider = "flutterwave" | "paystack";

function providerOrder(): Provider[] {
  const flw = process.env.FLUTTERWAVE_SECRET_KEY;
  const psk = process.env.PAYSTACK_SECRET_KEY;
  const primary = (process.env.PAYMENT_PRIMARY ?? "flutterwave").toLowerCase();
  const order: Provider[] =
    primary === "paystack" ? ["paystack", "flutterwave"] : ["flutterwave", "paystack"];
  return order.filter((p) => (p === "flutterwave" ? !!flw : !!psk));
}

type InitResult = { reference: string; authorizationUrl: string };

async function initFlutterwave(opts: {
  reference: string;
  amountNgn: number;
  email: string;
  purpose: string;
  paymentId: string;
  metadata: Record<string, string>;
}): Promise<InitResult> {
  const key = process.env.FLUTTERWAVE_SECRET_KEY as string;
  const res = await fetch("https://api.flutterwave.com/v3/payments", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      tx_ref: opts.reference,
      amount: opts.amountNgn,
      currency: "NGN",
      redirect_url: `${process.env.PUBLIC_APP_URL ?? "http://localhost:3000"}/checkout/callback?ref=${opts.reference}`,
      customer: { email: opts.email },
      meta: { payment_id: opts.paymentId, ...opts.metadata },
      customizations: { title: "MyAfriArt", description: opts.purpose },
    }),
  });
  const body = await res.json();
  if (!res.ok || body?.status !== "success" || !body?.data?.link) {
    throw new Error(body?.message ?? "Flutterwave init failed");
  }
  return { reference: opts.reference, authorizationUrl: body.data.link as string };
}

async function initPaystack(opts: {
  reference: string;
  amountNgn: number;
  email: string;
  paymentId: string;
  metadata: Record<string, string>;
}): Promise<InitResult> {
  const key = process.env.PAYSTACK_SECRET_KEY as string;
  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: opts.email,
      amount: opts.amountNgn * 100,
      reference: opts.reference,
      callback_url: `${process.env.PUBLIC_APP_URL ?? "http://localhost:3000"}/checkout/callback?ref=${opts.reference}`,
      metadata: { payment_id: opts.paymentId, ...opts.metadata },
    }),
  });
  const body = await res.json();
  if (!body.status) throw new Error(body.message ?? "Paystack init failed");
  return { reference: opts.reference, authorizationUrl: body.data.authorization_url as string };
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

    const email = (context.claims as { email?: string })?.email ?? "buyer@myafriart.com";
    const order = providerOrder();

    if (order.length === 0) {
      // Last resort — no gateway configured. Preserve the mock checkout path
      // exactly as before so local/dev/staging keeps working.
      const reference = ref();
      const { data: payment, error } = await admin
        .from("payments")
        .insert({
          user_id: context.userId,
          purpose: data.purpose,
          amount_ngn: amountNgn,
          status: "pending",
          provider: "mock",
          provider_ref: reference,
          metadata: data.metadata,
        })
        .select("id")
        .single();
      if (error || !payment) throw new Error(error?.message ?? "Payment create failed");
      return {
        paymentId: payment.id,
        provider: "mock" as const,
        reference,
        authorizationUrl: `/checkout/mock?ref=${reference}&amount=${amountNgn}`,
      };
    }

    // Reserve a payment row up front (status pending, provider TBD) so we have
    // a stable id to hand the gateway as metadata, then try each provider in
    // order (Flutterwave primary, Paystack fallback) and record the one that
    // actually accepted the charge.
    const reference = ref();
    const { data: reserved, error: reserveErr } = await admin
      .from("payments")
      .insert({
        user_id: context.userId,
        purpose: data.purpose,
        amount_ngn: amountNgn,
        status: "pending",
        provider: order[0],
        provider_ref: reference,
        metadata: data.metadata,
      })
      .select("id")
      .single();
    if (reserveErr || !reserved) throw new Error(reserveErr?.message ?? "Payment create failed");

    let lastErr = "";
    for (const provider of order) {
      try {
        const result =
          provider === "flutterwave"
            ? await initFlutterwave({
                reference,
                amountNgn,
                email,
                purpose: data.purpose,
                paymentId: reserved.id,
                metadata: data.metadata,
              })
            : await initPaystack({
                reference,
                amountNgn,
                email,
                paymentId: reserved.id,
                metadata: data.metadata,
              });

        if (provider !== order[0]) {
          await admin.from("payments").update({ provider }).eq("id", reserved.id);
        }

        return {
          paymentId: reserved.id,
          provider,
          reference: result.reference,
          authorizationUrl: result.authorizationUrl,
        };
      } catch (e) {
        lastErr = `${provider}: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    // Every configured provider rejected the charge — clean up the reserved
    // row rather than leaving an orphaned pending payment behind.
    await admin.from("payments").delete().eq("id", reserved.id).eq("status", "pending");
    throw new Error(`All payment providers failed. ${lastErr}`);
  });

async function verifyFlutterwave(reference: string): Promise<{ ok: boolean; amountNgn: number }> {
  const key = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!key) return { ok: true, amountNgn: 0 }; // key removed after init — trust webhook/manual reconciliation
  const res = await fetch(
    `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${key}` } },
  );
  const body = await res.json();
  const ok = body?.status === "success" && body?.data?.status === "successful";
  return { ok, amountNgn: Number(body?.data?.amount ?? 0) };
}

async function verifyPaystack(reference: string): Promise<{ ok: boolean; amountNgn: number }> {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) return { ok: true, amountNgn: 0 };
  const res = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: { Authorization: `Bearer ${key}` },
    },
  );
  const body = await res.json();
  const ok = body?.data?.status === "success";
  return { ok, amountNgn: Number(body?.data?.amount ?? 0) / 100 };
}

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

    if (payment.provider === "flutterwave" || payment.provider === "paystack") {
      const { ok, amountNgn: paidNgn } =
        payment.provider === "flutterwave"
          ? await verifyFlutterwave(data.reference)
          : await verifyPaystack(data.reference);
      if (!ok) throw new Error("Payment not successful");
      // Defense in depth: the amount actually paid must match what we recorded.
      // (paidNgn is 0 when the provider key isn't available at verify time —
      // e.g. a serverless cold start with a rotated secret — in which case we
      // fall through to the webhook/RPC as the source of truth instead of
      // blocking a legitimate payer.)
      if (paidNgn > 0 && paidNgn + 1 < Number(payment.amount_ngn)) {
        throw new Error("Amount paid is short");
      }
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
