import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { isVerifiedOwner } from "./foundingOwner";

/**
 * The founding owner is recognised by a VERIFIED email (never a password).
 * Make sure that account holds the admin role row so every server function
 * that checks `user_roles` works for them without any manual DB step.
 * No-op for everyone else. Never throws.
 */
export async function ensureOwnerAdminRole(userId: string): Promise<boolean> {
  try {
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (!isVerifiedOwner(u?.user)) return false;
    const { data: existing } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (existing) return true;
    const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "admin" });
    if (error) {
      console.warn("[owner] could not grant admin role row", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[owner] ensureOwnerAdminRole skipped", err);
    return false;
  }
}

/**
 * Throws if the given user is not an admin. Use inside server function
 * handlers that require admin privileges (after `requireSupabaseAuth`).
 */
export async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data && (await ensureOwnerAdminRole(userId))) return;
  if (!data) throw new Error("Forbidden: admin only");
}
