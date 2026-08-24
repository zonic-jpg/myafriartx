/** Shared payment fulfillment — used by verify + webhook */
export async function getAdmin() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

export async function fulfillPaymentByReference(reference: string) {
  const admin = await getAdmin();
  const { data: payment } = await admin
    .from("payments")
    .select("id, status")
    .eq("provider_ref", reference)
    .maybeSingle();

  if (!payment) return { ok: false, error: "payment_not_found" };
  if (payment.status === "succeeded") return { ok: true, already: true };

  const { data, error } = await admin.rpc("fulfill_payment_record", {
    p_payment_id: payment.id,
    p_reference: reference,
  });

  if (error) throw new Error(error.message);
  return data as { ok: boolean };
}

export async function logWebhookEvent(
  provider: string,
  eventId: string,
  reference: string | null,
  payload: unknown,
) {
  const admin = await getAdmin();
  const { error } = await admin.from("payment_webhook_events").insert({
    provider,
    event_id: eventId,
    reference,
    payload: payload as Record<string, unknown>,
  });
  if (error?.code === "23505") throw error; // duplicate for idempotency
}
