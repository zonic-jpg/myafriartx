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
 * fixed server-side. Without a site key it sends through the send-letter function.
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

    // The site sends through its own key when one is set; otherwise through the project's
    // send-letter function, which holds the key server-side. Replies go to the letterhead address.
    const key = process.env.RESEND_API_KEY;
    const from = process.env.LETTERS_FROM ?? process.env.EMAIL_FROM ?? "MyAfriArt <noreply@zonicme.com.ng>";
    const { data: lh } = await admin.from("app_settings").select("value").eq("key", "letterhead").maybeSingle();
    const replyTo = typeof (lh?.value as { email?: unknown } | null)?.email === "string" ? String((lh!.value as { email: string }).email) : undefined;

    let ok = false;
    let body: { id?: string; error?: { message?: string } | string; message?: string } = {};
    if (key) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: data.to, subject: data.subject, html: data.html, ...(replyTo ? { reply_to: replyTo } : {}) }),
      });
      body = await res.json().catch(() => ({}));
      ok = res.ok && !body?.error;
    } else {
      const { data: out, error } = await admin.functions.invoke("send-letter", {
        body: { to: data.to, subject: data.subject, html: data.html, reply_to: replyTo },
      });
      const o = (out ?? {}) as { ok?: boolean; id?: string; error?: string };
      ok = !error && o.ok === true && !!o.id;
      body = ok ? { id: o.id } : { error: { message: o.error ?? "The letter could not be sent. Please try again." } };
    }

    await admin.from("letters_sent").insert({
      sent_by: context.userId,
      audience: data.audience,
      recipient_brand: data.recipientBrand,
      recipient_email: data.to,
      subject: data.subject,
      provider_id: body?.id ?? null,
      status: ok ? "sent" : "failed",
    });

    if (!ok) throw new Error((typeof body?.error === "object" ? body.error?.message : body?.message) ?? "Send failed");
    return { ok: true, id: body.id as string };
  });
