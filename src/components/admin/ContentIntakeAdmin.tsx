import React, { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { UploadCloud, Check, X, Loader2, Trash2, Send, Gauge, ShieldAlert, Copy, Wand2 } from "lucide-react";
import { enrichContentImage } from "@/lib/ai.functions";
import { bulkStage } from "@/lib/content-intake.functions";

const T = { ink: "#171633", ink2: "#3A3960", paper: "#FAF8F3", brass: "#A67C34", stone: "#8A8577",
  line: "#DED8C8", ok: "#2F6B4F", warn: "#9A6414", bad: "#8E2B24", accent: "#2F7D4F",
  sans: 'ui-sans-serif, system-ui, "Segoe UI", Roboto, sans-serif' };
const CATS = ["Painting", "Sculpture", "Photography", "Textile art", "Mixed media", "Print", "Craft"];
const uid = () => Math.random().toString(36).slice(2, 9);
const clamp01 = (n: number) => Math.max(0, Math.min(1, Number(n) || 0));

async function aHash(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas"); c.width = 8; c.height = 8;
      const ctx = c.getContext("2d")!; ctx.drawImage(img, 0, 0, 8, 8);
      const d = ctx.getImageData(0, 0, 8, 8).data; const g: number[] = [];
      for (let i = 0; i < d.length; i += 4) g.push(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
      const avg = g.reduce((a, b) => a + b, 0) / g.length;
      resolve(g.map((v) => (v >= avg ? 1 : 0)).join(""));
    };
    img.onerror = () => resolve("");
    img.src = dataUrl;
  });
}
const hamming = (a: string, b: string) => { if (!a || !b || a.length !== b.length) return 99; let d = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++; return d; };

type Item = { id: string; name: string; dataUrl: string; mediaType: string; hash: string; dupOf: string | null;
  status: "queued" | "enriching" | "review" | "approved" | "rejected" | "error"; ai: any };

export function ContentIntakeAdmin() {
  const enrich = useServerFn(enrichContentImage);
  const stage = useServerFn(bulkStage);
  const [items, setItems] = useState<Item[]>([]);
  const [autoApprove, setAutoApprove] = useState(true);
  const [threshold, setThreshold] = useState(0.82);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const patch = (id: string, p: Partial<Item>) => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...p } : x)));

  const runEnrich = async (it: Item) => {
    patch(it.id, { status: "enriching" });
    try {
      const ai = await enrich({ data: { imageBase64: it.dataUrl.split(",")[1], mediaType: it.mediaType, categories: CATS, noun: "artwork", appName: "MyAfriArt" } });
      const conf = clamp01(ai.confidence);
      const blocked = (ai.quality || []).some((q: string) => ["watermarked", "low_resolution", "blurry"].includes(q));
      const auto = autoApprove && conf >= threshold && !ai.needsVetting && !blocked && !it.dupOf;
      patch(it.id, { ai: { ...ai, confidence: conf }, status: auto ? "approved" : "review" });
    } catch { patch(it.id, { status: "error" }); }
  };

  const ingest = async (files: FileList) => {
    const arr = [...files].filter((f) => f.type.startsWith("image/"));
    const seen = items.map((x) => ({ id: x.id, h: x.hash }));
    for (const f of arr) {
      const dataUrl: string = await new Promise((r) => { const rd = new FileReader(); rd.onload = () => r(rd.result as string); rd.readAsDataURL(f); });
      const hash = await aHash(dataUrl);
      const dup = seen.find((e) => hamming(e.h, hash) <= 4);
      const it: Item = { id: uid(), name: f.name, dataUrl, mediaType: f.type, hash, dupOf: dup?.id || null, status: "queued", ai: null };
      seen.push({ id: it.id, h: hash });
      setItems((xs) => [...xs, it]);
      void runEnrich(it);
    }
    if (arr.length) toast.success(`Enriching ${arr.length} image${arr.length > 1 ? "s" : ""}…`);
  };

  const approved = items.filter((x) => x.status === "approved");
  const stageApproved = async () => {
    if (!approved.length) return toast.warning("Nothing approved to stage yet.");
    try {
      const res = await stage({ data: { items: approved.map((x) => ({
        source_name: x.name, image_hash: x.hash, image_url: x.ai.imageUrl, title: x.ai.title,
        category: x.ai.category, subcategory: x.ai.subcategory, description: x.ai.description,
        attributes: x.ai.attributes, cultural_tags: x.ai.culturalTags || [], price_band: x.ai.suggestedPriceBand,
        needs_vetting: !!x.ai.needsVetting, confidence: x.ai.confidence,
      })) } });
      setItems((xs) => xs.filter((x) => x.status !== "approved"));
      toast.success(`Staged ${res.staged} of ${res.received} for publish.`);
    } catch (e: any) { toast.error(e?.message || "Staging failed"); }
  };

  const chip = (bg: string, fg: string) => ({ background: bg, color: fg, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, display: "inline-flex", alignItems: "center", gap: 4 } as const);
  const inp = { width: "100%", fontFamily: T.sans, fontSize: 12, padding: "6px 8px", borderRadius: 6, border: `1px solid ${T.line}`, boxSizing: "border-box" as const };
  const setField = (id: string, k: string, v: any) => setItems((xs) => xs.map((x) => x.id === id ? { ...x, ai: { ...x.ai, [k]: v } } : x));

  return (
    <div style={{ fontFamily: T.sans, color: T.ink }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 600 }}>
          <input type="checkbox" checked={autoApprove} onChange={(e) => setAutoApprove(e.target.checked)} />
          <Wand2 size={14} style={{ color: T.accent }} /> Auto-approve high-confidence
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: autoApprove ? 1 : 0.4 }}>
          <span style={{ fontSize: 11, color: T.stone }}>Threshold</span>
          <input type="range" min="0.6" max="0.98" step="0.02" value={threshold} disabled={!autoApprove} onChange={(e) => setThreshold(Number(e.target.value))} />
          <span style={{ fontSize: 11.5, fontWeight: 700 }}>{Math.round(threshold * 100)}%</span>
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11.5, color: T.stone }}><b style={{ color: T.ok }}>{approved.length}</b> approved</span>
        <button onClick={stageApproved} style={{ background: T.accent, color: "#fff", border: "none", borderRadius: 8, padding: "8px 13px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", display: "inline-flex", gap: 7, alignItems: "center" }}>
          <Send size={14} /> Stage {approved.length || ""} for publish
        </button>
      </div>

      <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files?.length) ingest(e.dataTransfer.files); }}
        onClick={() => fileRef.current?.click()}
        style={{ border: `2px dashed ${drag ? T.accent : T.line}`, background: drag ? "#fff" : "#F7F4EC", borderRadius: 14, padding: items.length ? 16 : "44px 16px", textAlign: "center", cursor: "pointer", marginBottom: 16 }}>
        <UploadCloud size={items.length ? 22 : 30} style={{ color: T.accent }} />
        <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 6 }}>Drop consented artwork images, or click to choose</div>
        <div style={{ fontSize: 11.5, color: T.stone, marginTop: 3 }}>Each image is catalogued by AI server-side, de-duplicated, and quality/vetting-checked.</div>
        <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => { if (e.target.files) ingest(e.target.files); e.currentTarget.value = ""; }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
        {items.map((it) => (
          <div key={it.id} style={{ background: "#fff", border: `1px solid ${it.dupOf ? T.brass : T.line}`, borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ position: "relative" }}>
              <img src={it.dataUrl} alt="" style={{ width: "100%", height: 150, objectFit: "cover", display: "block" }} />
              <div style={{ position: "absolute", top: 8, left: 8, display: "flex", gap: 5 }}>
                {it.dupOf && <span style={chip("#F6EBD3", T.warn)}><Copy size={10} /> Duplicate</span>}
                {it.status === "approved" && <span style={chip("#E4F0E8", T.ok)}>Approved</span>}
                {it.status === "review" && <span style={chip("#FBF1DD", T.warn)}>Review</span>}
              </div>
              {it.ai && <div style={{ position: "absolute", top: 8, right: 8 }}><span style={chip("#00000022", "#fff")}><Gauge size={10} /> {Math.round(it.ai.confidence * 100)}%</span></div>}
            </div>
            {(it.status === "queued" || it.status === "enriching") && (
              <div style={{ padding: 22, textAlign: "center", color: T.stone, fontSize: 12 }}><Loader2 size={18} className="cis-spin" style={{ color: T.accent }} /><div style={{ marginTop: 6 }}>Reading the image…</div></div>
            )}
            {it.status === "error" && <div style={{ padding: 16, textAlign: "center", fontSize: 12, color: T.bad }}>Failed. <button onClick={() => runEnrich(it)} style={{ marginLeft: 6, cursor: "pointer" }}>Retry</button></div>}
            {it.ai && it.status !== "error" && (
              <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                <input style={{ ...inp, fontWeight: 600 }} value={it.ai.title} onChange={(e) => setField(it.id, "title", e.target.value)} />
                <div style={{ display: "flex", gap: 6 }}>
                  <select style={{ ...inp, flex: 1 }} value={it.ai.category} onChange={(e) => setField(it.id, "category", e.target.value)}>{CATS.map((c) => <option key={c}>{c}</option>)}</select>
                  <input style={{ ...inp, flex: 1 }} value={it.ai.suggestedPriceBand || ""} onChange={(e) => setField(it.id, "suggestedPriceBand", e.target.value)} />
                </div>
                <textarea style={{ ...inp, resize: "vertical", fontFamily: T.sans }} rows={2} value={it.ai.description} onChange={(e) => setField(it.id, "description", e.target.value)} />
                {(it.ai.needsVetting || (it.ai.quality || []).some((q: string) => q !== "ok")) && (
                  <div style={{ background: "#FBF1DD", border: `1px solid ${T.brass}`, borderRadius: 7, padding: "6px 9px", fontSize: 10.5, color: T.warn, display: "flex", gap: 6 }}>
                    <ShieldAlert size={13} style={{ flexShrink: 0 }} /><span>{it.ai.needsVetting ? "Needs human vetting. " : ""}{(it.ai.quality || []).filter((q: string) => q !== "ok").join(", ")}</span>
                  </div>
                )}
                <div style={{ marginTop: "auto", display: "flex", gap: 6 }}>
                  {it.status !== "approved"
                    ? <button onClick={() => patch(it.id, { status: "approved" })} style={{ flex: 1, background: T.ok, color: "#fff", border: "none", borderRadius: 8, padding: "8px", fontWeight: 600, cursor: "pointer" }}><Check size={13} /> Approve</button>
                    : <button onClick={() => patch(it.id, { status: "review" })} style={{ flex: 1, background: "#F1EEE6", color: T.ink2, border: "none", borderRadius: 8, padding: "8px", cursor: "pointer" }}>Unapprove</button>}
                  <button onClick={() => setItems((xs) => xs.filter((x) => x.id !== it.id))} style={{ background: "#F3E8E7", color: T.bad, border: "none", borderRadius: 8, padding: "8px 10px", cursor: "pointer" }}><Trash2 size={13} /></button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <style>{`.cis-spin{animation:cisspin 1s linear infinite}@keyframes cisspin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
