import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// De-Lovabled build: server-only deps loaded lazily so they never enter the
// client bundle (TanStack Start import-protection). Handlers still run server-side.
const __get_admin = () =>
  import("@/integrations/supabase/client.server").then((m) => m.supabaseAdmin);

const EntryPointSchema = z.enum(["sell_your_work", "stage_virtually"]);
const LocationSchema = z.string().min(1).max(120);
const SessionIdSchema = z
  .string()
  .min(8)
  .max(64)
  .regex(/^[a-zA-Z0-9_-]+$/);

// Public — anyone (including signed-out visitors) can record an entry click.
export const recordEntryClick = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        entry_point: EntryPointSchema,
        location: LocationSchema,
        session_id: SessionIdSchema,
        user_id: z.string().uuid().optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { error } = await (await __get_admin()).from("entry_clicks").insert({
      entry_point: data.entry_point,
      location: data.location,
      session_id: data.session_id,
      user_id: data.user_id ?? null,
    });
    if (error) {
      console.error("[entry-clicks] insert error:", error.message);
      return { ok: false };
    }
    return { ok: true };
  });

// Admin-only — aggregate click counts per entry point (all-time + last 30 days).
export const getEntryClickStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: role } = await (await __get_admin())
      .from("user_roles")
      .select("id")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) throw new Error("Forbidden: admin only");

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const [{ data: allRows }, { data: recentRows }] = await Promise.all([
      (await __get_admin()).from("entry_clicks").select("entry_point, location"),
      (await __get_admin())
        .from("entry_clicks")
        .select("entry_point, location")
        .gte("created_at", since),
    ]);

    const count = (rows: { entry_point: string; location: string }[] | null) => {
      const m: Record<string, number> = {};
      for (const r of rows ?? []) {
        const key = `${r.entry_point}::${r.location}`;
        m[key] = (m[key] ?? 0) + 1;
      }
      return m;
    };
    return { all: count(allRows), last30: count(recentRows) };
  });
