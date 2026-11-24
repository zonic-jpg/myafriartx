import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { verifyCertificate } from "@/lib/provenance.functions";
import { getArtistCertificatePdf } from "@/lib/buyback.functions";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/verify/cert/$code")({
  component: VerifyCertPage,
  head: ({ params }) => ({
    meta: [{ title: `Certificate ${params.code} — MyAfriArt` }],
  }),
});

function VerifyCertPage() {
  const { code } = Route.useParams();
  const verifyFn = useServerFn(verifyCertificate);
  const [cert, setCert] = useState<Record<string, unknown> | null | undefined>(undefined);
  const [err, setErr] = useState("");
  const pdfFn = useServerFn(getArtistCertificatePdf);
  const [pdfBusy, setPdfBusy] = useState(false);
  async function downloadArtistPdf(serial: string) {
    setPdfBusy(true);
    try {
      const r = await pdfFn({ data: { serial } });
      const bin = atob(r.base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url; a.download = r.filename; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not prepare the PDF.");
    } finally { setPdfBusy(false); }
  }

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
        ← MyAfriArt
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

      {cert && cert.kind === "artist" && (
        <div className="mt-6 space-y-4 rounded-lg border border-border p-5">
          {cert.status !== "valid" ? (
            <p className="rounded bg-destructive/10 p-3 text-sm font-semibold text-destructive">
              This certificate was withdrawn{cert.withdrawn_at ? ` on ${new Date(String(cert.withdrawn_at)).toLocaleDateString()}` : ""}.
            </p>
          ) : cert.signature_ok ? (
            <p className="text-sm font-semibold text-emerald-700">✓ Record intact. Signature {String(cert.sig_prefix)}</p>
          ) : (
            <p className="rounded bg-destructive/10 p-3 text-sm font-semibold text-destructive">
              This record does not match its signature and may have been altered. Do not rely on it.
            </p>
          )}
          <div className="flex items-center gap-3">
            {Boolean(cert.logo_url) && <img src={String(cert.logo_url)} alt="" className="h-10 w-auto" />}
            <p className="font-display text-lg">{String(cert.brand_name)}</p>
          </div>
          {Boolean(cert.image_url) && <img src={String(cert.image_url)} alt={String(cert.title)} className="max-h-72 w-full rounded object-contain" />}
          <dl className="space-y-2 text-sm">
            <Row label="Title" value={String(cert.title)} />
            {Boolean(cert.medium) && <Row label="Medium" value={String(cert.medium)} />}
            {Boolean(cert.year) && <Row label="Year" value={String(cert.year)} />}
            {Boolean(cert.dimensions) && <Row label="Dimensions" value={String(cert.dimensions)} />}
            {Boolean(cert.edition) && <Row label="Edition" value={String(cert.edition)} />}
            <Row label="Serial number" value={String(cert.serial)} />
            <Row label="Issued" value={new Date(String(cert.issued_at)).toLocaleDateString()} />
          </dl>
          {cert.status === "valid" && (
            <button disabled={pdfBusy} onClick={() => void downloadArtistPdf(String(cert.serial))} className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">
              {pdfBusy ? "Preparing…" : "Download certificate (PDF)"}
            </button>
          )}
          <p className="text-xs text-muted-foreground">
            This certificate records the artist’s attestation, issued through MyAfriArt. It does not guarantee authenticity, value or title, and does not transfer copyright.
          </p>
        </div>
      )}

      {cert && cert.kind !== "artist" && (
        <div className="mt-6 space-y-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-5">
          <p className="text-sm font-semibold text-emerald-700">✓ Valid certificate</p>
          <dl className="space-y-2 text-sm">
            <Row label="Title" value={String(cert.title)} />
            {Boolean(cert.artist_name) && <Row label="Artist" value={String(cert.artist_name)} />}
            {Boolean(cert.owner_name) && <Row label="Owner" value={String(cert.owner_name)} />}
            <Row label="Issued" value={new Date(String(cert.issued_at)).toLocaleDateString()} />
          </dl>
          {Boolean(cert.certificate_url) && (
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
