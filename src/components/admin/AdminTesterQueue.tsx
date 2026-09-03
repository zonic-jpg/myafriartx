import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, RefreshCw, ShieldQuestion, XCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  AWAITING_MSG,
  decideAccessRequest,
  listAccessRequests,
  type PendingEntry,
} from "@/lib/adminTesterApproval";
import { publicMessage } from "@/lib/public-message";

function when(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "unknown date";
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AdminTesterQueue() {
  const [entries, setEntries] = useState<PendingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyEmail, setBusyEmail] = useState<string | null>(null);

  const load = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    const result = await listAccessRequests();
    setEntries(result.entries);
    setNotice(result.notice);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const decide = async (email: string, decision: "approved" | "rejected") => {
    setBusyEmail(email);
    try {
      await decideAccessRequest(email, decision);
      toast.success(decision === "approved" ? `Approved ${email}` : `Declined ${email}`);
    } catch (e) {
      toast.error(publicMessage(e, "Could not save that decision."));
    } finally {
      setBusyEmail(null);
      await load(false);
    }
  };

  const pending = entries.filter((e) => e.status === "pending");
  const decided = entries.filter((e) => e.status !== "pending");

  return (
    <section
      id="admintester-queue"
      className="scroll-mt-24 rounded-xl border border-border bg-card p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-xl">
            <ShieldQuestion className="h-5 w-5 text-primary" aria-hidden />
            Pending approvals
            {!loading && pending.length > 0 && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                {pending.length}
              </span>
            )}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Testers who signed in with a shared admin password wait here until you approve them.{" "}
            {AWAITING_MSG}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} aria-hidden />
          Refresh
        </button>
      </div>

      {notice && (
        <p className="mt-4 rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {notice}
        </p>
      )}

      <div className="mt-4 space-y-2">
        {loading ? (
          <>
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </>
        ) : pending.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            No one is waiting for approval right now.
          </p>
        ) : (
          pending.map((entry) => (
            <div
              key={`${entry.email}-${entry.requestedAt}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background px-4 py-3"
            >
              <div className="min-w-0">
                <div className="truncate font-medium">{entry.identity || entry.email}</div>
                <div className="text-xs text-muted-foreground">
                  {entry.identity && entry.identity !== entry.email ? `${entry.email} · ` : ""}
                  requested {when(entry.requestedAt)}
                  {entry.source === "device" ? " · this device only" : ""}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  disabled={busyEmail === entry.email}
                  onClick={() => void decide(entry.email, "approved")}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                  Approve
                </button>
                <button
                  type="button"
                  disabled={busyEmail === entry.email}
                  onClick={() => void decide(entry.email, "rejected")}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/5 disabled:opacity-50"
                >
                  <XCircle className="h-3.5 w-3.5" aria-hidden />
                  Reject
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {decided.length > 0 && (
        <details className="mt-5 border-t border-border pt-4">
          <summary className="cursor-pointer text-sm font-medium">
            Decided ({decided.length})
          </summary>
          <ul className="mt-3 space-y-1.5 text-sm">
            {decided.map((entry) => (
              <li
                key={`${entry.email}-${entry.status}-${entry.requestedAt}`}
                className="flex flex-wrap items-center justify-between gap-2"
              >
                <span className="truncate">{entry.email}</span>
                <span className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className={entry.status === "approved" ? "text-primary" : "text-destructive"}>
                    {entry.status === "approved" ? "Approved" : "Rejected"}
                    {entry.decidedAt ? ` ${when(entry.decidedAt)}` : ""}
                  </span>
                  <button
                    type="button"
                    disabled={busyEmail === entry.email}
                    onClick={() =>
                      void decide(entry.email, entry.status === "approved" ? "rejected" : "approved")
                    }
                    className="underline-offset-2 hover:underline disabled:opacity-50"
                  >
                    {entry.status === "approved" ? "Revoke" : "Approve"}
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
