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

const contentSchema = z.object({
  content: z.record(z.record(z.string())),
  media: z.record(z.string().nullable()),
});

export const getSiteContent = createServerFn({ method: "GET" }).handler(async () => {
  const { data } = await (await __get_admin())
    .from("app_settings")
    .select("value")
    .eq("key", "site_content")
    .maybeSingle();
  const val = data?.value;
  if (val && typeof val === "object" && "content" in (val as object)) {
    return val as z.infer<typeof contentSchema>;
  }
  return null;
});

export const publishSiteContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => contentSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await (await __get_admin()).from("app_settings").upsert({
      key: "site_content",
      value: data as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
