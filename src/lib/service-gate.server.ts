import { getRequest } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/** Resolve the caller from an optional bearer token (null for guests / SSR). */
async function optionalUserId(): Promise<string | null> {
  try {
    const auth = getRequest()?.headers?.get("authorization");
    if (!auth?.startsWith("Bearer ")) return null;
    const { data } = await supabaseAdmin.auth.getUser(auth.slice(7));
    return data?.user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Server-side Free / Freemium / Paid check. The admin switch in Pricing is
 * enforced HERE (not just hidden in the page): a Paid service answers only to
 * admins and members who have bought it. Free and Freemium pass (a Freemium
 * guest allowance is a browser-side taste; members are free).
 * Fails OPEN if pricing cannot be read, so an outage never locks everyone out.
 */
export async function serviceAllowed(serviceId: string, userIdHint?: string | null): Promise<boolean> {
  try {
    const { data: s } = await supabaseAdmin
      .from("service_pricing" as never)
      .select("mode")
      .eq("id", serviceId)
      .maybeSingle();
    const mode = (s as { mode?: string } | null)?.mode ?? "free";
    if (mode !== "paid") return true;
    const uid = userIdHint ?? (await optionalUserId());
    if (!uid) return false;
    const { data: adm } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", uid)
      .eq("role", "admin")
      .maybeSingle();
    if (adm) return true;
    const { data: acc } = await supabaseAdmin
      .from("service_access" as never)
      .select("user_id")
      .eq("user_id", uid)
      .eq("service_id", serviceId)
      .maybeSingle();
    return !!acc;
  } catch (e) {
    console.warn("[service-gate] check failed, allowing", e);
    return true;
  }
}

export async function assertServiceAccess(serviceId: string, userId: string, label: string) {
  if (!(await serviceAllowed(serviceId, userId))) {
    throw new Error(`${label} is a paid service. Unlock it first, then try again.`);
  }
}
