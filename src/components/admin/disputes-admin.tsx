import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { adminListDisputes, adminResolveDispute } from "@/lib/disputes.functions";

type Filter = "open" | "resolved" | "rejected" | "all";

export function DisputesAdmin() {
  const listFn = useServerFn(adminListDisputes);
  const resolveFn = useServerFn(adminResolveDispute);
  const qc = useQueryClient();

  const [filter, setFilter] = useState<Filter>("open");
  const [resolutions, setResolutions] = useState<Record<string, string>>({});
  const [refunds, setRefunds] = useState<Record<string, boolean>>({});

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin", "disputes", filter],
    queryFn: () => listFn({ data: { status: filter } }),
  });

  const resolve = async (disputeId: string, outcome: "resolved" | "rejected") => {
    const resolution = (resolutions[disputeId] ?? "").trim();
    if (resolution.length < 10) return toast.error("Write a resolution note (min 10 characters).");
    try {
      await resolveFn({
        data: {
          disputeId,
          outcome,
          resolution,
          refundEscrow: outcome === "resolved" && (refunds[disputeId] ?? false),
        },
      });
      toast.success(outcome === "resolved" ? "Dispute resolved" : "Dispute rejected");
      qc.invalidateQueries({ queryKey: ["admin", "disputes"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Resolution failed");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Open disputes freeze any escrow hold on the payment. Resolving with refund releases the
          escrow back to the buyer and marks the payment refunded — atomically.
        </p>
        <div className="flex gap-1 rounded-md border border-border p-1 text-xs">
          {(["open", "resolved", "rejected", "all"] as Filter[]).map((f) => (
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

      {isLoading && <p className="text-sm text-muted-foreground">Loading disputes…</p>}

      {rows.map((d) => {
        const payment = d.payment as {
          purpose?: string;
          amount_ngn?: number;
          provider_ref?: string;
          metadata?: Record<string, string>;
        } | null;
        return (
          <div key={String(d.id)} className="rounded-lg border border-border p-4 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">
                  {payment?.metadata?.title ?? payment?.purpose ?? "Payment"} · ₦
                  {Number(payment?.amount_ngn ?? 0).toLocaleString()}
                </p>
                <p className="text-muted-foreground">
                  by {String(d.opener_name)} · {new Date(String(d.created_at)).toLocaleString()} ·
                  ref {payment?.provider_ref ?? "—"}
                  {d.escrow_hold_id ? " · escrow attached" : ""}
                </p>
              </div>
              <span
                className={`rounded px-2 py-0.5 text-xs uppercase tracking-wide ${
                  d.status === "open"
                    ? "bg-amber-500/15 text-amber-700"
                    : d.status === "resolved"
                      ? "bg-emerald-500/15 text-emerald-700"
                      : "bg-destructive/15 text-destructive"
                }`}
              >
                {String(d.status)}
              </span>
            </div>

            <p className="mt-2 rounded bg-muted/40 p-3">{String(d.reason)}</p>
            {d.resolution && (
              <p className="mt-2 text-muted-foreground">
                <strong>Resolution:</strong> {String(d.resolution)}
              </p>
            )}

            {d.status === "open" && (
              <div className="mt-3 space-y-2">
                <textarea
                  rows={2}
                  className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                  placeholder="Resolution note (shown to the member)"
                  value={resolutions[String(d.id)] ?? ""}
                  onChange={(e) =>
                    setResolutions((n) => ({ ...n, [String(d.id)]: e.target.value }))
                  }
                />
                <div className="flex flex-wrap items-center gap-3">
                  {d.escrow_hold_id && (
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={refunds[String(d.id)] ?? false}
                        onChange={(e) =>
                          setRefunds((n) => ({ ...n, [String(d.id)]: e.target.checked }))
                        }
                      />
                      Refund escrow to buyer
                    </label>
                  )}
                  <button
                    type="button"
                    onClick={() => resolve(String(d.id), "resolved")}
                    className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white"
                  >
                    Resolve in buyer's favour
                  </button>
                  <button
                    type="button"
                    onClick={() => resolve(String(d.id), "rejected")}
                    className="rounded bg-destructive px-3 py-1.5 text-xs font-medium text-white"
                  >
                    Reject dispute
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
      {!isLoading && rows.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No {filter === "all" ? "" : filter} disputes.
        </p>
      )}
    </div>
  );
}
