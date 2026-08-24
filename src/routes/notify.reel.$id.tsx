import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getReel, markReelViewed } from "@/lib/notify.functions";

export const Route = createFileRoute("/notify/reel/$id")({
  head: () => ({ meta: [{ title: "Reel — NotifyMe" }] }),
  component: ReelPage,
});

function ReelPage() {
  const { id } = useParams({ from: "/notify/reel/$id" });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    return () => sub.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (authed === false) navigate({ to: "/login" });
  }, [authed, navigate]);

  const fetchReel = useServerFn(getReel);
  const markViewed = useServerFn(markReelViewed);
  const { data } = useQuery({
    queryKey: ["notify", "reel", id],
    queryFn: () => fetchReel({ data: { id } }),
    enabled: !!authed,
  });

  const mark = useMutation({
    mutationFn: () => markViewed({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notify"] }),
  });

  useEffect(() => {
    if (data?.reel && !data.reel.viewed_at) mark.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.reel?.id]);

  if (!authed || !data)
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  if (!data.reel)
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Reel not found.
      </div>
    );

  const panes = data.panes;
  const total = panes.length;
  const current = panes[idx];

  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      <header className="flex items-center justify-between border-b border-white/10 px-5 py-3">
        <Link to="/notify/inbox" className="text-sm text-white/70 hover:text-white">
          ← Inbox
        </Link>
        <div className="text-xs text-white/60">
          {idx + 1} / {total}
        </div>
        <Link to="/notify" className="text-sm text-white/70 hover:text-white">
          Settings
        </Link>
      </header>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        {current?.kind === "artwork" && current.artwork && (
          <Link
            to="/piece/$code"
            params={{ code: current.artwork.short_code ?? current.artwork.id }}
            className="block max-h-full max-w-full"
          >
            <img
              src={current.artwork.image_url}
              alt={current.artwork.title}
              className="max-h-[75vh] max-w-[90vw] object-contain"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-6">
              <div className="font-display text-2xl">{current.artwork.title}</div>
              <div className="mt-1 text-sm text-white/80">
                {current.artwork.artist?.name}{" "}
                {current.artwork.artist?.country ? `· ${current.artwork.artist.country}` : ""}
              </div>
              {current.artwork.price != null && (
                <div className="mt-1 text-sm text-white/80">
                  {current.artwork.currency} {Number(current.artwork.price).toLocaleString()}
                </div>
              )}
            </div>
          </Link>
        )}
        {current?.kind === "sponsor" && current.sponsor && (
          <a
            href={current.sponsor.link_url ?? "#"}
            target={current.sponsor.link_url ? "_blank" : undefined}
            rel="noreferrer"
            className="relative block max-h-full max-w-full"
          >
            <img
              src={current.sponsor.image_url}
              alt={current.sponsor.headline ?? "Sponsor"}
              className="max-h-[75vh] max-w-[90vw] object-contain"
            />
            <span className="absolute left-4 top-4 rounded bg-white/10 px-2 py-1 text-[10px] uppercase tracking-wider text-white/80">
              Sponsored
            </span>
            {current.sponsor.headline && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                <div className="font-display text-2xl">{current.sponsor.headline}</div>
              </div>
            )}
          </a>
        )}

        <button
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
          className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-xl hover:bg-white/20 disabled:opacity-30"
          disabled={idx === 0}
        >
          ‹
        </button>
        <button
          onClick={() => setIdx((i) => Math.min(total - 1, i + 1))}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-xl hover:bg-white/20 disabled:opacity-30"
          disabled={idx >= total - 1}
        >
          ›
        </button>
      </div>

      <div className="flex gap-1 px-5 py-3">
        {panes.map((p, i) => (
          <div
            key={p.position}
            className={`h-1 flex-1 rounded ${i <= idx ? "bg-white" : "bg-white/20"}`}
          />
        ))}
      </div>
    </div>
  );
}
