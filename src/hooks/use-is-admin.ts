import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** True only for signed-in admins. Public visitors never see internal IDs. */
export function useIsAdmin(): boolean {
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
        if (active) setIsAdmin(!!roles?.some((r) => r.role === "admin"));
      } catch {
        /* stay false */
      }
    })();
    return () => { active = false; };
  }, []);
  return isAdmin;
}
