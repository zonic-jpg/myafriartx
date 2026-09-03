import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMyRenders } from "@/lib/studio-catalog.functions";
import { localImageForKey } from "@/lib/local-image-assets";

export const Route = createFileRoute("/renders")({
  head: () => ({ meta: [{ title: "My renders — MyAfriArt" }] }),
  component: RendersPage,
});

function RendersPage() {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState<boolean | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
  }, []);
  useEffect(() => {
    if (authed === false) navigate({ to: "/login" });
  }, [authed, navigate]);
  if (!authed)
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  return <List />;
}

function List() {
  const fn = useServerFn(getMyRenders);
  const { data, isLoading } = useQuery({ queryKey: ["my-renders"], queryFn: () => fn() });
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="font-display text-xl">
            MyAfriArt
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <button
              onClick={() => window.location.reload()}
              className="text-muted-foreground hover:text-foreground"
              title="Reload page"
            >
              ↻ Refresh
            </button>
            <Link to="/studio" className="text-muted-foreground hover:text-foreground">
              Studio →
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="font-display text-3xl">My renders</h1>
        {isLoading ? (
          <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
        ) : (data?.renders ?? []).length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">
            No renders yet.{" "}
            <Link to="/studio" className="underline">
              Stage a room →
            </Link>
          </p>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data!.renders.map((r: any) => (
              <div key={r.id} className="overflow-hidden rounded-md border border-border bg-card">
                {r.result_image_url ? (
                  <img
                    src={localImageForKey(r.id)}
                    alt="Render"
                    className="aspect-[4/3] w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-[4/3] w-full items-center justify-center bg-muted text-xs uppercase tracking-wider text-muted-foreground">
                    {r.status}
                  </div>
                )}
                <div className="flex items-center justify-between px-3 py-2 text-xs text-muted-foreground">
                  <span>{new Date(r.created_at).toLocaleString()}</span>
                  <span className="capitalize">{r.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
