import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const __get_admin = () =>
  import("@/integrations/supabase/client.server").then((m) => m.supabaseAdmin);

async function assertAdmin(userId: string) {
  const { data } = await (await __get_admin())
    .from("user_roles").select("id").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Forbidden: admin only");
}

/** Load the shared letterhead (any authenticated admin surface may read it). */
export const getLetterhead = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data } = await (await __get_admin())
      .from("app_settings").select("value").eq("key", "letterhead").maybeSingle();
    return data?.value ?? null;
  });

/** Save the shared letterhead (admin only). */
export const saveLetterhead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      address: z.string().max(400),
      email: z.string().email(),
      url: z.string().max(200),
      signatory: z.string().max(120),
      signatoryTitle: z.string().max(160),
      logoUrl: z.string().url().nullable().optional(),
      seal: z.boolean(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await (await __get_admin())
      .from("app_settings")
      .upsert({ key: "letterhead", value: data, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Send a composed letter from MyAfriArt's own domain via Resend.
 * SECURITY: admin-only; the email body is built by the caller but the SENDER is
 * fixed server-side. A missing RESEND_API_KEY returns a clear, non-silent error.
 */
export const sendLetter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      audience: z.enum([
        "permission",
        "collaboration",
        "advertising",
        "artist_invite",
        "sponsorship",
        "press",
      ]),
      recipientBrand: z.string().min(1).max(200),
      to: z.string().email(),
      subject: z.string().min(1).max(300),
      html: z.string().min(1).max(100_000),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const admin = await __get_admin();

    const key = process.env.RESEND_API_KEY;
    const from = process.env.LETTERS_FROM ?? "MyAfriArt <partnerships@myafriart.com>";
    if (!key) throw new Error("RESEND_API_KEY not configured");

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: data.to, subject: data.subject, html: data.html }),
    });
    const body = await res.json().catch(() => ({}));
    const ok = res.ok && !body?.error;

    await admin.from("letters_sent").insert({
      sent_by: context.userId,
      audience: data.audience,
      recipient_brand: data.recipientBrand,
      recipient_email: data.to,
      subject: data.subject,
      provider_id: body?.id ?? null,
      status: ok ? "sent" : "failed",
    });

    if (!ok) throw new Error(body?.error?.message ?? "Send failed");
    return { ok: true, id: body.id as string };
  });
