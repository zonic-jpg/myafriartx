import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { listMyDisputablePayments, openDispute } from "@/lib/disputes.functions";

export const Route = createFileRoute("/disputes")({
  component: DisputesPage,
  head: () => ({ meta: [{ title: "Payment disputes — MyAfriArt" }] }),
});

type PaymentRow = Awaited<ReturnType<typeof listMyDisputablePayments>>[number];

const PURPOSE_LABELS: Record<string, string> = {
  artwork_purchase: "Artwork purchase",
  auction_settlement: "Auction settlement",
  brokerage_fee: "Brokerage fee",
  collateral_fee: "Collateral fee",
};

function DisputesPage() {
  const navigate = useNavigate();
  const listFn = useServerFn(listMyDisputablePayments);
  const openFn = useServerFn(openDispute);

  const [authed, setAuthed] = useState<boolean | null>(null);
  const [payments, setPayments] = useState<PaymentRow[] | null>(null);
  const [disputing, setDisputing] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session);
      if (!data.session) navigate({ to: "/login" });
    });
  }, [navigate]);

  const refresh = () =>
    listFn()
      .then(setPayments)
      .catch(() => setPayments([]));

  useEffect(() => {
    if (authed) refresh();
  }, [authed]);

  const submit = async (paymentId: string) => {
    setBusy(true);
    try {
      await openFn({ data: { paymentId, reason } });
      toast.success("Dispute opened — our team will review and contact you.");
      setDisputing(null);
      setReason("");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not open dispute");
    } finally {
      setBusy(false);
    }
  };

  if (authed === null || (authed && payments === null)) {
    return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-6 py-10">
      <Link to="/" className="text-sm text-primary underline">
        ← MyAfriArt
      </Link>
      <h1 className="mt-6 font-display text-3xl">Payments & disputes</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        If a purchase went wrong — the work never arrived, arrived damaged, or isn't as described —
        open a dispute. Escrow funds are frozen while a dispute is under review.
      </p>

      <div className="mt-8 space-y-4">
        {(payments ?? []).map((p) => {
          const meta = (p.metadata ?? {}) as Record<string, string>;
          return (
            <div key={p.id} className="rounded-lg border border-border p-4 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {PURPOSE_LABELS[p.purpose] ?? p.purpose}
                    {meta.title ? ` — ${meta.title}` : ""}
                  </p>
                  <p className="text-muted-foreground">
                    ₦{Number(p.amount_ngn).toLocaleString()} ·{" "}
                    {new Date(p.created_at).toLocaleDateString()} · ref {p.provider_ref}
                  </p>
                </div>
                <span
                  className={`rounded px-2 py-0.5 text-xs uppercase tracking-wide ${
                    p.status === "refunded"
                      ? "bg-sky-500/15 text-sky-700"
                      : "bg-emerald-500/15 text-emerald-700"
                  }`}
                >
                  {p.status}
                </span>
              </div>

              {p.dispute ? (
                <div className="mt-3 rounded border border-border bg-muted/40 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Dispute · {p.dispute.status}
                  </p>
                  <p className="mt-1">{p.dispute.reason}</p>
                  {p.dispute.resolution && (
                    <p className="mt-2 text-muted-foreground">
                      <strong>Outcome:</strong> {p.dispute.resolution}
                    </p>
                  )}
                </div>
              ) : p.status === "succeeded" ? (
                disputing === p.id ? (
                  <div className="mt-3 space-y-2">
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={3}
                      placeholder="What went wrong? Include dates, condition on arrival, and what outcome you want (min 20 characters)."
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                    <div className="flex gap-2">
                      <button
                        disabled={busy || reason.trim().length < 20}
                        onClick={() => submit(p.id)}
                        className="rounded-md bg-destructive px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                      >
                        {busy ? "Submitting…" : "Open dispute"}
                      </button>
                      <button
                        onClick={() => {
                          setDisputing(null);
                          setReason("");
                        }}
                        className="rounded-md border border-border px-3 py-1.5 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setDisputing(p.id)}
                    className="mt-3 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted"
                  >
                    Report a problem
                  </button>
                )
              ) : null}
            </div>
          );
        })}
        {(payments ?? []).length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No completed payments yet. Purchases you make will appear here.
          </p>
        )}
      </div>
    </div>
  );
}
