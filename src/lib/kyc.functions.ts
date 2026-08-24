import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sniffDocMime } from "@/lib/doc-sniff";
import { ID_TYPES } from "@/lib/kyc-constants";

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

const MAX_DOC_BYTES = 8 * 1024 * 1024;
const DOC_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
};

export const getMyVerification = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (await __get_admin())
      .from("member_verifications")
      .select("status, id_type, full_name, submitted_at, verified_at, rejected_reason")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ?? { status: "unverified" as const };
  });

export const submitVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        fullName: z.string().min(3).max(120),
        idType: z.enum(ID_TYPES),
        idReference: z.string().min(4).max(60),
        documentBase64: z.string().min(100).max(12_000_000),
        filename: z.string().min(1).max(200),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const admin = await __get_admin();

    // Verified members must not be able to overwrite their approved record.
    const { data: existing } = await admin
      .from("member_verifications")
      .select("status")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (existing?.status === "verified") throw new Error("Your identity is already verified.");
    if (existing?.status === "pending")
      throw new Error("Your submission is under review. You will be notified once decided.");

    const b64 = data.documentBase64.includes(",")
      ? data.documentBase64.split(",")[1]
      : data.documentBase64;
    const bin = atob(b64);
    if (bin.length > MAX_DOC_BYTES) throw new Error("Document too large. Use a file under 8 MB.");
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);

    const ext = (data.filename.split(".").pop() || "").toLowerCase();
    const declaredType = DOC_TYPES[ext];
    if (!declaredType) throw new Error("Use a JPG, PNG, WEBP, or PDF document.");
    const sniffedType = sniffDocMime(buf);
    if (!sniffedType || sniffedType !== declaredType)
      throw new Error("File contents do not match its extension.");

    // Private bucket, owner-scoped folder; served only via admin signed URLs.
    const path = `${context.userId}/${crypto.randomUUID()}.${ext}`;
    const up = await admin.storage
      .from("kyc")
      .upload(path, buf, { contentType: sniffedType, upsert: false });
    if (up.error) throw new Error("Document upload failed. Please try again.");

    const { error } = await admin.from("member_verifications").upsert({
      user_id: context.userId,
      status: "pending",
      full_name: data.fullName,
      id_type: data.idType,
      id_reference: data.idReference,
      document_path: path,
      submitted_at: new Date().toISOString(),
      rejected_reason: null,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return { ok: true, status: "pending" as const };
  });

export const adminListVerifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ status: z.enum(["pending", "verified", "rejected", "all"]).default("pending") })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const admin = await __get_admin();
    let q = admin
      .from("member_verifications")
      .select(
        "user_id, status, full_name, id_type, id_reference, submitted_at, verified_at, rejected_reason, document_path",
      )
      .order("submitted_at", { ascending: false, nullsFirst: false })
      .limit(200);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const ids = (rows ?? []).map((r) => r.user_id);
    const { data: profiles } = ids.length
      ? await admin.from("profiles").select("id, display_name").in("id", ids)
      : { data: [] };
    const names = new Map((profiles ?? []).map((p) => [p.id, p.display_name ?? "Member"]));
    return (rows ?? []).map((r) => ({ ...r, display_name: names.get(r.user_id) ?? "Member" }));
  });

export const adminGetDocumentUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const admin = await __get_admin();
    const { data: row } = await admin
      .from("member_verifications")
      .select("document_path")
      .eq("user_id", data.userId)
      .maybeSingle();
    if (!row?.document_path) throw new Error("No document on file");
    const { data: signed, error } = await admin.storage
      .from("kyc")
      .createSignedUrl(row.document_path, 600); // 10 minutes
    if (error || !signed) throw new Error("Could not sign document URL");
    return { url: signed.signedUrl };
  });

export const adminReviewVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        decision: z.enum(["verified", "rejected"]),
        reason: z.string().max(500).optional(),
      })
      .refine((v) => v.decision !== "rejected" || (v.reason ?? "").trim().length >= 5, {
        message: "A rejection reason is required so the member knows what to fix.",
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const admin = await __get_admin();
    const patch: Record<string, unknown> = {
      status: data.decision,
      updated_at: new Date().toISOString(),
    };
    if (data.decision === "verified") {
      patch.verified_at = new Date().toISOString();
      patch.verified_by = context.userId;
      patch.rejected_reason = null;
    } else {
      patch.rejected_reason = data.reason;
      patch.verified_at = null;
      patch.verified_by = null;
    }
    const { error } = await admin
      .from("member_verifications")
      .update(patch)
      .eq("user_id", data.userId)
      .eq("status", "pending"); // review only from pending — no silent flip of decided records
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Server-side gate shared by collateral + high-value escrow. */
export async function requireVerifiedMember(userId: string, action: string) {
  const admin = await __get_admin();
  const { data } = await admin.rpc("is_member_verified", { p_user_id: userId });
  if (!data) {
    throw new Error(
      `Identity verification is required to ${action}. Complete verification at /verification.`,
    );
  }
}
