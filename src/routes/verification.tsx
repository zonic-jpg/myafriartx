import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getMyVerification, submitVerification } from "@/lib/kyc.functions";
import { ID_TYPES } from "@/lib/kyc-constants";

export const Route = createFileRoute("/verification")({
  component: VerificationPage,
  head: () => ({ meta: [{ title: "Identity verification — MyAfriArt" }] }),
});

const ID_LABELS: Record<(typeof ID_TYPES)[number], string> = {
  nin: "National Identification Number (NIN)",
  passport: "International passport",
  drivers_licence: "Driver's licence",
  voters_card: "Voter's card",
};

type Verification = Awaited<ReturnType<typeof getMyVerification>>;

function VerificationPage() {
  const navigate = useNavigate();
  const fetchStatus = useServerFn(getMyVerification);
  const submitFn = useServerFn(submitVerification);

  const [authed, setAuthed] = useState<boolean | null>(null);
  const [record, setRecord] = useState<Verification | null>(null);
  const [fullName, setFullName] = useState("");
  const [idType, setIdType] = useState<(typeof ID_TYPES)[number]>("nin");
  const [idReference, setIdReference] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session);
      if (!data.session) navigate({ to: "/login" });
    });
  }, [navigate]);

  useEffect(() => {
    if (!authed) return;
    fetchStatus()
      .then(setRecord)
      .catch(() => setRecord({ status: "unverified" }));
  }, [authed]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return toast.error("Attach a photo or PDF of your ID document.");
    if (file.size > 8 * 1024 * 1024) return toast.error("Document must be under 8 MB.");
    setBusy(true);
    try {
      const documentBase64 = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      await submitFn({
        data: { fullName, idType, idReference, documentBase64, filename: file.name },
      });
      toast.success("Submitted — our team will review within 1–2 business days.");
      setRecord(await fetchStatus());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setBusy(false);
    }
  };

  if (authed === null || (authed && !record)) {
    return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  }

  const status = record?.status ?? "unverified";

  return (
    <div className="mx-auto min-h-screen max-w-lg px-6 py-10">
      <Link to="/" className="text-sm text-primary underline">
        ← MyAfriArt
      </Link>
      <h1 className="mt-6 font-display text-3xl">Identity verification</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Verification is required to pledge art as collateral and for high-value escrow payments.
        Your document is stored privately and viewed only by our compliance team.
      </p>

      {status === "verified" && (
        <div className="mt-8 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-5">
          <p className="font-medium text-emerald-700">✓ You are verified</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Verified on{" "}
            {record?.verified_at ? new Date(record.verified_at).toLocaleDateString() : "—"}. You
            have full access to collateral and escrow.
          </p>
        </div>
      )}

      {status === "pending" && (
        <div className="mt-8 rounded-lg border border-amber-500/30 bg-amber-500/5 p-5">
          <p className="font-medium text-amber-700">Under review</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Submitted{" "}
            {record?.submitted_at ? new Date(record.submitted_at).toLocaleString() : "recently"}. We
            typically review within 1–2 business days.
          </p>
        </div>
      )}

      {status === "rejected" && (
        <div className="mt-8 rounded-lg border border-destructive/30 bg-destructive/5 p-5">
          <p className="font-medium text-destructive">Submission rejected</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {record?.rejected_reason ?? "Please resubmit with a clearer document."}
          </p>
        </div>
      )}

      {(status === "unverified" || status === "rejected") && (
        <form onSubmit={submit} className="mt-8 space-y-4">
          <label className="block">
            <span className="text-sm font-medium">Full legal name</span>
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="As it appears on your ID"
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">ID type</span>
            <select
              value={idType}
              onChange={(e) => setIdType(e.target.value as (typeof ID_TYPES)[number])}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {ID_TYPES.map((t) => (
                <option key={t} value={t}>
                  {ID_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium">ID number</span>
            <input
              required
              value={idReference}
              onChange={(e) => setIdReference(e.target.value)}
              placeholder="Document reference number"
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">
              ID document (JPG, PNG, WEBP or PDF, max 8 MB)
            </span>
            <input
              required
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-1 block w-full text-sm"
            />
          </label>
          <button
            disabled={busy}
            className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Uploading…" : "Submit for review"}
          </button>
          <p className="text-xs text-muted-foreground">
            By submitting you confirm this document is yours and consent to identity checks for
            anti-fraud and regulatory compliance.
          </p>
        </form>
      )}
    </div>
  );
}
