import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import SiteFooter from "@/components/SiteFooter";
import { listLiveEvents } from "@/lib/events.functions";

export const Route = createFileRoute("/events")({
  component: EventsPage,
  head: () => ({
    meta: [
      { title: "Live Events — MyAfriArt" },
      {
        name: "description",
        content:
          "Upcoming art fairs, gallery openings, biennials, and salon evenings across Africa and the diaspora.",
      },
    ],
  }),
});

function EventsPage() {
  const fetchEvents = useServerFn(listLiveEvents);
  const from = "2026-10-01T00:00:00.000Z";
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["live-events", "public", from],
    queryFn: () => fetchEvents({ data: { from } }),
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Link to="/" className="font-display text-xl">
            MyAfriArt
          </Link>
          <Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground">
            Admin
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Calendar</p>
        <h1 className="mt-2 font-display text-4xl">Live events</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Art fairs, gallery openings, biennials, and salon evenings — curated for collectors across Africa and the
          diaspora.
        </p>

        {isLoading ? (
          <p className="mt-10 text-sm text-muted-foreground">Loading upcoming events…</p>
        ) : (
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {events.map((ev) => (
              <article key={ev.id} className="overflow-hidden rounded-xl border border-border bg-card">
                {ev.image_url ? (
                  <img src={ev.image_url} alt="" className="h-44 w-full object-cover" />
                ) : null}
                <div className="space-y-2 p-5">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {new Date(ev.starts_at).toLocaleString()}
                    {ev.category ? ` · ${ev.category}` : ""}
                  </p>
                  <h2 className="font-display text-2xl">{ev.title}</h2>
                  <p className="text-sm text-muted-foreground">
                    {[ev.venue, ev.city, ev.country].filter(Boolean).join(", ")}
                  </p>
                  {ev.description ? <p className="text-sm leading-relaxed">{ev.description}</p> : null}
                  {ev.detail_text && ev.detail_text !== ev.description ? (
                    <p className="text-sm leading-relaxed text-muted-foreground">{ev.detail_text}</p>
                  ) : null}
                  {ev.tags?.length ? (
                    <p className="text-xs text-muted-foreground">{ev.tags.join(" · ")}</p>
                  ) : null}
                  {ev.ticket_url ? (
                    <a
                      href={ev.ticket_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block text-sm font-medium underline"
                    >
                      Tickets / RSVP
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}

        {!isLoading && !events.length && (
          <p className="mt-10 text-sm text-muted-foreground">No upcoming published events.</p>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
