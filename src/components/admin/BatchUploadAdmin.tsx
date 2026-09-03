import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  CheckSquare,
  Loader2,
  Send,
  Square,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { fileToDownscaledDataUrl } from "@/components/image-dropzone";
import {
  emptyDraft,
  isDraftPreppable,
  loadDrafts,
  saveDrafts,
  statusLabel,
  statusTone,
  submitPreppedBatch,
  SUBMISSION_CURRENCIES,
  SUBMISSION_MEDIA,
  type BatchDraft,
  type BatchItemStatus,
} from "@/lib/batch-upload";
import { callAdminBridge, type ArtworkSubmission } from "@/lib/admin-bridge";
import { publicMessage } from "@/lib/public-message";

type Artist = { id: string; name: string; country?: string | null };
type Artwork = {
  id: string;
  artist_id: string | null;
  title: string;
  image_url: string;
  medium?: string | null;
  year?: string | null;
  is_active?: boolean;
};

type Props = {
  artists: Artist[];
  artworks: Artwork[];
  loading?: boolean;
};

const uid = () => crypto.randomUUID();

function chipClass(tone: ReturnType<typeof statusTone>) {
  switch (tone) {
    case "ready":
      return "border-emerald-400/60 bg-emerald-50 text-emerald-900";
    case "progress":
      return "border-sky-400/60 bg-sky-50 text-sky-900";
    case "ok":
      return "border-primary/40 bg-primary/10 text-primary";
    case "bad":
      return "border-destructive/40 bg-destructive/10 text-destructive";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

function mapSubmissionStatus(status: ArtworkSubmission["status"]): BatchItemStatus {
  if (status === "approved") return "approved";
  if (status === "rejected") return "rejected";
  return "submitted";
}

export function BatchUploadAdmin({ artists, artworks, loading = false }: Props) {
  const [artistId, setArtistId] = useState("");
  const [drafts, setDrafts] = useState<BatchDraft[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [queue, setQueue] = useState<ArtworkSubmission[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const artist = artists.find((a) => a.id === artistId) ?? null;
  const liveArtworks = useMemo(
    () => artworks.filter((a) => a.artist_id === artistId && a.is_active !== false),
    [artworks, artistId],
  );

  const persist = useCallback(
    (next: BatchDraft[]) => {
      setDrafts(next);
      if (artistId) saveDrafts(artistId, next);
    },
    [artistId],
  );

  const patchDraft = useCallback(
    (id: string, patch: Partial<BatchDraft>) => {
      persist(
        drafts.map((d) => {
          if (d.id !== id) return d;
          const merged = { ...d, ...patch };
          if (patch.status === undefined && merged.status === "unprepped" && isDraftPreppable(merged)) {
            return merged;
          }
          return merged;
        }),
      );
    },
    [drafts, persist],
  );

  useEffect(() => {
    if (!artistId) {
      setDrafts([]);
      setActiveId(null);
      return;
    }
    setDrafts(loadDrafts(artistId));
    setActiveId(null);
  }, [artistId]);

  const refreshQueue = useCallback(async () => {
    if (!artist?.name) return;
    setQueueLoading(true);
    try {
      const res = await callAdminBridge<{ submissions: ArtworkSubmission[] }>("submissions.list", {
        status: "all",
      });
      const name = artist.name.trim().toLowerCase();
      setQueue((res.submissions ?? []).filter((s) => s.artist_name.trim().toLowerCase() === name));
    } catch {
      setQueue([]);
    } finally {
      setQueueLoading(false);
    }
  }, [artist?.name]);

  useEffect(() => {
    void refreshQueue();
  }, [refreshQueue]);

  const ingestFiles = async (files: FileList | File[]) => {
    if (!artistId) {
      toast.warning("Choose an artist first.");
      return;
    }
    const images = [...files].filter((f) => f.type.startsWith("image/"));
    if (!images.length) return;
    setIngesting(true);
    try {
      const added: BatchDraft[] = [];
      for (const file of images) {
        const imageDataUrl = await fileToDownscaledDataUrl(file);
        added.push(
          emptyDraft({
            id: uid(),
            fileName: file.name,
            imageDataUrl,
          }),
        );
      }
      const next = [...drafts, ...added];
      persist(next);
      if (!activeId && added[0]) setActiveId(added[0].id);
      toast.success(`Added ${added.length} image${added.length > 1 ? "s" : ""} to the board.`);
    } finally {
      setIngesting(false);
    }
  };

  const active = drafts.find((d) => d.id === activeId) ?? null;
  const prepped = drafts.filter((d) => d.status === "prepped");
  const selected = drafts.filter((d) => d.selected);

  const markPrepped = (id: string) => {
    const draft = drafts.find((d) => d.id === id);
    if (!draft) return;
    if (!isDraftPreppable(draft)) {
      toast.error("Fill title, size, year, country and a short context first.");
      return;
    }
    patchDraft(id, { status: "prepped", statusAt: new Date().toISOString(), statusDetail: null });
  };

  const applyBulk = (field: "countryOfOrigin" | "medium", value: string) => {
    if (!selected.length) {
      toast.warning("Tick at least one thumbnail first.");
      return;
    }
    persist(
      drafts.map((d) => (d.selected && d.status !== "submitted" && d.status !== "approved" ? { ...d, [field]: value } : d)),
    );
    toast.success(`Applied to ${selected.length} item${selected.length > 1 ? "s" : ""}.`);
  };

  const uploadPrepped = async () => {
    if (!artist) return;
    const ready = drafts.filter((d) => d.status === "prepped");
    if (!ready.length) {
      toast.warning("Nothing is marked prepped yet.");
      return;
    }
    setSubmitting(true);
    const now = new Date().toISOString();
    persist(
      drafts.map((d) =>
        ready.some((r) => r.id === d.id) ? { ...d, status: "uploading", statusAt: now, statusDetail: null } : d,
      ),
    );

    try {
      const results = await submitPreppedBatch({
        artistId: artist.id,
        artistName: artist.name,
        items: ready.map((d) => ({
          clientId: d.id,
          title: d.title.trim(),
          medium: d.medium,
          widthCm: d.widthCm,
          heightCm: d.heightCm,
          depthCm: d.depthCm,
          yearCreated: d.yearCreated.trim(),
          countryOfOrigin: d.countryOfOrigin.trim() || artist.country || "",
          priceAmount: d.priceAmount,
          priceCurrency: d.priceCurrency,
          context: d.context.trim(),
          imageDataUrl: d.imageDataUrl,
        })),
      });

      const byId = new Map(results.map((r) => [r.clientId, r]));
      persist(
        drafts.map((d) => {
          const result = byId.get(d.id);
          if (!result) return d;
          if (result.ok) {
            return {
              ...d,
              status: "submitted" as const,
              statusAt: new Date().toISOString(),
              statusDetail: null,
              submissionId: result.submissionId ?? null,
            };
          }
          return {
            ...d,
            status: "failed" as const,
            statusAt: new Date().toISOString(),
            statusDetail: result.error ?? "Upload failed",
          };
        }),
      );

      const ok = results.filter((r) => r.ok).length;
      const failed = results.length - ok;
      if (ok) toast.success(`Submitted ${ok} piece${ok > 1 ? "s" : ""} to the approval queue.`);
      if (failed) toast.error(`${failed} item${failed > 1 ? "s" : ""} failed — see status on the board.`);
      await refreshQueue();
    } catch (e) {
      persist(
        drafts.map((d) =>
          ready.some((r) => r.id === d.id)
            ? { ...d, status: "failed", statusAt: new Date().toISOString(), statusDetail: publicMessage(e) }
            : d,
        ),
      );
      toast.error(publicMessage(e, "Batch upload failed."));
    } finally {
      setSubmitting(false);
    }
  };

  const input =
    "w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs focus:border-primary focus:outline-none";
  const label = "text-[10px] font-semibold uppercase tracking-wider text-muted-foreground";

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="aspect-[5/2] w-full rounded-xl" />
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="font-display text-xl">Batch upload</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Pick one artist, drop many images, fill attributes inline, mark each piece prepped, then upload —
          only prepped items enter the approval queue. Drafts stay on this device until you submit.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <label className={label}>Artist / brand</label>
          <select
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={artistId}
            onChange={(e) => setArtistId(e.target.value)}
          >
            <option value="">— choose one artist —</option>
            {artists.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
                {a.country ? ` · ${a.country}` : ""}
              </option>
            ))}
          </select>
        </div>
        {artist && (
          <p className="text-xs text-muted-foreground">
            {liveArtworks.length} live on board · {drafts.length} in this batch · {prepped.length} prepped
          </p>
        )}
      </div>

      {!artistId ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
          Select an artist to open their working board.
        </p>
      ) : (
        <>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              void ingestFiles(e.dataTransfer.files);
            }}
            onClick={() => fileRef.current?.click()}
            className={`cursor-pointer rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
              drag ? "border-primary bg-primary/5" : "border-border bg-muted/30 hover:border-primary/50"
            }`}
          >
            <UploadCloud className="mx-auto h-7 w-7 text-primary" aria-hidden />
            <p className="mt-2 text-sm font-medium">Drop images here for {artist?.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">No URL needed · JPG, PNG or WebP · many at once</p>
            {ingesting && (
              <p className="mt-2 inline-flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Preparing…
              </p>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) void ingestFiles(e.target.files);
                e.currentTarget.value = "";
              }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                persist(
                  drafts.map((d) =>
                    d.status === "submitted" || d.status === "approved" ? d : { ...d, selected: true },
                  ),
                )
              }
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs hover:bg-accent"
            >
              <CheckSquare className="h-3.5 w-3.5" aria-hidden /> Select all
            </button>
            <button
              type="button"
              onClick={() => persist(drafts.map((d) => ({ ...d, selected: false })))}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs hover:bg-accent"
            >
              <Square className="h-3.5 w-3.5" aria-hidden /> Clear ticks
            </button>
            <button
              type="button"
              onClick={() => {
                const value = window.prompt("Country of origin to apply to ticked items:");
                if (value) applyBulk("countryOfOrigin", value);
              }}
              className="rounded-md border border-border px-2.5 py-1 text-xs hover:bg-accent"
            >
              Apply country…
            </button>
            <button
              type="button"
              onClick={() => {
                const value = window.prompt(
                  `Medium to apply (${SUBMISSION_MEDIA.map((m) => m.label).join(", ")}):`,
                );
                if (!value) return;
                const match =
                  SUBMISSION_MEDIA.find((m) => m.label.toLowerCase() === value.toLowerCase()) ??
                  SUBMISSION_MEDIA.find((m) => m.value === value);
                if (match) applyBulk("medium", match.value);
                else toast.error("Unknown medium — use a label from the list.");
              }}
              className="rounded-md border border-border px-2.5 py-1 text-xs hover:bg-accent"
            >
              Apply medium…
            </button>
            <div className="flex-1" />
            <button
              type="button"
              disabled={submitting || !prepped.length}
              onClick={() => void uploadPrepped()}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Send className="h-3.5 w-3.5" aria-hidden />}
              Upload {prepped.length || ""} prepped
            </button>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Working board — {artist?.name}
              </h3>
              <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-5">
                {liveArtworks.map((a) => (
                  <div
                    key={`live-${a.id}`}
                    className="relative overflow-hidden rounded-lg border border-border bg-card"
                    title={a.title}
                  >
                    <img src={a.image_url} alt="" className="aspect-square w-full object-cover" loading="lazy" />
                    <span className="absolute left-1.5 top-1.5 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                      On board
                    </span>
                  </div>
                ))}

                {queueLoading &&
                  Array.from({ length: 2 }).map((_, i) => (
                    <Skeleton key={`qsk-${i}`} className="aspect-square rounded-lg" />
                  ))}

                {queue.map((s) => {
                  const st = mapSubmissionStatus(s.status);
                  return (
                    <div
                      key={`sub-${s.id}`}
                      className="relative overflow-hidden rounded-lg border border-border bg-card"
                      title={s.title}
                    >
                      <img src={s.image_url} alt="" className="aspect-square w-full object-cover" loading="lazy" />
                      <span
                        className={`absolute left-1.5 top-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium ${chipClass(statusTone(st))}`}
                      >
                        {statusLabel(st)}
                      </span>
                    </div>
                  );
                })}

                {drafts.map((d) => {
                  const tone = statusTone(d.status);
                  const isActive = d.id === activeId;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setActiveId(d.id)}
                      className={`relative overflow-hidden rounded-lg border text-left transition-shadow ${
                        isActive ? "border-primary ring-2 ring-primary/30" : "border-border"
                      }`}
                    >
                      <img src={d.imageDataUrl} alt="" className="aspect-square w-full object-cover" />
                      <span
                        className={`absolute left-1.5 top-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium ${chipClass(tone)}`}
                      >
                        {statusLabel(d.status)}
                      </span>
                      <label
                        className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-md bg-background/90"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={d.selected}
                          onChange={(e) => patchDraft(d.id, { selected: e.target.checked })}
                          className="h-3.5 w-3.5"
                        />
                      </label>
                      {d.statusAt && (
                        <span className="absolute bottom-1 left-1.5 rounded bg-black/55 px-1.5 py-0.5 text-[9px] text-white">
                          {new Date(d.statusAt).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {!liveArtworks.length && !drafts.length && !queue.length && (
                <p className="mt-4 text-center text-sm text-muted-foreground">
                  No content yet — drop images above to start this artist&apos;s batch.
                </p>
              )}
            </div>

            <aside className="rounded-xl border border-border bg-card p-4">
              {!active ? (
                <p className="text-sm text-muted-foreground">Tick a thumbnail to edit its attributes here.</p>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-medium">{active.fileName}</h3>
                      <p className="text-xs text-muted-foreground">{statusLabel(active.status)}</p>
                    </div>
                    {active.status !== "submitted" && active.status !== "approved" && (
                      <button
                        type="button"
                        onClick={() => {
                          persist(drafts.filter((d) => d.id !== active.id));
                          setActiveId(null);
                        }}
                        className="text-destructive"
                        aria-label="Remove draft"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <img src={active.imageDataUrl} alt="" className="aspect-[4/3] w-full rounded-md object-cover" />

                  {active.statusDetail && (
                    <p className="rounded-md border border-destructive/30 bg-destructive/5 px-2 py-1.5 text-xs text-destructive">
                      {active.statusDetail}
                    </p>
                  )}

                  {(active.status === "unprepped" ||
                    active.status === "prepped" ||
                    active.status === "failed") && (
                    <>
                      <div>
                        <label className={label}>Title</label>
                        <input
                          className={input}
                          value={active.title}
                          onChange={(e) => patchDraft(active.id, { title: e.target.value, status: "unprepped" })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className={label}>Medium</label>
                          <select
                            className={input}
                            value={active.medium}
                            onChange={(e) => patchDraft(active.id, { medium: e.target.value, status: "unprepped" })}
                          >
                            {SUBMISSION_MEDIA.map((m) => (
                              <option key={m.value} value={m.value}>
                                {m.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className={label}>Year</label>
                          <input
                            className={input}
                            value={active.yearCreated}
                            onChange={(e) =>
                              patchDraft(active.id, { yearCreated: e.target.value, status: "unprepped" })
                            }
                            inputMode="numeric"
                            maxLength={4}
                          />
                        </div>
                      </div>
                      <div>
                        <label className={label}>Size (cm)</label>
                        <div className="mt-1 grid grid-cols-3 gap-1">
                          <input
                            className={input}
                            placeholder="W"
                            value={active.widthCm}
                            onChange={(e) => patchDraft(active.id, { widthCm: e.target.value, status: "unprepped" })}
                          />
                          <input
                            className={input}
                            placeholder="H"
                            value={active.heightCm}
                            onChange={(e) => patchDraft(active.id, { heightCm: e.target.value, status: "unprepped" })}
                          />
                          <input
                            className={input}
                            placeholder="D"
                            value={active.depthCm}
                            onChange={(e) => patchDraft(active.id, { depthCm: e.target.value, status: "unprepped" })}
                          />
                        </div>
                      </div>
                      <div>
                        <label className={label}>Country of origin</label>
                        <input
                          className={input}
                          value={active.countryOfOrigin}
                          onChange={(e) =>
                            patchDraft(active.id, { countryOfOrigin: e.target.value, status: "unprepped" })
                          }
                          placeholder={artist?.country ?? "Nigeria"}
                        />
                      </div>
                      <div>
                        <label className={label}>Price (optional)</label>
                        <div className="mt-1 flex gap-1">
                          <select
                            className="rounded-md border border-input bg-background px-1.5 py-1.5 text-xs"
                            value={active.priceCurrency}
                            onChange={(e) =>
                              patchDraft(active.id, { priceCurrency: e.target.value, status: "unprepped" })
                            }
                          >
                            {SUBMISSION_CURRENCIES.map((c) => (
                              <option key={c}>{c}</option>
                            ))}
                          </select>
                          <input
                            className={input}
                            value={active.priceAmount}
                            onChange={(e) =>
                              patchDraft(active.id, { priceAmount: e.target.value, status: "unprepped" })
                            }
                            placeholder="On request"
                          />
                        </div>
                      </div>
                      <div>
                        <label className={label}>Context</label>
                        <textarea
                          className={`${input} min-h-20 resize-y`}
                          value={active.context}
                          onChange={(e) => patchDraft(active.id, { context: e.target.value, status: "unprepped" })}
                          maxLength={4000}
                        />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => markPrepped(active.id)}
                          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-emerald-700 px-3 py-2 text-xs font-medium text-white hover:opacity-90"
                        >
                          <Check className="h-3.5 w-3.5" aria-hidden /> Mark prepped
                        </button>
                        {active.status === "prepped" && (
                          <button
                            type="button"
                            onClick={() => patchDraft(active.id, { status: "unprepped" })}
                            className="inline-flex items-center justify-center rounded-md border border-border px-3 py-2 text-xs hover:bg-accent"
                          >
                            <X className="h-3.5 w-3.5" aria-hidden />
                          </button>
                        )}
                      </div>
                    </>
                  )}

                  {(active.status === "submitted" || active.status === "approved" || active.status === "rejected") && (
                    <dl className="space-y-1 text-xs text-muted-foreground">
                      <div>
                        <dt className={label}>Title</dt>
                        <dd className="text-sm text-foreground">{active.title}</dd>
                      </div>
                      {active.submissionId && (
                        <div>
                          <dt className={label}>Queue id</dt>
                          <dd className="font-mono text-[10px]">{active.submissionId}</dd>
                        </div>
                      )}
                    </dl>
                  )}
                </div>
              )}
            </aside>
          </div>
        </>
      )}
    </section>
  );
}
