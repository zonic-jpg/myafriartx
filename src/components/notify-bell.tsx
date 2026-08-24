import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { listMyReels } from "@/lib/notify.functions";

export function NotifyBell() {
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    return () => sub.subscription.unsubscribe();
  }, []);

  const list = useServerFn(listMyReels);
  const { data } = useQuery({
    queryKey: ["notify", "reels", "bell"],
    queryFn: () => list(),
    enabled: authed,
    refetchInterval: 60_000,
  });

  if (!authed) return null;
  const unread = data?.unread ?? 0;

  return (
    <Link
      to="/notify/inbox"
      className="relative text-muted-foreground hover:text-foreground"
      title="NotifyMe inbox"
    >
      <span aria-hidden>🔔</span>
      {unread > 0 && (
        <span className="absolute -right-2 -top-2 min-w-[18px] rounded-full bg-primary px-1 text-[10px] font-medium leading-[18px] text-primary-foreground text-center">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
