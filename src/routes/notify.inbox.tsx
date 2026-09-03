import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { listMyReels } from "@/lib/notify.functions";

export const Route = createFileRoute("/notify/inbox")({
  head: () => ({ meta: [{ title: "Inbox — NotifyMe" }] }),
  component: InboxPage,
});

function InboxPage() {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState<boolean | null>(null);
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    return () => sub.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (authed === false) navigate({ to: "/login" });
  }, [authed, navigate]);

  const list = useServerFn(listMyReels);
  const { data } = useQuery({
    queryKey: ["notify", "reels"],
    queryFn: () => list(),
    enabled: !!authed,
  });

  if (!authed)
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  const reels = data?.reels ?? [];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link to="/" className="font-display text-xl">
            MyAfriArt
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link to="/notify" className="text-muted-foreground hover:text-foreground">
              Settings
            </Link>
            <Link to="/studio" className="text-muted-foreground hover:text-foreground">
              Studio
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="font-display text-3xl">Your reels</h1>
        {reels.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">
            No reels yet.{" "}
            <Link to="/notify" className="underline">
              Set up NotifyMe
            </Link>{" "}
            to start receiving curated picks.
          </p>
        ) : (
          <ul className="mt-6 divide-y divide-border rounded-lg border border-border">
            {reels.map((r: any) => (
              <li key={r.id}>
                <Link
                  to="/notify/reel/$id"
                  params={{ id: r.id }}
                  className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-accent"
                >
                  <div>
                    <div className="font-medium">Reel · 12 panes</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()} · {r.status}
                    </div>
                  </div>
                  {!r.viewed_at && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                      new
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
