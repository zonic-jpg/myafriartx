import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getArtworkProvenance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ artworkId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: events, error } = await context.supabase
      .from("provenance_events")
      .select("*")
      .eq("artwork_id", data.artworkId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return events ?? [];
  });

export const verifyCertificate = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ code: z.string().min(6).max(20) }).parse(d))
  .handler(async ({ data }) => {
    const admin = await import("@/integrations/supabase/client.server").then(
      (m) => m.supabaseAdmin,
    );
    const { data: cert, error } = await admin
      .from("certificate_registry")
      .select("*")
      .eq("verify_code", data.code.toUpperCase())
      .is("revoked_at", null)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return cert;
  });
