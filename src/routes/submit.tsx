import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ImageDropzone, fileToDownscaledDataUrl } from "@/components/image-dropzone";
import {
  SUBMISSION_CURRENCIES,
  SUBMISSION_MEDIA,
  submitArtwork,
  validateSubmission,
  type SubmissionDraft,
} from "@/lib/submissions";
import { publicMessage } from "@/lib/public-message";

export const Route = createFileRoute("/submit")({
  head: () => ({ meta: [{ title: "Submit your work — MyAfriArt" }] }),
  component: SubmitPage,
});

const STEPS = ["Image", "Attributes", "Context", "Review"] as const;

const EMPTY: SubmissionDraft = {
  artistName: "",
  submitterEmail: "",
  title: "",
  medium: "oil",
  widthCm: "",
  heightCm: "",
  depthCm: "",
  yearCreated: "",
  countryOfOrigin: "",
  priceAmount: "",
  priceCurrency: "USD",
  context: "",
};

// Draft persistence — a refresh, an accidental back-button, or a dropped
// connection mid-way through this four-step form would otherwise lose
// everything the submitter typed, including the photo they just prepared.
// Everything here is a JSON-serializable string (the photo is already a
// downscaled data URL by the time it lands in state, not a raw File), so the
// whole draft can be persisted — except when the photo pushes the payload
// over the browser's storage quota, in which case we drop the image only and
// keep the rest, re-prompting for the photo alone rather than losing the form.
const SUBMIT_DRAFT_KEY = "myafriart_submit_draft_v1";

type PersistedSubmitDraft = {
  step: number;
  draft: SubmissionDraft;
  image: string | null;
};

function loadSubmitDraft(): PersistedSubmitDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SUBMIT_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as PersistedSubmitDraft;
  } catch {
    return null;
  }
}

function saveSubmitDraft(next: PersistedSubmitDraft) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SUBMIT_DRAFT_KEY, JSON.stringify(next));
  } catch {
    // Most likely quota exceeded because of the embedded photo data URL.
    // Keep the text fields (what took the most effort to fill in) and drop
    // the image rather than losing the whole draft.
    try {
      localStorage.setItem(SUBMIT_DRAFT_KEY, JSON.stringify({ ...next, image: null }));
    } catch {
      /* private/incognito mode or storage disabled — draft just won't persist */
    }
  }
}

function clearSubmitDraft() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SUBMIT_DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-destructive">{message}</p>;
}

function SubmitPage() {
  const [step, setStep] = useState(() => loadSubmitDraft()?.step ?? 0);
  const [image, setImage] = useState<string | null>(() => loadSubmitDraft()?.image ?? null);
  const [preparing, setPreparing] = useState(false);
  const [draft, setDraft] = useState<SubmissionDraft>(() => ({
    ...EMPTY,
    ...(loadSubmitDraft()?.draft ?? {}),
  }));
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  // Save on every change so a refresh, back-button, or crash mid-flow doesn't
  // lose what's been entered. Skipped once submitted — that draft is done.
  useEffect(() => {
    if (submittedId) return;
    saveSubmitDraft({ step, draft, image });
  }, [step, draft, image, submittedId]);

  const errors = useMemo(() => validateSubmission(draft, image), [draft, image]);
  const set = (patch: Partial<SubmissionDraft>) => setDraft((d) => ({ ...d, ...patch }));

  const stepErrors: Record<number, string[]> = {
    0: ["image"],
    1: ["artistName", "title", "size", "yearCreated", "countryOfOrigin", "priceAmount", "submitterEmail"],
    2: ["context"],
    3: [],
  };
  const stepBlocked = stepErrors[step].some((key) => errors[key]);
  const show = (key: string) => (touched ? errors[key] : undefined);

  const onPickFile = async (file: File) => {
    setPreparing(true);
    try {
      setImage(await fileToDownscaledDataUrl(file));
    } finally {
      setPreparing(false);
    }
  };

  const next = () => {
    setTouched(true);
    if (stepBlocked) return;
    setTouched(false);
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  const submit = async () => {
    setTouched(true);
    if (Object.keys(errors).length > 0) {
      toast.error("A few details still need fixing.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await submitArtwork(draft, image!);
      clearSubmitDraft();
      setSubmittedId(result.id ?? "queued");
    } catch (e) {
      toast.error(publicMessage(e, "Your submission could not be saved."));
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedId) {
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-primary" aria-hidden />
        <h1 className="mt-6 font-display text-3xl">Submitted for review</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          “{draft.title}” is now in the moderation queue. Once an editor approves it, the work appears on
          the MyAfriArt board. If you left an email address we will let you know either way.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            to="/"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Back to the board
          </Link>
          <button
            type="button"
            onClick={() => {
              setSubmittedId(null);
              setImage(null);
              setDraft({ ...EMPTY, artistName: draft.artistName, submitterEmail: draft.submitterEmail });
              setStep(0);
              setTouched(false);
            }}
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent"
          >
            Submit another work
          </button>
        </div>
      </div>
    );
  }

  const input =
    "mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none";
  const label = "text-xs font-medium uppercase tracking-wider text-muted-foreground";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link to="/" className="font-display text-xl">
            MyAfriArt
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            Back
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="font-display text-3xl">Submit your work</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Four short steps. An editor reviews every submission before it reaches the board.
        </p>

        <ol className="mt-8 flex items-center gap-2">
          {STEPS.map((name, i) => (
            <li key={name} className="flex flex-1 items-center gap-2">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  i < step
                    ? "bg-primary text-primary-foreground"
                    : i === step
                      ? "border-2 border-primary text-primary"
                      : "border border-border text-muted-foreground"
                }`}
              >
                {i < step ? "✓" : i + 1}
              </div>
              <span
                className={`hidden text-xs sm:block ${i === step ? "font-medium text-foreground" : "text-muted-foreground"}`}
              >
                {name}
              </span>
              {i < STEPS.length - 1 && <div className="h-px flex-1 bg-border" />}
            </li>
          ))}
        </ol>

        <div className="mt-8 min-h-[420px]">
          {step === 0 && (
            <div>
              <ImageDropzone
                value={image}
                onSelect={(f) => void onPickFile(f)}
                busy={preparing}
                title="Drag your artwork photo here, or click to choose"
                hint="One clear, straight-on photo · JPG, PNG or WebP"
              />
              <FieldError message={show("image")} />
              <p className="mt-3 text-xs text-muted-foreground">
                Photograph the work flat-on in even light. Large photos are resized automatically.
              </p>
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={label}>Artist name</label>
                <input
                  className={input}
                  value={draft.artistName}
                  onChange={(e) => set({ artistName: e.target.value })}
                  placeholder="Adaeze Okonkwo"
                />
                <FieldError message={show("artistName")} />
              </div>
              <div className="sm:col-span-2">
                <label className={label}>Title of the work</label>
                <input
                  className={input}
                  value={draft.title}
                  onChange={(e) => set({ title: e.target.value })}
                  placeholder="Harmattan Morning"
                />
                <FieldError message={show("title")} />
              </div>
              <div>
                <label className={label}>Medium</label>
                <select
                  className={input}
                  value={draft.medium}
                  onChange={(e) => set({ medium: e.target.value })}
                >
                  {SUBMISSION_MEDIA.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={label}>Year made</label>
                <input
                  className={input}
                  value={draft.yearCreated}
                  onChange={(e) => set({ yearCreated: e.target.value })}
                  placeholder="2025"
                  inputMode="numeric"
                  maxLength={4}
                />
                <FieldError message={show("yearCreated")} />
              </div>
              <div className="sm:col-span-2">
                <label className={label}>Size in centimetres</label>
                <div className="mt-1 grid grid-cols-3 gap-2">
                  <input
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={draft.widthCm}
                    onChange={(e) => set({ widthCm: e.target.value })}
                    placeholder="Width"
                    inputMode="decimal"
                  />
                  <input
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={draft.heightCm}
                    onChange={(e) => set({ heightCm: e.target.value })}
                    placeholder="Height"
                    inputMode="decimal"
                  />
                  <input
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={draft.depthCm}
                    onChange={(e) => set({ depthCm: e.target.value })}
                    placeholder="Depth (optional)"
                    inputMode="decimal"
                  />
                </div>
                <FieldError message={show("size")} />
              </div>
              <div>
                <label className={label}>Country of origin</label>
                <input
                  className={input}
                  value={draft.countryOfOrigin}
                  onChange={(e) => set({ countryOfOrigin: e.target.value })}
                  placeholder="Nigeria"
                />
                <FieldError message={show("countryOfOrigin")} />
              </div>
              <div>
                <label className={label}>Price (optional)</label>
                <div className="mt-1 flex gap-2">
                  <select
                    className="rounded-md border border-input bg-background px-2 py-2 text-sm"
                    value={draft.priceCurrency}
                    onChange={(e) => set({ priceCurrency: e.target.value })}
                  >
                    {SUBMISSION_CURRENCIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                  <input
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={draft.priceAmount}
                    onChange={(e) => set({ priceAmount: e.target.value })}
                    placeholder="Leave blank to discuss"
                    inputMode="decimal"
                  />
                </div>
                <FieldError message={show("priceAmount")} />
              </div>
              <div className="sm:col-span-2">
                <label className={label}>Your email (optional)</label>
                <input
                  className={input}
                  value={draft.submitterEmail}
                  onChange={(e) => set({ submitterEmail: e.target.value })}
                  placeholder="So we can tell you the outcome"
                  inputMode="email"
                />
                <FieldError message={show("submitterEmail")} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <label className={label}>Context</label>
              <p className="mt-1 text-sm text-muted-foreground">
                What is this work about? Materials, the moment it came from, what you want a collector to
                understand. This is the story that appears with the piece.
              </p>
              <textarea
                className="mt-3 min-h-56 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={draft.context}
                onChange={(e) => set({ context: e.target.value })}
                maxLength={4000}
                placeholder="I painted this during the harmattan, when the light over Lagos turns the colour of dust…"
              />
              <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                <FieldError message={show("context")} />
                <span>{draft.context.length}/4000</span>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-6 sm:grid-cols-[220px_1fr]">
              <div className="overflow-hidden rounded-xl border border-border">
                {image && <img src={image} alt={draft.title} className="aspect-square w-full object-cover" />}
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div className="col-span-2">
                  <dt className={label}>Title</dt>
                  <dd className="font-medium">{draft.title}</dd>
                </div>
                <div>
                  <dt className={label}>Artist</dt>
                  <dd>{draft.artistName}</dd>
                </div>
                <div>
                  <dt className={label}>Medium</dt>
                  <dd>{SUBMISSION_MEDIA.find((m) => m.value === draft.medium)?.label ?? draft.medium}</dd>
                </div>
                <div>
                  <dt className={label}>Size</dt>
                  <dd>
                    {[draft.widthCm, draft.heightCm, draft.depthCm].filter(Boolean).join(" × ")} cm
                  </dd>
                </div>
                <div>
                  <dt className={label}>Year</dt>
                  <dd>{draft.yearCreated}</dd>
                </div>
                <div>
                  <dt className={label}>Country</dt>
                  <dd>{draft.countryOfOrigin}</dd>
                </div>
                <div>
                  <dt className={label}>Price</dt>
                  <dd>
                    {draft.priceAmount ? `${draft.priceCurrency} ${draft.priceAmount}` : "On request"}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className={label}>Context</dt>
                  <dd className="whitespace-pre-line text-muted-foreground">{draft.context}</dd>
                </div>
              </dl>
            </div>
          )}
        </div>

        <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
          <button
            type="button"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm hover:bg-accent disabled:opacity-40"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden /> Back
          </button>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={next}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Continue <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void submit()}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {submitting ? "Submitting…" : "Submit for review"}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
