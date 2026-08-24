import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { verifyPayment } from "@/lib/payments.functions";

export const Route = createFileRoute("/checkout/callback")({
  component: CheckoutCallback,
});

function CheckoutCallback() {
  const search = useSearch({ strict: false }) as { ref?: string; reference?: string };
  const reference = search.ref ?? search.reference;
  const verify = useServerFn(verifyPayment);
  const [status, setStatus] = useState<"loading" | "ok" | "fail">("loading");

  useEffect(() => {
    if (!reference) {
      setStatus("fail");
      return;
    }
    verify({ data: { reference } })
      .then(() => setStatus("ok"))
      .catch(() => setStatus("fail"));
  }, [reference]);

  return (
    <div className="mx-auto max-w-md p-10 text-center">
      <h1 className="text-xl font-semibold">Payment</h1>
      {status === "loading" && <p className="mt-4">Verifying payment…</p>}
      {status === "ok" && <p className="mt-4 text-green-700">Payment confirmed. Thank you.</p>}
      {status === "fail" && <p className="mt-4 text-destructive">Payment could not be verified.</p>}
      <div className="mt-6 flex justify-center gap-4 text-sm">
        <Link to="/" className="underline">
          Return home
        </Link>
        <Link to="/disputes" className="underline">
          View payments & disputes
        </Link>
      </div>
    </div>
  );
}
