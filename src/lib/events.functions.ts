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

export type LiveEvent = {
  id: string;
  title: string;
  description: string | null;
  detail_text: string | null;
  venue: string | null;
  city: string | null;
  country: string | null;
  starts_at: string;
  ends_at: string | null;
  image_url: string | null;
  detail_image_url: string | null;
  detail_video_url: string | null;
  ticket_url: string | null;
  category: string | null;
  tags: string[];
  status: "draft" | "published" | "archived";
  created_at: string;
  updated_at: string;
};

const EventIn = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(300),
  description: z.string().max(4000).nullable().optional(),
  detail_text: z.string().max(12000).nullable().optional(),
  venue: z.string().max(300).nullable().optional(),
  city: z.string().max(120).nullable().optional(),
  country: z.string().max(120).nullable().optional(),
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime().nullable().optional(),
  image_url: z.string().max(2000).nullable().optional(),
  detail_image_url: z.string().max(2000).nullable().optional(),
  detail_video_url: z.string().max(2000).nullable().optional(),
  ticket_url: z.string().max(2000).nullable().optional(),
  category: z.string().max(120).nullable().optional(),
  tags: z.array(z.string().max(80)).optional(),
  status: z.enum(["draft", "published", "archived"]).default("published"),
});

export const listLiveEvents = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z
      .object({
        includeDrafts: z.boolean().optional(),
        from: z.string().datetime().optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const admin = await __get_admin();
    let q = admin.from("live_events").select("*").order("starts_at", { ascending: true });
    if (!data.includeDrafts) q = q.eq("status", "published");
    if (data.from) q = q.gte("starts_at", data.from);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []) as LiveEvent[];
  });

export const saveLiveEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => EventIn.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const admin = await __get_admin();
    const patch = {
      title: data.title,
      description: data.description ?? null,
      detail_text: data.detail_text ?? data.description ?? null,
      venue: data.venue ?? null,
      city: data.city ?? null,
      country: data.country ?? null,
      starts_at: data.starts_at,
      ends_at: data.ends_at ?? null,
      image_url: data.image_url ?? "/media/pane-event.jpg",
      detail_image_url: data.detail_image_url ?? null,
      detail_video_url: data.detail_video_url ?? null,
      ticket_url: data.ticket_url ?? null,
      category: data.category ?? null,
      tags: data.tags ?? [],
      status: data.status,
    };
    const result = data.id
      ? await admin.from("live_events").update(patch).eq("id", data.id).select("*").single()
      : await admin.from("live_events").insert(patch).select("*").single();
    if (result.error) throw new Error(result.error.message);
    return result.data as LiveEvent;
  });

export const deleteLiveEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await (await __get_admin()).from("live_events").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
