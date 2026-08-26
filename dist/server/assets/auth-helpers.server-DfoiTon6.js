import { supabaseAdmin } from "./client.server-D5ro3rAQ.js";
import "@supabase/supabase-js";
async function assertAdmin(userId) {
  const { data, error } = await supabaseAdmin.from("user_roles").select("id").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin only");
}
export {
  assertAdmin
};
