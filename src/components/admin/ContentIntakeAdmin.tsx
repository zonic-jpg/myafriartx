import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  UploadCloud,
  Check,
  X,
  Loader2,
  Trash2,
  Send,
  ShieldAlert,
  Copy,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
} from "lucide-react";
import {
  listArtists,
  createArtist as createArtistApi,
  updateArtist as updateArtistApi,
  exhibitionInterest as exhibitionInterestApi,
  enrichImage,
  bulkStage,
  listStagedForArtist,
  listPendingQueue,
  approveArtistBatch,
  deleteStagedItem,
} from "@/lib/content-intake-client";

const T = {
  ink: "#171633",
  ink2: "#3A3960",
  paper: "#FAF8F3",
  brass: "#A67C34",
  stone: "#8A8577",
  line: "#DED8C8",
  ok: "#2F6B4F",
  warn: "#9A6414",
  bad: "#8E2B24",
  accent: "#2F7D4F",
  sans: 'ui-sans-serif, system-ui, "Segoe UI", Roboto, sans-serif',
};
const CATS = ["Painting", "Sculpture", "Photography", "Textile art", "Mixed media", "Print", "Craft"];
const MEDIA = [
  { v: "oil", l: "Oil" },
  { v: "watercolor", l: "Watercolour" },
  { v: "pastel", l: "Pastel" },
  { v: "sculpture", l: "Sculpture" },
  { v: "photograph", l: "Photography" },
  { v: "print", l: "Print" },
  { v: "mixed_media", l: "Mixed media" },
  { v: "acrylic", l: "Acrylic" },
  { v: "drawing", l: "Drawing" },
];
const uid = () => Math.random().toString(36).slice(2, 9);
const clamp01 = (n: number) => Math.max(0, Math.min(1, Number(n) || 0));

async function aHash(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = 8;
      c.height = 8;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0, 8, 8);
      const d = ctx.getImageData(0, 0, 8, 8).data;
      const g: number[] = [];
      for (let i = 0; i < d.length; i += 4) g.push(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
      const avg = g.reduce((a, b) => a + b, 0) / g.length;
      resolve(g.map((v) => (v >= avg ? 1 : 0)).join(""));
    };
    img.onerror = () => resolve("");
    img.src = dataUrl;
  });
}
const hamming = (a: string, b: string) => {
  if (!a || !b || a.length !== b.length) return 99;
  let d = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
  return d;
};

type Draft = {
  id: string;
  name: string;
  dataUrl: string;
  mediaType: string;
  hash: string;
  dupOf: string | null;
  status: "queued" | "enriching" | "ready" | "error";
  ai: any;
  medium: string;
  year: string;
  origin: string;
};

/** Admin-only opt-in on the artist's own profile — no public form. Debounced
 * save on blur so typing in the notes field doesn't fire a request per keystroke. */
function ExhibitionInterestRow({
  artist,
  onSaved,
}: {
  artist: { id: string; exhibition_interest?: boolean; exhibition_notes?: string | null };
  onSaved: () => void;
}) {
  const [interested, setInterested] = useState(!!artist.exhibition_interest);
  const [notes, setNotes] = useState(artist.exhibition_notes || "");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setInterested(!!artist.exhibition_interest);
    setNotes(artist.exhibition_notes || "");
  }, [artist.id]);

  const save = async (patch: { exhibition_interest?: boolean; exhibition_notes?: string }) => {
    setSaving(true);
    try {
      await updateArtistApi({ id: artist.id, ...patch });
      onSaved();
    } catch (e: any) {
      toast.error(e?.message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.line}` }}>
      <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={interested}
          disabled={saving}
          onChange={(e) => {
            setInterested(e.target.checked);
            save({ exhibition_interest: e.target.checked });
          }}
        />
        Interested in shared/cost-pooled exhibition logistics
      </label>
      <div style={{ fontSize: 10.5, color: T.stone, marginTop: 2, marginBottom: interested ? 6 : 0 }}>
        Admin-only — never shown publicly. Group artists interested in the same event for shared costs.
      </div>
      {interested && (
        <input
          style={{ width: "100%", fontFamily: T.sans, fontSize: 12, padding: "6px 8px", borderRadius: 6, border: `1px solid ${T.line}`, boxSizing: "border-box" }}
          placeholder="Target exhibition / region (e.g. Dakar Biennale 2027)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => save({ exhibition_notes: notes })}
        />
      )}
    </div>
  );
}

export function ContentIntakeAdmin() {
  const qc = useQueryClient();

  // Artists are fetched by this component itself via the content-intake
  // Netlify Function — the admin page's own artist-loading (adminGetAll) is
  // a separate, currently-non-functional server fn; this no longer depends on it.
  const artistsQuery = useQuery({
    queryKey: ["content-intake", "artists"],
    queryFn: () => listArtists(),
  });
  const artists = artistsQuery.data?.artists ?? [];

  // --- Step 1: artist picker -------------------------------------------
  const [artistQuery, setArtistQuery] = useState("");
  const [artistId, setArtistId] = useState<string | null>(null);
  const [creatingArtist, setCreatingArtist] = useState(false);
  const [newArtistName, setNewArtistName] = useState("");
  const filteredArtists = useMemo(
    () => artists.filter((a) => a.name.toLowerCase().includes(artistQuery.toLowerCase())).slice(0, 8),
    [artists, artistQuery],
  );
  const currentArtist = artists.find((a) => a.id === artistId) || null;

  const submitNewArtist = async () => {
    if (!newArtistName.trim()) return;
    try {
      const { artist } = await createArtistApi({ name: newArtistName.trim() });
      toast.success(`Added ${artist.name}`);
      qc.invalidateQueries({ queryKey: ["content-intake", "artists"] });
      setArtistId(artist.id);
      setCreatingArtist(false);
      setNewArtistName("");
      setArtistQuery("");
    } catch (e: any) {
      toast.error(e?.message || "Could not create artist");
    }
  };

  // --- Step 2: this artist's pool — previously staged (read-only) + fresh drafts (editable)
  const stagedQuery = useQuery({
    queryKey: ["content-intake", "staged", artistId],
    queryFn: () => listStagedForArtist(artistId!),
    enabled: !!artistId,
  });
  const staged = stagedQuery.data?.items ?? [];

  const [drafts, setDrafts] = useState<Draft[]>([]);
  useEffect(() => setDrafts([]), [artistId]); // switching artist clears the unsaved pool
  const patchDraft = (id: string, p: Partial<Draft>) => setDrafts((xs) => xs.map((x) => (x.id === id ? { ...x, ...p } : x)));

  const runEnrich = async (d: Draft) => {
    patchDraft(d.id, { status: "enriching" });
    try {
      const ai = await enrichImage({
        imageBase64: d.dataUrl.split(",")[1],
        mediaType: d.mediaType,
        categories: CATS,
        noun: "artwork",
        appName: "MyAfriArt",
      });
      patchDraft(d.id, { ai: { ...ai, confidence: clamp01(ai.confidence ?? 0) }, status: "ready" });
    } catch (e: any) {
      patchDraft(d.id, { status: "error" });
      toast.error(e?.message || "Could not read this image");
    }
  };

  const ingest = async (files: FileList) => {
    if (!artistId) return;
    const arr = [...files].filter((f) => f.type.startsWith("image/"));
    const seenLocal = drafts.map((x) => ({ id: x.id, h: x.hash }));
    const seenStaged = staged.map((x: any) => ({ id: x.id, h: x.image_hash || "" }));
    const seen = [...seenLocal, ...seenStaged];
    for (const f of arr) {
      const dataUrl: string = await new Promise((r) => {
        const rd = new FileReader();
        rd.onload = () => r(rd.result as string);
        rd.readAsDataURL(f);
      });
      const hash = await aHash(dataUrl);
      const dup = seen.find((e) => hamming(e.h, hash) <= 4);
      const d: Draft = {
        id: uid(),
        name: f.name,
        dataUrl,
        mediaType: f.type,
        hash,
        dupOf: dup?.id || null,
        status: "queued",
        ai: null,
        medium: "mixed_media",
        year: "",
        origin: "",
      };
      seen.push({ id: d.id, h: hash });
      setDrafts((xs) => [...xs, d]);
      void runEnrich(d);
    }
    if (arr.length) toast.success(`Reading ${arr.length} image${arr.length > 1 ? "s" : ""}…`);
  };

  // --- Focused carousel editor ------------------------------------------
  const [openId, setOpenId] = useState<string | null>(null);
  const editable = drafts.filter((d) => d.status === "ready" || d.status === "error");
  const openIndex = editable.findIndex((d) => d.id === openId);
  const openDraft = openIndex >= 0 ? editable[openIndex] : null;
  const goto = (delta: number) => {
    if (openIndex < 0) return;
    const next = editable[openIndex + delta];
    setOpenId(next ? next.id : null);
  };

  const readyCount = drafts.filter((d) => d.status === "ready").length;
  const submitReady = async () => {
    if (!artistId) return;
    const ready = drafts.filter((d) => d.status === "ready");
    if (!ready.length) return toast.warning("Nothing ready to submit yet.");
    try {
      const res = await bulkStage(
        ready.map((d) => ({
          source_name: d.name,
          image_hash: d.hash,
          image_url: d.ai.imageUrl,
          title: d.ai.title,
          category: d.ai.category,
          subcategory: d.ai.subcategory,
          description: d.ai.description,
          attributes: d.ai.attributes || {},
          cultural_tags: d.ai.culturalTags || [],
          price_band: d.ai.suggestedPriceBand,
          needs_vetting: !!d.ai.needsVetting,
          confidence: d.ai.confidence,
          artist_id: artistId,
          medium: d.medium,
          year: d.year || undefined,
          origin: d.origin || undefined,
        })),
      );
      setDrafts((xs) => xs.filter((d) => d.status !== "ready"));
      setOpenId(null);
      qc.invalidateQueries({ queryKey: ["content-intake", "staged", artistId] });
      qc.invalidateQueries({ queryKey: ["content-intake", "queue"] });
      toast.success(`Submitted ${res.staged} of ${res.received} for approval.`);
    } catch (e: any) {
      toast.error(e?.message || "Submit failed");
    }
  };

  // --- Step 3: admin approval queue, across all artists ------------------
  const queueQuery = useQuery({
    queryKey: ["content-intake", "queue"],
    queryFn: () => listPendingQueue(),
  });
  const queue = queueQuery.data?.artists ?? [];
  const [approving, setApproving] = useState<string | null>(null);
  const approve = async (id: string) => {
    setApproving(id);
    try {
      const res = await approveArtistBatch(id);
      toast.success(
        res.heldForVetting
          ? `Published ${res.published}. ${res.heldForVetting} still need human vetting.`
          : `Published ${res.published} to the artist's profile.`,
      );
      qc.invalidateQueries({ queryKey: ["content-intake", "queue"] });
      qc.invalidateQueries({ queryKey: ["content-intake", "staged"] });
    } catch (e: any) {
      toast.error(e?.message || "Approve failed");
    } finally {
      setApproving(null);
    }
  };

  const inp = {
    width: "100%",
    fontFamily: T.sans,
    fontSize: 12,
    padding: "6px 8px",
    borderRadius: 6,
    border: `1px solid ${T.line}`,
    boxSizing: "border-box" as const,
  };
  const chip = (bg: string, fg: string) =>
    ({
      background: bg,
      color: fg,
      fontSize: 10,
      fontWeight: 700,
      padding: "2px 8px",
      borderRadius: 20,
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
    }) as const;
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div style={{ fontFamily: T.sans, color: T.ink }}>
      {/* Step 1 — artist */}
      <div style={{ border: `1px solid ${T.line}`, borderRadius: 12, padding: 14, marginBottom: 16, background: "#fff" }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, color: T.stone, marginBottom: 8 }}>
          1 · Artist
        </div>
        {currentArtist ? (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: T.paper, border: `1px solid ${T.line}`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: T.brass, overflow: "hidden" }}>
                {currentArtist.portrait_url ? (
                  <img src={currentArtist.portrait_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  currentArtist.name[0]?.toUpperCase()
                )}
              </div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{currentArtist.name}</div>
              <button onClick={() => setArtistId(null)} style={{ marginLeft: "auto", fontSize: 11.5, color: T.stone, background: "none", border: "none", cursor: "pointer" }}>
                Switch artist
              </button>
            </div>
            <ExhibitionInterestRow artist={currentArtist} onSaved={() => qc.invalidateQueries({ queryKey: ["content-intake", "artists"] })} />
          </div>
        ) : (
          <div>
            <div style={{ position: "relative" }}>
              <Search size={13} style={{ position: "absolute", left: 9, top: 9, color: T.stone }} />
              <input
                style={{ ...inp, paddingLeft: 28 }}
                placeholder="Search artists by name…"
                value={artistQuery}
                onChange={(e) => setArtistQuery(e.target.value)}
              />
            </div>
            {artistQuery && (
              <div style={{ marginTop: 6, border: `1px solid ${T.line}`, borderRadius: 8, overflow: "hidden" }}>
                {filteredArtists.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => { setArtistId(a.id); setArtistQuery(""); }}
                    style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 10px", fontSize: 12.5, background: "#fff", border: "none", borderBottom: `1px solid ${T.line}`, cursor: "pointer" }}
                  >
                    {a.name}
                  </button>
                ))}
                {!filteredArtists.length && (
                  <div style={{ padding: "7px 10px", fontSize: 12, color: T.stone }}>No match.</div>
                )}
              </div>
            )}
            <div style={{ marginTop: 8 }}>
              {creatingArtist ? (
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    style={inp}
                    placeholder="New artist's name"
                    value={newArtistName}
                    onChange={(e) => setNewArtistName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submitNewArtist()}
                    autoFocus
                  />
                  <button onClick={submitNewArtist} style={{ background: T.accent, color: "#fff", border: "none", borderRadius: 8, padding: "0 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    Add
                  </button>
                  <button onClick={() => setCreatingArtist(false)} style={{ background: "#F1EEE6", border: "none", borderRadius: 8, padding: "0 10px", cursor: "pointer" }}>
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <button onClick={() => setCreatingArtist(true)} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: T.accent, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
                  <Plus size={13} /> New artist
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Step 2 — upload + review pool (only once an artist is picked) */}
      {artistId && (
        <div style={{ border: `1px solid ${T.line}`, borderRadius: 12, padding: 14, marginBottom: 16, background: "#fff" }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, color: T.stone }}>
              2 · Upload &amp; prep images for {currentArtist?.name}
            </div>
            <div style={{ flex: 1 }} />
            {readyCount > 0 && (
              <button onClick={submitReady} style={{ background: T.accent, color: "#fff", border: "none", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "inline-flex", gap: 6, alignItems: "center" }}>
                <Send size={13} /> Submit {readyCount} for approval
              </button>
            )}
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files?.length) ingest(e.dataTransfer.files); }}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${drag ? T.accent : T.line}`,
              background: drag ? "#fff" : "#F7F4EC",
              borderRadius: 12,
              padding: "22px 14px",
              textAlign: "center",
              cursor: "pointer",
              marginBottom: drafts.length || staged.length ? 14 : 0,
            }}
          >
            <UploadCloud size={22} style={{ color: T.accent }} />
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 5 }}>Drop a batch of images, or click to choose</div>
            <div style={{ fontSize: 11, color: T.stone, marginTop: 2 }}>Click any thumbnail below to add its details, then move to the next.</div>
            <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => { if (e.target.files) ingest(e.target.files); e.currentTarget.value = ""; }} />
          </div>

          {(drafts.length > 0 || staged.length > 0) && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 10 }}>
              {drafts.map((d) => (
                <button
                  key={d.id}
                  onClick={() => d.status !== "queued" && d.status !== "enriching" && setOpenId(d.id)}
                  style={{ position: "relative", border: `2px solid ${d.status === "ready" ? T.ok : d.status === "error" ? T.bad : T.line}`, borderRadius: 8, overflow: "hidden", padding: 0, cursor: "pointer", aspectRatio: "1", background: "#f4f2ec" }}
                >
                  <img src={d.dataUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: d.status === "ready" ? 1 : 0.55 }} />
                  {(d.status === "queued" || d.status === "enriching") && (
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Loader2 size={16} className="cis-spin" style={{ color: T.accent }} />
                    </div>
                  )}
                  {d.status === "error" && (
                    <div style={{ position: "absolute", bottom: 4, left: 4 }}><span style={chip("#F3E8E7", T.bad)}>Failed</span></div>
                  )}
                  {d.dupOf && (
                    <div style={{ position: "absolute", top: 4, left: 4 }}><span style={chip("#F6EBD3", T.warn)}><Copy size={9} /></span></div>
                  )}
                  {d.status === "ready" && !d.year && !d.origin && (
                    <div style={{ position: "absolute", bottom: 4, left: 4, right: 4 }}><span style={chip("#FBF1DD", T.warn)}>Needs details</span></div>
                  )}
                </button>
              ))}
              {staged.map((s: any) => (
                <div key={s.id} title={s.title} style={{ position: "relative", border: `1px solid ${T.line}`, borderRadius: 8, overflow: "hidden", aspectRatio: "1", background: "#f4f2ec" }}>
                  <img src={s.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.75 }} />
                  <div style={{ position: "absolute", bottom: 4, left: 4 }}><span style={chip("#EDEBFB", T.ink2)}>Awaiting approval</span></div>
                  <button
                    onClick={async () => {
                      await deleteStagedItem(s.id);
                      qc.invalidateQueries({ queryKey: ["content-intake", "staged", artistId] });
                    }}
                    style={{ position: "absolute", top: 4, right: 4, background: "#00000066", border: "none", borderRadius: 6, padding: 3, cursor: "pointer" }}
                  >
                    <Trash2 size={11} color="#fff" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Focused carousel editor */}
      {openDraft && (
        <div style={{ position: "fixed", inset: 0, background: "#00000088", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setOpenId(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, maxWidth: 860, width: "100%", maxHeight: "90vh", overflow: "auto", display: "grid", gridTemplateColumns: "1fr 1fr" }}>
            <div style={{ background: "#111", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
              <img src={openDraft.dataUrl} alt="" style={{ maxWidth: "100%", maxHeight: "80vh", objectFit: "contain" }} />
              <button onClick={() => goto(-1)} disabled={openIndex <= 0} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", background: "#ffffffcc", border: "none", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", opacity: openIndex <= 0 ? 0.3 : 1 }}><ChevronLeft size={16} /></button>
              <button onClick={() => goto(1)} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "#ffffffcc", border: "none", borderRadius: "50%", width: 30, height: 30, cursor: "pointer" }}><ChevronRight size={16} /></button>
              <div style={{ position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)", fontSize: 10.5, color: "#fff", background: "#00000088", padding: "2px 9px", borderRadius: 20 }}>
                {openIndex + 1} of {editable.length}
              </div>
            </div>
            <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 9 }}>
              <button onClick={() => setOpenId(null)} style={{ alignSelf: "flex-end", background: "none", border: "none", cursor: "pointer", color: T.stone }}><X size={16} /></button>
              {openDraft.status === "error" ? (
                <div style={{ fontSize: 13, color: T.bad }}>
                  Reading this image failed. <button onClick={() => runEnrich(openDraft)} style={{ color: T.accent, cursor: "pointer", border: "none", background: "none", fontWeight: 600 }}>Retry</button>
                </div>
              ) : (
                <>
                  <label style={{ fontSize: 10.5, fontWeight: 700, color: T.stone, textTransform: "uppercase" }}>Title</label>
                  <input style={{ ...inp, fontWeight: 600 }} value={openDraft.ai?.title || ""} onChange={(e) => patchDraft(openDraft.id, { ai: { ...openDraft.ai, title: e.target.value } })} />

                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 10.5, fontWeight: 700, color: T.stone, textTransform: "uppercase" }}>Medium</label>
                      <select style={inp} value={openDraft.medium} onChange={(e) => patchDraft(openDraft.id, { medium: e.target.value })}>
                        {MEDIA.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}
                      </select>
                    </div>
                    <div style={{ width: 90 }}>
                      <label style={{ fontSize: 10.5, fontWeight: 700, color: T.stone, textTransform: "uppercase" }}>Date/year</label>
                      <input style={inp} placeholder="2024" value={openDraft.year} onChange={(e) => patchDraft(openDraft.id, { year: e.target.value })} />
                    </div>
                  </div>

                  <label style={{ fontSize: 10.5, fontWeight: 700, color: T.stone, textTransform: "uppercase" }}>Origin</label>
                  <input style={inp} placeholder="e.g. Oshogbo, Nigeria" value={openDraft.origin} onChange={(e) => patchDraft(openDraft.id, { origin: e.target.value })} />

                  <label style={{ fontSize: 10.5, fontWeight: 700, color: T.stone, textTransform: "uppercase" }}>Description</label>
                  <textarea style={{ ...inp, resize: "vertical", fontFamily: T.sans }} rows={3} value={openDraft.ai?.description || ""} onChange={(e) => patchDraft(openDraft.id, { ai: { ...openDraft.ai, description: e.target.value } })} />

                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 10.5, fontWeight: 700, color: T.stone, textTransform: "uppercase" }}>Category</label>
                      <select style={inp} value={openDraft.ai?.category || CATS[0]} onChange={(e) => patchDraft(openDraft.id, { ai: { ...openDraft.ai, category: e.target.value } })}>
                        {CATS.map((c) => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 10.5, fontWeight: 700, color: T.stone, textTransform: "uppercase" }}>Price band</label>
                      <input style={inp} value={openDraft.ai?.suggestedPriceBand || ""} onChange={(e) => patchDraft(openDraft.id, { ai: { ...openDraft.ai, suggestedPriceBand: e.target.value } })} />
                    </div>
                  </div>

                  {(openDraft.ai?.needsVetting || (openDraft.ai?.quality || []).some((q: string) => q !== "ok")) && (
                    <div style={{ background: "#FBF1DD", border: `1px solid ${T.brass}`, borderRadius: 7, padding: "6px 9px", fontSize: 10.5, color: T.warn, display: "flex", gap: 6 }}>
                      <ShieldAlert size={13} style={{ flexShrink: 0 }} />
                      <span>{openDraft.ai?.needsVetting ? "Needs human vetting. " : ""}{(openDraft.ai?.quality || []).filter((q: string) => q !== "ok").join(", ")}</span>
                    </div>
                  )}

                  <div style={{ marginTop: "auto", display: "flex", gap: 8, paddingTop: 8 }}>
                    <button
                      onClick={() => setDrafts((xs) => xs.filter((x) => x.id !== openDraft.id))}
                      style={{ background: "#F3E8E7", color: T.bad, border: "none", borderRadius: 8, padding: "9px 12px", cursor: "pointer" }}
                    >
                      <Trash2 size={13} /> Discard
                    </button>
                    <button
                      onClick={() => goto(1)}
                      style={{ flex: 1, background: T.ok, color: "#fff", border: "none", borderRadius: 8, padding: "9px", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                    >
                      <Check size={13} /> Save &amp; next
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 3 — admin approval queue, across all artists */}
      <div style={{ border: `1px solid ${T.line}`, borderRadius: 12, padding: 14, background: "#fff" }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, color: T.stone, marginBottom: 8 }}>
          3 · Approval queue
        </div>
        {queueQuery.isLoading && <div style={{ fontSize: 12, color: T.stone }}>Loading…</div>}
        {!queueQuery.isLoading && !queue.length && <div style={{ fontSize: 12, color: T.stone }}>Nothing waiting.</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {queue.map((a: any) => (
            <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, border: `1px solid ${T.line}`, borderRadius: 10, padding: 10 }}>
              <div style={{ display: "flex", marginRight: 4 }}>
                {a.items.slice(0, 4).map((it: any, i: number) => (
                  <img key={it.id} src={it.image_url} alt="" style={{ width: 34, height: 34, borderRadius: 6, objectFit: "cover", border: "2px solid #fff", marginLeft: i ? -10 : 0, boxShadow: "0 0 0 1px " + T.line }} />
                ))}
              </div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{a.name}</div>
              <div style={{ fontSize: 11.5, color: T.stone }}>{a.items.length} piece{a.items.length === 1 ? "" : "s"} ready</div>
              <div style={{ flex: 1 }} />
              <button
                onClick={() => approve(a.id)}
                disabled={approving === a.id}
                style={{ background: T.accent, color: "#fff", border: "none", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "inline-flex", gap: 6, alignItems: "center", opacity: approving === a.id ? 0.6 : 1 }}
              >
                {approving === a.id ? <Loader2 size={13} className="cis-spin" /> : <Check size={13} />} Approve → publish to profile
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Step 4 — exhibition cost-sharing interest, aggregated across artists */}
      <ExhibitionInterestPanel />
      <style>{`.cis-spin{animation:cisspin 1s linear infinite}@keyframes cisspin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

/** Admin-only aggregate: which artists opted into shared exhibition
 * logistics, grouped by their target event — so 2+ artists interested in
 * the same show are easy to spot. No public form; toggled per-artist above. */
function ExhibitionInterestPanel() {
  const q = useQuery({
    queryKey: ["content-intake", "exhibition-interest"],
    queryFn: () => exhibitionInterestApi(),
  });
  const groups = q.data?.groups ?? [];

  return (
    <div style={{ border: `1px solid ${T.line}`, borderRadius: 12, padding: 14, background: "#fff", marginTop: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, color: T.stone, marginBottom: 4 }}>
        4 · Exhibition cost-sharing interest
      </div>
      <div style={{ fontSize: 11, color: T.stone, marginBottom: 8 }}>
        Admin-only. Artists grouped by target exhibition — a group with 2+ names is a candidate for pooled logistics/costs.
      </div>
      {q.isLoading && <div style={{ fontSize: 12, color: T.stone }}>Loading…</div>}
      {!q.isLoading && !groups.length && <div style={{ fontSize: 12, color: T.stone }}>No artists have opted in yet.</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {groups.map((g) => (
          <div key={g.notes} style={{ border: `1px solid ${T.line}`, borderRadius: 8, padding: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ fontWeight: 600, fontSize: 12.5 }}>{g.notes}</div>
              {g.artists.length >= 2 && (
                <span style={{ background: "#E4F0E8", color: T.ok, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>
                  {g.artists.length} artists — poolable
                </span>
              )}
            </div>
            <div style={{ fontSize: 11.5, color: T.stone, marginTop: 3 }}>
              {g.artists.map((a) => a.name).join(", ")}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
