import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { serviceGate, type ServiceGateResult } from "@/lib/service-pricing";
import { initializePayment } from "@/lib/payments.functions";

const NAMES: Record<string, string> = { catalogue: "The catalogue", auctions: "Live auctions", collateral: "Collateral loans" };

/**
 * Wraps a feature that admins can price. Free → children. Freemium → guests get a short
 * taste (counted in their browser), members are free. Paid → members unlock once.
 * The server enforces the same rule; this only explains it and takes payment.
 */
export function ServiceGate({ service, children }: { service: string; children: ReactNode }) {
  const [g, setG] = useState<ServiceGateResult | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [guestOut, setGuestOut] = useState(false);
  const qc = useQueryClient();
  const pay = useServerFn(initializePayment);

  useEffect(() => {
    let live = true;
    serviceGate(service).then((r) => {
      if (!live) return;
      if (r.mode === "freemium" && !r.signedIn && !r.hasAccess) {
        // Count one free visit per page load, once.
        const key = `maa_free_${service}`;
        try {
          const used = Number(localStorage.getItem(key) || "0");
          if (used < r.guestAllowance) localStorage.setItem(key, String(used + 1));
          else setGuestOut(true);
        } catch {
          /* storage blocked: allow */
        }
      }
      setG(r);
      // Server rendering had no sign-in, so refetch data now that we know the visitor may enter.
      if (r.allowed) void qc.invalidateQueries();
    });
    return () => {
      live = false;
    };
  }, [service, qc]);

  if (!g) return <>{children}</>; // never blank the page while we check
  const name = NAMES[service] ?? "This service";

  const blocked = !g.allowed || guestOut;
  if (!blocked) return <>{children}</>;

  const unlock = async () => {
    setBusy(true);
    setErr("");
    try {
      const r = await pay({ data: { purpose: "service_access", metadata: { service_id: service } } });
      window.location.href = r.authorizationUrl;
    } catch (e) {
      setErr((e as Error).message || "Could not start payment.");
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto my-12 max-w-lg rounded-lg border border-border bg-card p-6 text-center">
      <h2 className="font-display text-2xl">{name} {g.mode === "paid" ? "is a paid service" : "needs a free account"}</h2>
      {g.mode === "paid" ? (
        <>
          <p className="mt-2 text-sm text-muted-foreground">One-time unlock: ₦{g.priceNgn.toLocaleString()}</p>
          {g.signedIn ? (
            <button type="button" onClick={unlock} disabled={busy} className="mt-4 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-60">
              {busy ? "Opening payment…" : "Unlock now"}
            </button>
          ) : (
            <Link to="/login" className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">Sign in to unlock</Link>
          )}
        </>
      ) : (
        <Link to="/login" className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">Sign in or join free</Link>
      )}
      {err && <p className="mt-3 text-sm text-destructive">{err}</p>}
    </div>
  );
}
