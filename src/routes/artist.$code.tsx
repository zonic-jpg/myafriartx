import { createFileRoute, Link, useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { getArtistDetail, bumpView } from "@/lib/catalogue.functions";
import { artistDefault } from "@/lib/local-image-assets";
import { outreachWebsiteHref } from "@/lib/outreach-artists";

const artistQuery = (code: string) =>
  queryOptions({
    queryKey: ["artist", code],
    queryFn: () => getArtistDetail({ data: { idOrCode: code } }),
  });

export const Route = createFileRoute("/artist/$code")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(artistQuery(params.code)),
  component: ArtistDetailPage,
  errorComponent: ArtistErrorComponent,
  notFoundComponent: () => (
    <div className="p-8 text-center text-muted-foreground">Artist not found.</div>
  ),
});

function ArtistErrorComponent({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  return (
    <div className="mx-auto max-w-2xl p-8">
      <p className="text-sm text-destructive">Could not load artist: {error.message}</p>
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

function ArtistDetailPage() {
  const { code } = Route.useParams();
  const { data } = useSuspenseQuery(artistQuery(code));
  const bump = useServerFn(bumpView);

  useEffect(() => {
    if (data?.artist?.id) bump({ data: { target: "artists", id: data.artist.id } }).catch(() => {});
  }, [data?.artist?.id]);

  const a = data?.artist as any;
  const works = data?.works ?? [];
  const isOutreach = a?.profile_status === "unclaimed_outreach";
  const website = outreachWebsiteHref(a?.website);
  if (!a) {
    return (
      <div className="mx-auto max-w-2xl p-8 text-center">
        <p className="text-muted-foreground">No artist matches "{code}".</p>
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

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
        <section className="grid gap-6 md:grid-cols-[200px,1fr]">
          <div className="aspect-square overflow-hidden rounded-lg border border-border bg-muted">
            <img
              src={a.portrait_url || artistDefault}
              alt={a.name}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = artistDefault;
              }}
              className="h-full w-full object-contain"
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {a.short_code} · UUID {a.id}
            </p>
            <h1 className="font-display text-3xl">{a.name}</h1>
            <p className="text-sm text-muted-foreground">
              {[a.primary_medium, a.country, a.domicile_city].filter(Boolean).join(" · ")}
              {a.date_of_birth ? ` · b. ${new Date(a.date_of_birth).getFullYear()}` : ""}
            </p>
            {a.bio && <p className="text-sm leading-relaxed">{a.bio}</p>}
            {website && (
              <a
                href={website}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-block text-sm underline underline-offset-4"
              >
                {a.website}
              </a>
            )}
            {isOutreach && (
              <div className="rounded-md border border-dashed border-border bg-muted/40 p-3 text-sm">
                <p className="font-medium">Unclaimed artist profile</p>
                <p className="mt-1 text-muted-foreground">
                  MyAfriArt created this listing from public information so the artist can be found
                  and invited. {a.name} has not claimed it and is not a MyAfriArt member. Only the
                  details shown here are on record.
                </p>
                {a.outreach_note && (
                  <p className="mt-2 text-muted-foreground">
                    <span className="text-foreground">Curator note:</span> {a.outreach_note}
                  </p>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Views: {a.view_count ?? 0}</p>
          </div>
        </section>

        <section>
          <h2 className="font-display text-2xl">Works ({works.length})</h2>
          {works.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              No works listed for this artist yet.
            </p>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {works.map((w: any) => (
                <Link
                  key={w.id}
                  to="/piece/$code"
                  params={{ code: w.short_code }}
                  className="group block"
                >
                  <div className="aspect-[4/5] overflow-hidden rounded-md border border-border bg-muted">
                    {w.image_url && (
                      <img
                        src={w.image_url}
                        alt={w.title}
                        className="h-full w-full object-contain transition"
                      />
                    )}
                  </div>
                  <p className="mt-1 truncate text-sm font-medium">{w.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {w.short_code} · {w.lifecycle_status}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
