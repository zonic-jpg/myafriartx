import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { verifyCertificate } from "@/lib/provenance.functions";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/verify/cert/$code")({
  component: VerifyCertPage,
  head: ({ params }) => ({
    meta: [{ title: `Certificate ${params.code} — MyAfriart` }],
  }),
});

function VerifyCertPage() {
  const { code } = Route.useParams();
  const verifyFn = useServerFn(verifyCertificate);
  const [cert, setCert] = useState<Record<string, unknown> | null | undefined>(undefined);
  const [err, setErr] = useState("");

  useEffect(() => {
    verifyFn({ data: { code } })
      .then((c) => setCert(c))
      .catch((e) => setErr(e instanceof Error ? e.message : "Verification failed"));
  }, [code]);

  if (cert === undefined && !err) {
    return <div className="p-10 text-center text-muted-foreground">Verifying certificate…</div>;
  }

  return (
    <div className="mx-auto min-h-screen max-w-lg p-8">
      <Link to="/" className="text-sm text-primary underline">
        ← MyAfriart
      </Link>
      <h1 className="mt-6 font-display text-2xl">Certificate verification</h1>
      <p className="mt-1 text-sm text-muted-foreground">Code: {code.toUpperCase()}</p>

      {err && <p className="mt-6 text-destructive">{err}</p>}

      {!cert && !err && (
        <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p className="font-medium text-destructive">Certificate not found or revoked</p>
          <p className="mt-1 text-sm text-muted-foreground">
            This code does not match any active certificate in our registry.
          </p>
        </div>
      )}

      {cert && (
        <div className="mt-6 space-y-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-5">
          <p className="text-sm font-semibold text-emerald-700">✓ Valid certificate</p>
          <dl className="space-y-2 text-sm">
            <Row label="Title" value={String(cert.title)} />
            {cert.artist_name && <Row label="Artist" value={String(cert.artist_name)} />}
            {cert.owner_name && <Row label="Owner" value={String(cert.owner_name)} />}
            <Row label="Issued" value={new Date(String(cert.issued_at)).toLocaleDateString()} />
          </dl>
          {cert.certificate_url && (
            <a
              href={String(cert.certificate_url)}
              target="_blank"
              rel="noreferrer"
              className="inline-block rounded bg-primary px-4 py-2 text-sm text-primary-foreground"
            >
              Download PDF
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
