import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const __get_admin = () =>
  import("@/integrations/supabase/client.server").then((m) => m.supabaseAdmin);

async function assertAdmin(userId: string) {
  const { data } = await (await __get_admin())
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden: admin only");
}

/** Payments the member could dispute (succeeded, theirs). */
export const listMyDisputablePayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await __get_admin();
    const [{ data: payments, error }, { data: disputes }] = await Promise.all([
      admin
        .from("payments")
        .select("id, purpose, amount_ngn, status, provider_ref, metadata, created_at")
        .eq("user_id", context.userId)
        .in("status", ["succeeded", "refunded"])
        .order("created_at", { ascending: false })
        .limit(50),
      admin
        .from("payment_disputes")
        .select("id, payment_id, status, reason, resolution, created_at, resolved_at")
        .eq("opened_by", context.userId)
        .order("created_at", { ascending: false }),
    ]);
    if (error) throw new Error(error.message);
    const byPayment = new Map((disputes ?? []).map((d) => [d.payment_id, d]));
    return (payments ?? []).map((p) => ({ ...p, dispute: byPayment.get(p.id) ?? null }));
  });

export const openDispute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        paymentId: z.string().uuid(),
        reason: z.string().min(20, "Describe the problem in at least 20 characters").max(2000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const admin = await __get_admin();

    // Only the payer may dispute, and only a settled payment.
    const { data: payment } = await admin
      .from("payments")
      .select("id, user_id, status")
      .eq("id", data.paymentId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!payment) throw new Error("Payment not found");
    if (payment.status !== "succeeded") throw new Error("Only completed payments can be disputed.");

    const { data: hold } = await admin
      .from("escrow_holds")
      .select("id")
      .eq("payment_id", data.paymentId)
      .maybeSingle();

    const { error } = await admin.from("payment_disputes").insert({
      payment_id: data.paymentId,
      opened_by: context.userId,
      reason: data.reason,
      escrow_hold_id: hold?.id ?? null,
      status: "open",
    });
    // Partial unique index turns duplicate open disputes into a 23505.
    if (error?.code === "23505") throw new Error("This payment already has an open dispute.");
    if (error) throw new Error(error.message);

    // Freeze any held escrow while the dispute is open (idempotent no-op otherwise).
    if (hold) {
      await admin
        .from("escrow_holds")
        .update({ status: "disputed" })
        .eq("id", hold.id)
        .eq("status", "held");
    }
    return { ok: true };
  });

export const adminListDisputes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ status: z.enum(["open", "resolved", "rejected", "all"]).default("open") })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const admin = await __get_admin();
    let q = admin
      .from("payment_disputes")
      .select("*, payment:payments(id, purpose, amount_ngn, status, provider_ref, metadata)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const ids = [...new Set((rows ?? []).map((r) => r.opened_by))];
    const { data: profiles } = ids.length
      ? await admin.from("profiles").select("id, display_name").in("id", ids)
      : { data: [] };
    const names = new Map((profiles ?? []).map((p) => [p.id, p.display_name ?? "Member"]));
    return (rows ?? []).map((r) => ({ ...r, opener_name: names.get(r.opened_by) ?? "Member" }));
  });

export const adminResolveDispute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        disputeId: z.string().uuid(),
        outcome: z.enum(["resolved", "rejected"]),
        resolution: z.string().min(10).max(2000),
        refundEscrow: z.boolean().default(false),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const admin = await __get_admin();
    const { data: result, error } = await admin.rpc("resolve_payment_dispute", {
      p_dispute_id: data.disputeId,
      p_resolution: data.resolution,
      p_outcome: data.outcome,
      p_refund_escrow: data.refundEscrow,
      p_admin_id: context.userId,
    });
    if (error) throw new Error(error.message);
    const r = result as { ok: boolean; error?: string };
    if (!r.ok)
      throw new Error(
        r.error === "already_closed" ? "Dispute already closed" : "Resolution failed",
      );

    // If the dispute is rejected and the escrow was frozen, restore the hold.
    if (data.outcome === "rejected" && !data.refundEscrow) {
      const { data: d2 } = await admin
        .from("payment_disputes")
        .select("payment_id")
        .eq("id", data.disputeId)
        .single();
      if (d2) {
        await admin
          .from("escrow_holds")
          .update({ status: "held" })
          .eq("payment_id", d2.payment_id)
          .eq("status", "disputed");
      }
    }
    return { ok: true };
  });
