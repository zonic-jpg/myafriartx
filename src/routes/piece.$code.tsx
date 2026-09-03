import { createFileRoute, Link, useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getPieceDetail, bumpView } from "@/lib/catalogue.functions";
import { initializePayment } from "@/lib/payments.functions";
import { supabase } from "@/integrations/supabase/client";

const pieceQuery = (code: string) =>
  queryOptions({
    queryKey: ["piece", code],
    queryFn: () => getPieceDetail({ data: { idOrCode: code } }),
  });

export const Route = createFileRoute("/piece/$code")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(pieceQuery(params.code)),
  component: PieceDetailPage,
  errorComponent: PieceErrorComponent,
  notFoundComponent: () => (
    <div className="p-8 text-center text-muted-foreground">Piece not found.</div>
  ),
});

function PieceErrorComponent({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  return (
    <div className="mx-auto max-w-2xl p-8">
      <p className="text-sm text-destructive">Could not load piece: {error.message}</p>
      <button
        className="mt-3 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"
        onClick={() => {
          reset();
          router.invalidate();
        }}
      >
        Retry
      </button>
    </div>
  );
}

function PieceDetailPage() {
  const { code } = Route.useParams();
  const { data } = useSuspenseQuery(pieceQuery(code));
  const bump = useServerFn(bumpView);
  const payFn = useServerFn(initializePayment);
  const [buyMsg, setBuyMsg] = useState("");
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    if (data?.piece?.id) bump({ data: { target: "artworks", id: data.piece.id } }).catch(() => {});
  }, [data?.piece?.id]);

  const p = data?.piece;
  if (!p) {
    return (
      <div className="mx-auto max-w-2xl p-8 text-center">
        <p className="text-muted-foreground">No piece matches "{code}".</p>
        <Link to="/" className="mt-4 inline-block text-sm underline">
          Back to catalogue
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-gradient-to-r from-purple-600 to-red-500 text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="font-display text-lg">
            MyAfriArt
          </Link>
          <Link to="/" className="text-sm text-white/80 hover:text-white">
            ← Back to catalogue
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-8 px-4 py-8 sm:px-6 md:grid-cols-2">
        <div className="aspect-[4/5] overflow-hidden rounded-lg border border-border bg-muted md:aspect-auto md:max-h-[75vh]">
          {p.image_url && (
            <img src={p.image_url} alt={p.title} className="h-full w-full object-contain" />
          )}
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {p.short_code} · UUID {p.id}
            </p>
            <h1 className="font-display text-3xl">{p.title}</h1>
            {p.artist && (
              <Link
                to="/artist/$code"
                params={{ code: p.artist.short_code ?? "" }}
                className="mt-1 inline-block text-sm text-primary underline"
              >
                by {p.artist.name} ({p.artist.country})
              </Link>
            )}
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Row label="Status" value={p.lifecycle_status} />
            <Row label="Medium" value={p.medium} />
            <Row label="Year" value={p.year ?? "—"} />
            <Row
              label="Price"
              value={p.price != null ? `${p.currency} ${Number(p.price).toLocaleString()}` : "—"}
            />
            <Row label="Views" value={String(p.view_count ?? 0)} />
            <Row
              label="Date loaded"
              value={p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}
            />
            <Row
              label="Last updated"
              value={p.updated_at ? new Date(p.updated_at).toLocaleDateString() : "—"}
            />
            <Row label="Source" value={p.content_source} />
          </dl>
          {p.description && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Description
              </p>
              <p className="mt-1 text-sm leading-relaxed">{p.description}</p>
            </div>
          )}

          {p.is_pledged && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900">
              This work is pledged as collateral and cannot be purchased until the lien is released.
            </div>
          )}

          {p.price != null && Number(p.price) > 0 && !p.is_pledged && (
            <div className="space-y-2 rounded-xl border border-border p-4">
              <p className="text-sm font-medium">Acquire this work</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={buying}
                  className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
                  onClick={async () => {
                    const { data: sess } = await supabase.auth.getSession();
                    if (!sess.session) {
                      setBuyMsg("Sign in to purchase.");
                      return;
                    }
                    setBuying(true);
                    setBuyMsg("");
                    try {
                      const amount = Math.round(Number(p.price));
                      const res = await payFn({
                        data: {
                          purpose: "artwork_purchase",
                          amountNgn: amount,
                          metadata: {
                            artwork_id: p.id,
                            short_code: p.short_code ?? code,
                            title: p.title,
                          },
                        },
                      });
                      if (res.authorizationUrl) window.location.href = res.authorizationUrl;
                    } catch (e) {
                      setBuyMsg(e instanceof Error ? e.message : "Checkout failed");
                    } finally {
                      setBuying(false);
                    }
                  }}
                >
                  {buying
                    ? "Redirecting…"
                    : `Buy now · ${p.currency} ${Number(p.price).toLocaleString()}`}
                </button>
                <Link
                  to="/lounge"
                  search={{ tab: "sell" }}
                  className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted"
                >
                  Private sale via Lounge
                </Link>
                <Link
                  to="/collateral"
                  className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted"
                >
                  Use as collateral
                </Link>
              </div>
              {buyMsg && <p className="text-xs text-destructive">{buyMsg}</p>}
            </div>
          )}
          {Array.isArray(p.dominant_palette) && p.dominant_palette.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Palette
              </p>
              <div className="mt-1 flex gap-1">
                {p.dominant_palette.map((c: string, i: number) => (
                  <span
                    key={i}
                    className="h-6 w-6 rounded border border-border"
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}
