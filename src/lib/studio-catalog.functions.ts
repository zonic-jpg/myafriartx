// Studio (signed-in) catalogue + render helpers. Honors the
// `mock_catalogue_enabled` admin setting the same way the landing-page
// catalogue does (see `catalogue.functions.ts`).
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// De-Lovabled build: server-only deps loaded lazily so they never enter the
// client bundle (TanStack Start import-protection). Handlers still run server-side.
const signRenderImageUrls = async (...__a: any[]): Promise<any> =>
  ((await import("./render-urls.server")).signRenderImageUrls as any)(...__a);

function readMockEnabled(value: unknown) {
  return typeof value === "boolean" ? value : true;
}

export const getCatalog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const settings = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "mock_catalogue_enabled")
      .maybeSingle();
    const source = readMockEnabled(settings.data?.value) ? "mock" : "live";
    const [styles, artworks, artists] = await Promise.all([
      supabase.from("styles").select("*").eq("is_active", true).order("sort_order"),
      (supabase.from("artworks") as any)
        .select("*")
        .eq("is_active", true)
        .eq("content_source", source),
      (supabase.from("artists") as any).select("id,name").eq("content_source", source),
    ]);
    return {
      styles: styles.data ?? [],
      artworks: artworks.data ?? [],
      artists: artists.data ?? [],
    };
  });

export const getMyRenders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("renders")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    return { renders: await Promise.all((data ?? []).map(signRenderImageUrls)) };
  });

export const getLatestRender = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("renders")
      .select("id,status,result_image_url,source_image_url,error_message,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return { render: data ? await signRenderImageUrls(data) : null };
  });
