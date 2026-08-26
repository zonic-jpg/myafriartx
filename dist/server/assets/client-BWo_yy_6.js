import { createClient } from "@supabase/supabase-js";
function createSupabaseClient() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    const missing = [
      ...!SUPABASE_URL ? ["SUPABASE_URL"] : [],
      ...!SUPABASE_PUBLISHABLE_KEY ? ["SUPABASE_PUBLISHABLE_KEY"] : []
    ];
    console.error(
      `[Supabase] Missing environment variable(s): ${missing.join(", ")}. Set them in your .env; the app will render but backend calls will not work until configured.`
    );
  }
  return createClient(
    SUPABASE_URL || "https://placeholder.supabase.co",
    SUPABASE_PUBLISHABLE_KEY || "placeholder-anon-key",
    {
      auth: {
        storage: typeof window !== "undefined" ? localStorage : void 0,
        persistSession: true,
        autoRefreshToken: true
      }
    }
  );
}
let _supabase;
const supabase = new Proxy({}, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  }
});
export {
  supabase as s
};
