import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireVerifiedMember } from "@/lib/kyc.functions";

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

export const listMyCollateral = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("collateral_pledges")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const requestCollateral = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        artworkId: z.string().uuid().optional().nullable(),
        title: z.string().min(2).max(200),
        appraisedValueNgn: z.number().int().positive(),
        loanAmountNgn: z.number().int().positive(),
        notes: z.string().max(2000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    // Lending against physical assets is the highest-risk flow: hard KYC gate.
    await requireVerifiedMember(context.userId, "pledge art as collateral");

    const { data: row, error } = await context.supabase
      .from("collateral_pledges")
      .insert({
        user_id: context.userId,
        artwork_id: data.artworkId ?? null,
        title: data.title,
        appraised_value_ngn: data.appraisedValueNgn,
        loan_amount_ngn: data.loanAmountNgn,
        status: "pending_auth",
        authentication_notes: data.notes ?? null,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const adminListCollateral = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await (await __get_admin())
      .from("collateral_pledges")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminUpdateCollateral = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["pending_auth", "authenticated", "active", "released", "rejected"]),
        certificateUrl: z.string().url().optional().nullable(),
        notes: z.string().max(2000).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const patch: Record<string, unknown> = {
      status: data.status,
      authentication_notes: data.notes,
      updated_at: new Date().toISOString(),
    };
    if (data.certificateUrl) patch.certificate_url = data.certificateUrl;
    if (data.status === "authenticated" || data.status === "active") {
      patch.reviewed_by = context.userId;
      patch.reviewed_at = new Date().toISOString();
    }
    if (data.status === "released") patch.released_at = new Date().toISOString();

    const admin = await __get_admin();
    const { data: pledge } = await admin
      .from("collateral_pledges")
      .select("artwork_id")
      .eq("id", data.id)
      .single();

    const { error } = await admin.from("collateral_pledges").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);

    if (pledge?.artwork_id) {
      if (data.status === "active" || data.status === "authenticated") {
        await admin
          .from("artworks")
          .update({ is_pledged: true, pledge_id: data.id })
          .eq("id", pledge.artwork_id);
      }
      if (data.status === "released" || data.status === "rejected") {
        await admin
          .from("artworks")
          .update({ is_pledged: false, pledge_id: null })
          .eq("id", pledge.artwork_id);
      }
    }

    return { ok: true };
  });
