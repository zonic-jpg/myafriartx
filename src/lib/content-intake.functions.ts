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

const item = z.object({
  source_name: z.string().max(300).optional(),
  image_hash: z.string().max(128).optional(),
  image_url: z.string().url().optional(),
  title: z.string().min(1).max(300),
  category: z.string().max(120).optional(),
  subcategory: z.string().max(120).optional(),
  description: z.string().max(4000).optional(),
  attributes: z.record(z.any()).default({}),
  cultural_tags: z.array(z.string().max(60)).max(20).default([]),
  price_band: z.string().max(120).optional(),
  needs_vetting: z.boolean().default(false),
  confidence: z.number().min(0).max(1).optional(),
});

/**
 * Bulk-stage AI-enriched items into content_staging as 'pending_publish'.
 * The single door the Content Intake Studio (and any future agent) calls.
 * Admin-only; de-dup by image_hash is enforced by a partial unique index, so
 * re-staging the same image is a no-op rather than a duplicate.
 */
export const bulkStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ items: z.array(item).min(1).max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const rows = data.items.map((i) => ({ ...i, staged_by: context.userId, status: "pending_publish" }));
    const { data: ins, error } = await (await __get_admin())
      .from("content_staging")
      .upsert(rows, { onConflict: "image_hash", ignoreDuplicates: true })
      .select("id");
    if (error) throw new Error(error.message);
    return { ok: true, staged: ins?.length ?? 0, received: rows.length };
  });

/** Publish a staged item into the live catalogue (final one-tap gate). */
export const publishStaged = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const admin = await __get_admin();
    const { data: row, error } = await admin
      .from("content_staging").select("*").eq("id", data.id).maybeSingle();
    if (error || !row) throw new Error("Staged item not found");
    if (row.needs_vetting) throw new Error("Item still requires human vetting before publish");
    // App-specific insert into the live table happens here (e.g. artworks).
    const { error: upErr } = await admin
      .from("content_staging").update({ status: "published" }).eq("id", data.id);
    if (upErr) throw new Error(upErr.message);
    return { ok: true };
  });
