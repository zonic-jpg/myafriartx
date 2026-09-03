import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { localImageForKey } from "@/lib/local-image-assets";
import { NotifyBell } from "@/components/notify-bell";
import { adminGateActive, clearAdminGate } from "@/lib/adminGate";
import { fetchStudioCatalogClient, stageRoomClient } from "@/lib/stage-room-client";
import { LOCAL_MOCK_STYLES } from "@/lib/stage-styles";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageDropzone, fileToDownscaledDataUrl } from "@/components/image-dropzone";
import { publicMessage } from "@/lib/public-message";

export const Route = createFileRoute("/studio")({
  head: () => ({ meta: [{ title: "Studio — MyAfriArt" }] }),
  component: Studio,
});

const MEDIA = [
  { v: "oil", l: "Oil paintings" },
  { v: "watercolor", l: "Watercolour" },
  { v: "pastel", l: "Pastels" },
  { v: "sculpture", l: "Sculpture" },
  { v: "photograph", l: "Photography" },
  { v: "print", l: "Prints" },
  { v: "mixed_media", l: "Mixed media" },
];

function Studio() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [gate, setGate] = useState(() =>
    typeof window !== "undefined" ? adminGateActive() : false,
  );

  useEffect(() => {
    const syncGate = () => setGate(adminGateActive());
    syncGate();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setAuthed(!!s);
      syncGate();
    });
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session);
      syncGate();
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (ready && !authed && !gate) navigate({ to: "/login" });
  }, [ready, authed, gate, navigate]);

  if (!ready || (!authed && !gate)) return <StudioSkeleton />;
  return <StudioInner gateMode={gate && !authed} />;
}

/** Mirrors the real studio layout so nothing jumps when the session resolves. */
function StudioSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="font-display text-xl">MyAfriArt</span>
          <Skeleton className="h-4 w-48" />
        </div>
      </header>
      <main className="mx-auto grid max-w-6xl gap-10 px-6 py-10 lg:grid-cols-[1fr_360px]">
        <section>
          <Skeleton className="h-9 w-40" />
          <Skeleton className="mt-2 h-4 w-72" />
          <Skeleton className="mt-6 aspect-[4/3] w-full rounded-xl" />
          <Skeleton className="mt-3 h-8 w-32 rounded-md" />
        </section>
        <aside className="space-y-6">
          {[0, 1, 2].map((i) => (
            <div key={i}>
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-2 h-24 w-full rounded-md" />
            </div>
          ))}
          <Skeleton className="h-12 w-full rounded-md" />
        </aside>
      </main>
    </div>
  );
}

function StudioInner({ gateMode = false }: { gateMode?: boolean }) {
  const { data, isLoading } = useQuery({
    queryKey: ["catalog", gateMode ? "gate" : "live"],
    queryFn: () => fetchStudioCatalogClient(gateMode),
  });

  const [isAdmin, setIsAdmin] = useState(gateMode);
  useEffect(() => {
    if (gateMode) {
      setIsAdmin(true);
      return;
    }
    let active = true;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (active) setIsAdmin(!!roles?.some((r) => r.role === "admin"));
    })();
    return () => {
      active = false;
    };
  }, [gateMode]);

  const [photo, setPhoto] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem("studio:photo");
  });
  const [media, setMedia] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(sessionStorage.getItem("studio:media") || "[]");
    } catch {
      return [];
    }
  });
  const [styleId, setStyleId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem("studio:styleId");
  });
  const [picked, setPicked] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(sessionStorage.getItem("studio:picked") || "[]");
    } catch {
      return [];
    }
  });
  const [placementRequest, setPlacementRequest] = useState(() => {
    if (typeof window === "undefined")
      return "Place these pictures naturally on the main empty wall.";
    return (
      sessionStorage.getItem("studio:placement") ||
      "Place these pictures naturally on the main empty wall."
    );
  });

  useEffect(() => {
    if (photo) sessionStorage.setItem("studio:photo", photo);
    else sessionStorage.removeItem("studio:photo");
  }, [photo]);
  useEffect(() => {
    sessionStorage.setItem("studio:media", JSON.stringify(media));
  }, [media]);
  useEffect(() => {
    if (styleId) sessionStorage.setItem("studio:styleId", styleId);
    else sessionStorage.removeItem("studio:styleId");
  }, [styleId]);
  useEffect(() => {
    sessionStorage.setItem("studio:picked", JSON.stringify(picked));
  }, [picked]);
  useEffect(() => {
    sessionStorage.setItem("studio:placement", placementRequest);
  }, [placementRequest]);
  const [result, setResult] = useState<{ url: string; src: string } | null>(null);
  const [preparingPhoto, setPreparingPhoto] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Progress tracking
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [progressStatus, setProgressStatus] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const styles = (data?.styles?.length ? data.styles : LOCAL_MOCK_STYLES) as any[];

  useEffect(() => {
    if (!styleId && styles[0]?.id) setStyleId(styles[0].id);
  }, [styles, styleId]);

  const stage = useMutation({
    mutationFn: async () => {
      if (!photo || !styleId || picked.length === 0)
        throw new Error("Photo, style and at least one artwork required");
      setLastError(null);
      setStartedAt(Date.now());
      setProgressStatus("compositing");
      const artworks = (data?.artworks ?? [])
        .filter((a: any) => picked.includes(a.id))
        .map((a: any) => ({
          id: a.id,
          title: a.title,
          medium: a.medium,
          image_url: localImageForKey(a.image_url) || a.image_url,
        }));
      return stageRoomClient({
        sourceImageBase64: photo,
        styleId,
        artworkIds: picked,
        mediaFilter: media,
        placementRequest,
        artworks,
      });
    },
    onSuccess: (r) => {
      setResult({ url: r.resultUrl, src: r.sourceUrl });
      setProgressStatus(null);
      setStartedAt(null);
      toast.success(r.provider === "canvas-preview" ? "Preview staged on wall" : "Render ready");
    },
    onError: (e: any) => {
      const msg = publicMessage(e, "Render failed");
      setLastError(msg);
      setProgressStatus(null);
      setStartedAt(null);
      toast.error(msg);
    },
  });

  // Elapsed-time ticker while staging
  useEffect(() => {
    if (!startedAt) {
      setElapsed(0);
      return;
    }
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 500);
    return () => clearInterval(t);
  }, [startedAt]);

  const progressLabel = useMemo(() => {
    if (!stage.isPending) return null;
    const base =
      progressStatus === "reconnecting"
        ? "Reconnecting…"
        : progressStatus === "processing" || progressStatus === "compositing"
          ? "Composing your room"
          : progressStatus === "uploading"
            ? "Uploading photo"
            : progressStatus === "pending"
              ? "Queued"
              : "Working";
    const phase =
      elapsed < 8
        ? "preparing your room"
        : elapsed < 25
          ? "analysing wall geometry"
          : elapsed < 50
            ? "placing artworks in scene"
            : elapsed < 80
              ? "matching lighting and shadows"
              : "finalising";
    return `${base} · ${phase} · ${elapsed}s`;
  }, [stage.isPending, progressStatus, elapsed]);

  async function onPick(file: File) {
    setPreparingPhoto(true);
    try {
      setPhoto(await fileToDownscaledDataUrl(file));
    } finally {
      setPreparingPhoto(false);
    }
  }

  const artworks = (data?.artworks ?? [])
    .map((a: any, index: number) => ({
      ...a,
      image_url: localImageForKey(a.id || a.title || "artwork", index),
    }))
    .filter((a: any) => media.length === 0 || media.includes(a.medium));
  const artistName = (id: string) => data?.artists.find((x: any) => x.id === id)?.name ?? "";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="font-display text-xl">
            MyAfriArt
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <NotifyBell />
            <Link to="/notify" className="text-muted-foreground hover:text-foreground">
              NotifyMe
            </Link>
            <Link to="/renders" className="text-muted-foreground hover:text-foreground">
              My renders
            </Link>
            {isAdmin && (
              <Link to="/admin" className="font-medium text-foreground hover:underline">
                Admin
              </Link>
            )}

            <button
              onClick={() => window.location.reload()}
              className="text-muted-foreground hover:text-foreground"
              title="Reload page"
            >
              ↻ Refresh
            </button>
            <button
              onClick={() => {
                clearAdminGate();
                void supabase.auth.signOut();
                window.location.href = "/login";
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-10 px-6 py-10 lg:grid-cols-[1fr_360px]">
        {/* Canvas */}
        <section>
          <h1 className="font-display text-3xl">Studio</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Stage curated artworks on a wall in your room.
          </p>

          <div className="mt-6">
            {result ? (
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <BeforeAfter before={result.src} after={result.url} />
              </div>
            ) : (
              <ImageDropzone
                value={photo}
                onSelect={(file) => void onPick(file)}
                busy={preparingPhoto}
                title="Drag a photo of your room here, or click to choose"
                hint="Straight-on shot of the wall · JPG, PNG or WebP"
              />
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])}
          />

          <div className="mt-3 flex gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent"
            >
              {photo ? "Replace photo" : "Take a photo"}
            </button>
            {result && (
              <>
                <a
                  href={result.url}
                  download
                  className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent"
                >
                  Download
                </a>
                <button
                  onClick={() => setResult(null)}
                  className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent"
                >
                  New render
                </button>
              </>
            )}
          </div>
        </section>

        {/* Controls */}
        <aside className="space-y-6">
          <Field label="Medium">
            <div className="flex flex-wrap gap-2">
              {MEDIA.map((m) => {
                const on = media.includes(m.v);
                return (
                  <button
                    key={m.v}
                    onClick={() => setMedia(on ? media.filter((x) => x !== m.v) : [...media, m.v])}
                    className={`rounded-full border px-3 py-1 text-xs ${on ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-accent"}`}
                  >
                    {m.l}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Style">
            <div className="grid grid-cols-2 gap-2">
              {styles.map((s: any) => (
                <button
                  key={s.id}
                  onClick={() => setStyleId(s.id)}
                  className={`rounded-md border px-3 py-2 text-left text-sm ${styleId === s.id ? "border-primary bg-primary/5" : "border-border hover:bg-accent"}`}
                >
                  <div className="font-medium">{s.name}</div>
                  {s.description && (
                    <div className="mt-0.5 text-[11px] text-muted-foreground">{s.description}</div>
                  )}
                </button>
              ))}
            </div>
          </Field>

          <Field label={`Artworks (${picked.length}/3)`}>
            {isLoading ? (
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 9 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square w-full rounded" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {artworks.map((a: any) => {
                  const on = picked.includes(a.id);
                  return (
                    <button
                      key={a.id}
                      onClick={() =>
                        setPicked(
                          on
                            ? picked.filter((x) => x !== a.id)
                            : picked.length < 3
                              ? [...picked, a.id]
                              : picked,
                        )
                      }
                      className={`group relative aspect-square overflow-hidden rounded border ${on ? "border-primary ring-2 ring-primary" : "border-border"}`}
                      title={`${a.title} — ${artistName(a.artist_id)}`}
                    >
                      <img
                        src={localImageForKey(a.id || a.title)}
                        alt={a.title}
                        className="h-full w-full object-cover"
                      />
                      {on && <div className="absolute inset-0 bg-primary/20" />}
                    </button>
                  );
                })}
                {artworks.length === 0 && (
                  <div className="col-span-3 text-xs text-muted-foreground">
                    No artworks match this filter.
                  </div>
                )}
              </div>
            )}
          </Field>

          <Field label="Placement request">
            <textarea
              value={placementRequest}
              onChange={(e) => setPlacementRequest(e.target.value)}
              maxLength={500}
              className="min-h-24 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Example: Put two framed prints above the sofa and one small piece near the lamp."
            />
          </Field>

          <div className="space-y-3">
            <button
              disabled={stage.isPending || !photo || !styleId || picked.length === 0}
              onClick={() => stage.mutate()}
              className="w-full rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40"
            >
              {stage.isPending
                ? "Composing your room…"
                : lastError
                  ? "Try again"
                  : "Stage the room"}
            </button>

            {stage.isPending && (
              <div className="rounded-md border border-border bg-card p-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary" />
                  <span className="font-medium text-foreground">{progressLabel}</span>
                </div>
                <div className="mt-2 h-1 w-full overflow-hidden rounded bg-muted">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${Math.min(95, 10 + elapsed * 1.1)}%` }}
                  />
                </div>
                <div className="mt-2 text-muted-foreground">
                  Renders typically take 30–90 seconds. You can leave this page open.
                </div>
              </div>
            )}

            {!stage.isPending && lastError && (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs">
                <div className="font-medium text-destructive">Render failed</div>
                <div className="mt-1 text-muted-foreground">{lastError}</div>
                <button
                  onClick={() => {
                    setLastError(null);
                    stage.mutate();
                  }}
                  className="mt-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs hover:bg-accent"
                >
                  Retry render
                </button>
              </div>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      {children}
    </div>
  );
}

function BeforeAfter({ before, after }: { before: string; after: string }) {
  const [pct, setPct] = useState(50);
  return (
    <div className="relative aspect-[4/3] w-full select-none overflow-hidden bg-black">
      <img src={after} alt="Staged" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${pct}%` }}>
        <img
          src={before}
          alt="Original"
          className="h-full w-full object-cover"
          style={{ width: `${100 / (pct / 100)}%`, maxWidth: "none" }}
        />
      </div>
      <div className="absolute inset-y-0" style={{ left: `${pct}%` }}>
        <div className="h-full w-px bg-white/80" />
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={pct}
        onChange={(e) => setPct(+e.target.value)}
        className="absolute inset-x-0 bottom-3 mx-auto w-2/3 accent-primary"
      />
    </div>
  );
}
