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

export const getThreadEscrow = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ threadId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: holds, error } = await context.supabase
      .from("escrow_holds")
      .select("*")
      .eq("thread_id", data.threadId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return holds;
  });

export const adminReleaseEscrow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ escrowId: z.string().uuid(), reason: z.string().max(500).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const admin = await __get_admin();
    const { data: hold, error } = await admin
      .from("escrow_holds")
      .select("*")
      .eq("id", data.escrowId)
      .single();
    if (error || !hold) throw new Error("Escrow not found");
    if (hold.status !== "held") throw new Error("Escrow already released");

    const { error: upErr } = await admin
      .from("escrow_holds")
      .update({
        status: "released",
        release_reason: data.reason ?? "admin_release",
        released_at: new Date().toISOString(),
      })
      .eq("id", data.escrowId);
    if (upErr) throw new Error(upErr.message);

    if (hold.listing_id) {
      await admin.from("listings").update({ status: "closed" }).eq("id", hold.listing_id);
    }

    return { ok: true };
  });

export const adminListEscrow = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await (await __get_admin())
      .from("escrow_holds")
      .select("*")
      .eq("status", "held")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
