import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const __get_admin = () =>
  import("@/integrations/supabase/client.server").then((m) => m.supabaseAdmin);

function ref(): string {
  return `pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
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
        amountNgn: z.number().int().positive(),
        metadata: z.record(z.string()).default({}),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const admin = await __get_admin();

    // High-value escrow requires a verified identity (threshold in app_settings).
    if (data.metadata.escrow === "true") {
      const { data: setting } = await admin
        .from("app_settings")
        .select("value")
        .eq("key", "kyc_required_escrow_ngn")
        .maybeSingle();
      const threshold = Number(setting?.value ?? 500_000);
      if (data.amountNgn >= threshold) {
        const { requireVerifiedMember } = await import("@/lib/kyc.functions");
        await requireVerifiedMember(
          context.userId,
          `pay ₦${data.amountNgn.toLocaleString()} into escrow`,
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
        amount_ngn: data.amountNgn,
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
        authorizationUrl: `/checkout/mock?ref=${reference}&amount=${data.amountNgn}`,
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
        amount: data.amountNgn * 100,
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
