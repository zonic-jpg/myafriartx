import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// De-Lovabled build: server-only deps loaded lazily so they never enter the
// client bundle (TanStack Start import-protection). Handlers still run server-side.
const __get_admin = () =>
  import("@/integrations/supabase/client.server").then((m) => m.supabaseAdmin);

const PaneIdSchema = z
  .string()
  .min(1)
  .max(60)
  .regex(/^[a-z0-9_-]+$/);

// Public — anyone (including signed-out visitors) can record a pane view.
export const recordPaneView = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        pane_id: PaneIdSchema,
        session_id: z
          .string()
          .min(8)
          .max(64)
          .regex(/^[a-zA-Z0-9_-]+$/),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    // Allow recording for either a published DB-managed pane OR a known
    // built-in fallback pane (rendered when no published rows exist).
    const FALLBACK_PANE_IDS = new Set(["artist", "event", "piece", "stage", "auction", "lounge"]);
    if (!FALLBACK_PANE_IDS.has(data.pane_id)) {
      const { data: pane } = await (await __get_admin())
        .from("landing_panes")
        .select("pane_id")
        .eq("pane_id", data.pane_id)
        .eq("is_active", true)
        .eq("status", "published")
        .maybeSingle();
      if (!pane) return { ok: false };
    }

    const { error } = await (await __get_admin()).from("pane_views").insert({
      pane_id: data.pane_id,
      session_id: data.session_id,
    });
    if (error) {
      console.error("[pane-views] insert error:", error.message);
      return { ok: false };
    }
    return { ok: true };
  });

// Admin-only — aggregate view counts per pane (all-time + last 30 days).
export const getPaneViewStats = createServerFn({ method: "GET" })
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
      (await __get_admin()).from("pane_views").select("pane_id"),
      (await __get_admin()).from("pane_views").select("pane_id").gte("created_at", since),
    ]);

    const count = (rows: { pane_id: string }[] | null) => {
      const m: Record<string, number> = {};
      for (const r of rows ?? []) m[r.pane_id] = (m[r.pane_id] ?? 0) + 1;
      return m;
    };
    return { all: count(allRows), last30: count(recentRows) };
  });

// Public — fetch the published landing panes (admin-curated content).
export const getLandingPanes = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await (await __get_admin())
    .from("landing_panes")
    .select("pane_id, kicker, title, summary, reveal, image_url, image_url_mobile, sort_order")
    .eq("is_active", true)
    .eq("status", "published")
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("[landing-panes] fetch error:", error.message);
    return {
      panes: [] as Array<{
        pane_id: string;
        kicker: string;
        title: string;
        summary: string;
        reveal: string;
        image_url: string | null;
        image_url_mobile: string | null;
      }>,
    };
  }
  return { panes: data ?? [] };
});
