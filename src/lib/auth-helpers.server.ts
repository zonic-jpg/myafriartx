import { supabaseAdmin } from "@/integrations/supabase/client.server";

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
  if (!data) throw new Error("Forbidden: admin only");
}
