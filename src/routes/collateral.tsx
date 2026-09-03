import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { listMyCollateral, requestCollateral } from "@/lib/collateral.functions";
import { getMyVerification } from "@/lib/kyc.functions";
import SiteFooter from "@/components/SiteFooter";

export const Route = createFileRoute("/collateral")({
  component: CollateralPage,
  head: () => ({ meta: [{ title: "Art Collateral — MyAfriArt" }] }),
});

function CollateralPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const listFn = useServerFn(listMyCollateral);
  const requestFn = useServerFn(requestCollateral);
  const kycFn = useServerFn(getMyVerification);

  const [title, setTitle] = useState("");
  const [appraised, setAppraised] = useState("");
  const [loan, setLoan] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
  }, []);

  useEffect(() => {
    if (!authed) return;
    listFn()
      .then(setRows)
      .catch(() => setRows([]));
    kycFn()
      .then((v) => setKycStatus(v.status))
      .catch(() => setKycStatus("unverified"));
  }, [authed]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    try {
      await requestFn({
        data: {
          title,
          appraisedValueNgn: Number(appraised),
          loanAmountNgn: Number(loan),
        },
      });
      setMsg("Collateral request submitted — pending authentication.");
      setTitle("");
      setAppraised("");
      setLoan("");
      setRows(await listFn());
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Request failed");
    }
  }

  if (authed === null) return <p className="p-8 text-center">Loading…</p>;

  if (!authed) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center">
        <h1 className="text-2xl font-semibold">Art as collateral</h1>
        <p className="mt-2 text-muted-foreground">Sign in to pledge authenticated works.</p>
        <Link to="/login" className="mt-4 inline-block underline">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4">
        <Link to="/" className="font-display text-lg">
          MyAfriArt
        </Link>
      </header>
      <main className="mx-auto max-w-3xl space-y-8 px-6 py-10">
        <div>
          <h1 className="text-2xl font-semibold">Collateral portal</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Pledge authenticated art. Admin verifies provenance before collateral is activated.
          </p>
        </div>

        {kycStatus !== null && kycStatus !== "verified" && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
            <p className="font-medium text-amber-900">Identity verification required</p>
            <p className="mt-1 text-amber-900/80">
              {kycStatus === "pending"
                ? "Your verification is under review. You can pledge once approved."
                : "Pledging art as collateral requires a verified identity."}
            </p>
            {kycStatus !== "pending" && (
              <Link
                to="/verification"
                className="mt-2 inline-block rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white"
              >
                Verify your identity
              </Link>
            )}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4 rounded-xl border p-6">
          <input
            className="w-full rounded border px-3 py-2 text-sm"
            placeholder="Artwork title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <input
            className="w-full rounded border px-3 py-2 text-sm"
            placeholder="Appraised value (₦)"
            type="number"
            value={appraised}
            onChange={(e) => setAppraised(e.target.value)}
            required
          />
          <input
            className="w-full rounded border px-3 py-2 text-sm"
            placeholder="Loan amount requested (₦)"
            type="number"
            value={loan}
            onChange={(e) => setLoan(e.target.value)}
            required
          />
          <button
            type="submit"
            className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
          >
            Submit for authentication
          </button>
          {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
        </form>

        <section className="space-y-3">
          <h2 className="font-medium">Your pledges</h2>
          {rows.map((r) => (
            <div key={String(r.id)} className="rounded-lg border p-4 text-sm">
              <p className="font-medium">{String(r.title)}</p>
              <p className="text-muted-foreground">
                ₦{Number(r.loan_amount_ngn).toLocaleString()} loan · {String(r.status)}
              </p>
              {r.certificate_url ? (
                <a
                  href={String(r.certificate_url)}
                  className="mt-1 inline-block text-primary underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  View authentication certificate
                </a>
              ) : null}
            </div>
          ))}
          {rows.length === 0 && <p className="text-sm text-muted-foreground">No pledges yet.</p>}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
