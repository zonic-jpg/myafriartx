import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  adminListVerifications,
  adminReviewVerification,
  adminGetDocumentUrl,
} from "@/lib/kyc.functions";

type Filter = "pending" | "verified" | "rejected" | "all";

export function KycAdmin() {
  const listFn = useServerFn(adminListVerifications);
  const reviewFn = useServerFn(adminReviewVerification);
  const docUrlFn = useServerFn(adminGetDocumentUrl);
  const qc = useQueryClient();

  const [filter, setFilter] = useState<Filter>("pending");
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin", "kyc", filter],
    queryFn: () => listFn({ data: { status: filter } }),
  });

  const review = async (userId: string, decision: "verified" | "rejected") => {
    try {
      await reviewFn({ data: { userId, decision, reason: reasons[userId] } });
      toast.success(decision === "verified" ? "Member verified" : "Submission rejected");
      qc.invalidateQueries({ queryKey: ["admin", "kyc"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Review failed");
    }
  };

  const viewDocument = async (userId: string) => {
    try {
      const { url } = await docUrlFn({ data: { userId } });
      window.open(url, "_blank", "noopener");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open document");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Review identity documents before granting collateral and high-value escrow access.
          Documents open via 10-minute signed URLs.
        </p>
        <div className="flex gap-1 rounded-md border border-border p-1 text-xs">
          {(["pending", "verified", "rejected", "all"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded px-2 py-1 capitalize ${filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading queue…</p>}

      {rows.map((r) => (
        <div key={r.user_id} className="rounded-lg border border-border p-4 text-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-medium">
                {r.full_name ?? r.display_name}{" "}
                <span className="text-muted-foreground">({r.display_name})</span>
              </p>
              <p className="text-muted-foreground">
                {String(r.id_type ?? "—").replace(/_/g, " ")} · ref {r.id_reference ?? "—"} ·
                submitted {r.submitted_at ? new Date(r.submitted_at).toLocaleString() : "—"}
              </p>
              {r.rejected_reason && (
                <p className="mt-1 text-destructive">Rejected: {r.rejected_reason}</p>
              )}
            </div>
            <span
              className={`rounded px-2 py-0.5 text-xs uppercase tracking-wide ${
                r.status === "verified"
                  ? "bg-emerald-500/15 text-emerald-700"
                  : r.status === "pending"
                    ? "bg-amber-500/15 text-amber-700"
                    : "bg-destructive/15 text-destructive"
              }`}
            >
              {r.status}
            </span>
          </div>

          {r.status === "pending" && (
            <>
              <input
                className="mt-3 w-full rounded border border-border bg-background px-3 py-2 text-sm"
                placeholder="Rejection reason (required to reject — shown to the member)"
                value={reasons[r.user_id] ?? ""}
                onChange={(e) => setReasons((n) => ({ ...n, [r.user_id]: e.target.value }))}
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {r.document_path && (
                  <button
                    type="button"
                    onClick={() => viewDocument(r.user_id)}
                    className="rounded border border-border px-3 py-1.5 text-xs hover:bg-muted"
                  >
                    View document
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => review(r.user_id, "verified")}
                  className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => review(r.user_id, "rejected")}
                  className="rounded bg-destructive px-3 py-1.5 text-xs font-medium text-white"
                >
                  Reject
                </button>
              </div>
            </>
          )}
        </div>
      ))}
      {!isLoading && rows.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No {filter === "all" ? "" : filter} submissions.
        </p>
      )}
    </div>
  );
}
