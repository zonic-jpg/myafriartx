import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { verifyPayment } from "@/lib/payments.functions";

export const Route = createFileRoute("/checkout/mock")({
  component: MockCheckout,
});

function MockCheckout() {
  const { ref, amount } = useSearch({ strict: false }) as { ref?: string; amount?: string };
  const verify = useServerFn(verifyPayment);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!ref || done) return;
    verify({ data: { reference: ref } })
      .then(() => setDone(true))
      .catch(() => setDone(false));
  }, [ref, done]);

  return (
    <div className="mx-auto max-w-md p-10 text-center">
      <h1 className="text-xl font-semibold">Mock payment</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Reference {ref} · ₦{Number(amount ?? 0).toLocaleString()}
      </p>
      {done ? (
        <p className="mt-4 text-green-700">Payment recorded successfully.</p>
      ) : (
        <p className="mt-4 text-muted-foreground">Processing…</p>
      )}
      <Link to="/" className="mt-6 inline-block underline">
        Return home
      </Link>
    </div>
  );
}
