import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { adminGateActive, adminGateEmail } from "@/lib/adminGate";

/**
 * Persistent banner when the visitor holds a soft orbit admin session but no
 * Supabase JWT — privileged server actions need the bridge or a real sign-in.
 */
export function OrbitSessionNotice() {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const sync = async () => {
      const gate = adminGateActive();
      if (!gate) {
        setVisible(false);
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (data.session?.access_token) {
        setVisible(false);
        return;
      }
      setEmail(adminGateEmail());
      setVisible(true);
    };

    void sync();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void sync();
    });
    const onStorage = () => void sync();
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onStorage);

    return () => {
      sub.subscription.unsubscribe();
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onStorage);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      role="status"
      className="border-b border-amber-300/70 bg-amber-50 px-4 py-2.5 text-center text-xs text-amber-950"
    >
      <p className="inline-flex flex-wrap items-center justify-center gap-2">
        <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-amber-800" aria-hidden />
        <span>
          Signed in as <strong>{email || "admin"}</strong> on a pending orbit session — no Supabase JWT
          yet. Catalogue saves and the shared approval queue use the admin bridge; some server tools may
          ask you to sign in again.
        </span>
        <Link to="/login" className="font-medium underline underline-offset-2 hover:text-amber-900">
          Full sign-in
        </Link>
      </p>
    </div>
  );
}
