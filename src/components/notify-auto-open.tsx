import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getUndeliveredReel, markReelDelivered } from "@/lib/notify.functions";

const SEEN_KEY = "notify_autoopen_seen_v1";

/**
 * Once per browser session, checks if the signed-in user has an undelivered reel
 * (status != viewed, never opened). If so, marks it delivered and navigates to it.
 */
export function NotifyAutoOpen() {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState(false);
  const fetchUndelivered = useServerFn(getUndeliveredReel);
  const markDelivered = useServerFn(markReelDelivered);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!authed) return;
    let cancelled = false;
    (async () => {
      try {
        if (sessionStorage.getItem(SEEN_KEY)) return;
        // Don't auto-open if the user is already inside the reel flow.
        if (window.location.pathname.startsWith("/notify")) return;
        const { reelId } = await fetchUndelivered();
        if (cancelled || !reelId) return;
        sessionStorage.setItem(SEEN_KEY, "1");
        await markDelivered({ data: { id: reelId } });
        navigate({ to: "/notify/reel/$id", params: { id: reelId } });
      } catch {
        // Silent — non-critical.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authed, fetchUndelivered, markDelivered, navigate]);

  return null;
}
