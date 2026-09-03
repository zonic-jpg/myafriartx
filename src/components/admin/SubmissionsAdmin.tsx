import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, RefreshCw, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { callAdminBridge, type ArtworkSubmission } from "@/lib/admin-bridge";
import { publicMessage } from "@/lib/public-message";
import { SUBMISSION_MEDIA } from "@/lib/submissions";

type Filter = "pending" | "approved" | "rejected" | "all";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "pending", label: "Awaiting review" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "all", label: "All" },
];

function mediumLabel(value: string | null) {
  return SUBMISSION_MEDIA.find((m) => m.value === value)?.label ?? value ?? "—";
}

function when(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function SubmissionsAdmin() {
  const [filter, setFilter] = useState<Filter>("pending");
  const [items, setItems] = useState<ArtworkSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(
    async (status: Filter, showSpinner = true) => {
      if (showSpinner) setLoading(true);
      try {
        const res = await callAdminBridge<{ submissions: ArtworkSubmission[] }>("submissions.list", {
          status,
        });
        setItems(res.submissions ?? []);
        setNotice(null);
      } catch (e) {
        setItems([]);
        setNotice(publicMessage(e, "The submission queue could not be loaded."));
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void load(filter);
  }, [filter, load]);

  const decide = async (item: ArtworkSubmission, decision: "approved" | "rejected") => {
    let note: string | null = null;
    if (decision === "rejected") {
      note = window.prompt(`Why is “${item.title}” being rejected? The artist sees this.`) ?? null;
      if (note === null) return;
    }
    setBusyId(item.id);
    try {
      await callAdminBridge("submissions.decide", { id: item.id, decision, note });
      toast.success(
        decision === "approved" ? `“${item.title}” is now on the board.` : `“${item.title}” was rejected.`,
      );
    } catch (e) {
      toast.error(publicMessage(e, "Could not save that decision."));
    } finally {
      setBusyId(null);
      await load(filter, false);
    }
  };

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl">Artist submissions</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Work sent through <span className="font-medium">/submit</span>. Approving a piece creates the
            artist if needed and publishes the artwork to the board.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load(filter)}
          className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} aria-hidden />
          Refresh
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`rounded-full border px-3 py-1 text-xs ${
              filter === f.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:bg-accent"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {notice && (
        <p className="mt-4 rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {notice}
        </p>
      )}

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-xl border border-border">
              <Skeleton className="aspect-[4/3] w-full rounded-none" />
              <div className="space-y-2 p-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))
        ) : items.length === 0 ? (
          <p className="col-span-full rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
            {filter === "pending" ? "Nothing is waiting for review." : "No submissions in this view."}
          </p>
        ) : (
          items.map((item) => (
            <article
              key={item.id}
              className="flex flex-col overflow-hidden rounded-xl border border-border bg-background"
            >
              <img
                src={item.image_url}
                alt={item.title}
                className="aspect-[4/3] w-full bg-muted object-cover"
                loading="lazy"
              />
              <div className="flex flex-1 flex-col gap-2 p-4">
                <div>
                  <h3 className="font-medium leading-tight">{item.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {item.artist_name} · {when(item.created_at)}
                  </p>
                </div>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <div>
                    <dt className="sr-only">Medium</dt>
                    <dd>{mediumLabel(item.medium)}</dd>
                  </div>
                  <div>
                    <dt className="sr-only">Size</dt>
                    <dd>{item.size_text ?? "Size not given"}</dd>
                  </div>
                  <div>
                    <dt className="sr-only">Year</dt>
                    <dd>{item.year_created ?? "Year not given"}</dd>
                  </div>
                  <div>
                    <dt className="sr-only">Country</dt>
                    <dd>{item.country_of_origin ?? "—"}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="sr-only">Price</dt>
                    <dd>
                      {item.price_amount
                        ? `${item.price_currency ?? "USD"} ${item.price_amount}`
                        : "Price on request"}
                    </dd>
                  </div>
                </dl>
                {item.context && (
                  <p className="line-clamp-4 text-xs text-muted-foreground">{item.context}</p>
                )}

                <div className="mt-auto pt-3">
                  {item.status === "pending" ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => void decide(item, "approved")}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Approve
                      </button>
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => void decide(item, "rejected")}
                        className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/5 disabled:opacity-50"
                      >
                        <XCircle className="h-3.5 w-3.5" aria-hidden /> Reject
                      </button>
                    </div>
                  ) : (
                    <p
                      className={`flex items-center gap-1.5 text-xs ${
                        item.status === "approved" ? "text-primary" : "text-destructive"
                      }`}
                    >
                      {item.status === "approved" ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Published
                          {item.reviewed_at ? ` ${when(item.reviewed_at)}` : ""}
                          {item.artwork_id && (
                            <ExternalLink className="h-3 w-3 opacity-60" aria-hidden />
                          )}
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3.5 w-3.5" aria-hidden />
                          Rejected{item.review_note ? ` — ${item.review_note}` : ""}
                        </>
                      )}
                    </p>
                  )}
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
