import React, { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Sparkles, Printer, Send, Plus, Trash2, ShieldCheck, AlertTriangle, ChevronLeft, ChevronRight, Upload, Loader2 } from "lucide-react";
import { getLetterhead, saveLetterhead, sendLetter } from "@/lib/letters.functions";
import { enrichRecipient } from "@/lib/ai.functions";

const T = { ink: "#171633", ink2: "#3A3960", paper: "#FAF8F3", paperEdge: "#EFEADD", brass: "#A67C34",
  brassHi: "#C79A4E", wax: "#6E2B2B", stone: "#8A8577", line: "#DED8C8", ok: "#2F6B4F", warn: "#9A6414",
  accent: "#2F7D4F", serif: '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif',
  sans: 'ui-sans-serif, system-ui, "Segoe UI", Roboto, sans-serif' };
const ORG = "MyAfriArt (ZonicMe Limited)";
const AUDIENCE_AUDIENCE = "collectors and lovers of African art";

const TEMPLATES: Record<string, any> = {
  permission: { label: "Content permission", subject: (b: string) => `Permission to feature your work on MyAfriArt`,
    role: "creative", cta: "Reply to grant permission, or ask us for the consent terms first.",
    build: (b: string) => [
      `We are writing from ${ORG} regarding ${b}. We admire your work and would like your permission to feature it on MyAfriArt, our platform for ${AUDIENCE_AUDIENCE}.`,
      `Featuring is free and opt-in. With your consent we would display the work with full attribution, alongside only the details you approve. You may withdraw at any time and we will remove the listing on request.`,
      `If you are happy to proceed, simply reply — we would be glad to send our short content and consent terms for your review first.`] },
  collaboration: { label: "Collaboration & support", subject: (b: string) => `Proposal for collaboration between ${ORG} and ${b}`,
    role: "partner", cta: "Reply to arrange a conversation about working together.",
    build: (b: string) => [
      `On behalf of ${ORG}, I write to propose a collaboration with ${b}. MyAfriArt exists to grow Africa's art marketplace, and your work sits squarely within that mission.`,
      `We would welcome the opportunity to work together — a formal partnership, a letter of support, or a shared programme advancing African creative enterprise. We are happy to align on terms, attribution and any governance you require.`,
      `I would value a short conversation to explore what a partnership could look like. Please let me know a convenient time.`] },
  advertising: { label: "Advertising invitation", subject: (b: string) => `Reach ${AUDIENCE_AUDIENCE} on MyAfriArt`,
    role: "brand", cta: "Reply to receive placement options and rates.",
    build: (b: string) => [
      `I'm reaching out from ${ORG} to invite ${b} to advertise on MyAfriArt. Our audience — ${AUDIENCE_AUDIENCE} — is precisely the kind of high-intent customer your brand wants to reach.`,
      `Placements are flexible: sponsored cards, category visibility, and performance options where you pay on results. Because we understand each person's interests, your brand is shown to people already looking for what you offer.`,
      `I'd be glad to share our placement options and rates, tailored to your objectives. Reply and I'll send details the same day.`] },
};
const uid = () => Math.random().toString(36).slice(2, 9);
type Rec = { id: string; brand: string; proprietor: string; email: string; address: string; notes: string; verified: boolean; ai: any; status: "draft" | "ready" };

export function LetterStudioAdmin() {
  const loadFn = useServerFn(getLetterhead);
  const saveFn = useServerFn(saveLetterhead);
  const sendFn = useServerFn(sendLetter);
  const enrichFn = useServerFn(enrichRecipient);

  const [head, setHead] = useState<any>({ address: "Plot 12, Creative Quarter,\nAbuja, FCT, Nigeria", email: "partnerships@zonicme.com", url: "myafriartx.netlify.app", signatory: "Olufemi Adeagbo", signatoryTitle: "Founder & Director", seal: true });
  const [type, setType] = useState("permission");
  const [recs, setRecs] = useState<Rec[]>([{ id: uid(), brand: "", proprietor: "", email: "", address: "", notes: "", verified: false, ai: null, status: "draft" }]);
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);
  const csvRef = useRef<HTMLInputElement>(null);

  useEffect(() => { (async () => { try { const h = await loadFn(); if (h) setHead((p: any) => ({ ...p, ...h })); } catch { /* defaults */ } })(); }, []);
  const rec = recs[active];
  const tpl = TEMPLATES[type];
  const setRec = (p: Partial<Rec>) => setRecs((xs) => xs.map((r, i) => (i === active ? { ...r, ...p } : r)));
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const paras: string[] = useMemo(() => tpl.build(rec?.brand || "your brand"), [tpl, rec?.brand]);
  const greeting = rec?.proprietor?.trim() || (rec?.brand ? `The ${tpl.role} at ${rec.brand}` : "Sir or Madam");
  const subject = tpl.subject(rec?.brand || "your brand");

  const saveHead = async (next: any) => { setHead(next); try { await saveFn({ data: { address: next.address, email: next.email, url: next.url, signatory: next.signatory, signatoryTitle: next.signatoryTitle, logoUrl: next.logoUrl ?? null, seal: !!next.seal } }); } catch (e: any) { toast.error(e?.message || "Save failed"); } };

  const findDetails = async () => {
    if (!rec.brand) return toast.warning("Add a brand name first.");
    setBusy(true);
    try {
      const j: any = await enrichFn({ data: { brand: rec.brand } });
      setRec({ address: rec.address || j.address || "", proprietor: rec.proprietor || j.proprietorName || "", email: rec.email || j.email || "", ai: j, verified: false });
      toast[j.email ? "success" : "warning"](j.email ? "AI proposed details — verify before sending." : "No public email found; add it manually.");
    } catch { toast.error("Couldn't enrich."); } finally { setBusy(false); }
  };

  const letterHtml = (r: Rec) => {
    const p = TEMPLATES[type].build(r.brand || "your brand");
    const g = r.proprietor?.trim() || (r.brand ? `The ${tpl.role} at ${r.brand}` : "Sir or Madam");
    return `<div style="font-family:Georgia,serif;color:#171633;max-width:640px;line-height:1.6">
      <div style="border-bottom:1px solid #DED8C8;padding-bottom:12px">
        <div style="font-size:19px;font-weight:600">${ORG}</div>
        <div style="font-size:11px;color:#3A3960;white-space:pre-line">${head.address}\n${head.email}</div>
      </div>
      <div style="font-size:11px;color:#8A8577;margin-top:16px">${today}</div>
      ${r.brand ? `<div style="margin-top:10px;font-weight:600">${r.brand}</div>` : ""}
      ${r.address ? `<div style="color:#3A3960">${r.address}</div>` : ""}
      <div style="margin-top:16px;font-weight:600">${subject}</div>
      <p>Dear ${g},</p>${p.map((x) => `<p>${x}</p>`).join("")}
      <p style="font-style:italic;color:#3A3960">${tpl.cta}</p>
      <p style="margin-top:24px">${head.signatory}<br>${head.signatoryTitle} · ${ORG}</p>
      <div style="text-align:center;color:#2F7D4F;font-size:11px;margin-top:24px;border-top:1px solid #DED8C8;padding-top:8px">${head.url}</div>
    </div>`;
  };

  const send = async () => {
    if (!rec.email) return toast.warning("Add a recipient email first.");
    if (rec.ai?.email && !rec.verified) return toast.warning("Verify the AI-proposed email before sending.");
    setBusy(true);
    try { await sendFn({ data: { audience: type as any, recipientBrand: rec.brand, to: rec.email, subject, html: letterHtml(rec) } }); setRec({ status: "ready" }); toast.success("Letter sent."); }
    catch (e: any) { toast.error(e?.message || "Send failed"); } finally { setBusy(false); }
  };

  const onCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      const lines = String(rd.result).split(/\r?\n/).filter(Boolean);
      const cols = lines.shift()!.split(",").map((c) => c.trim().toLowerCase());
      const idx = (name: string) => cols.indexOf(name);
      const rows: Rec[] = lines.map((ln) => { const c = ln.split(","); const g = (n: string) => (idx(n) >= 0 ? (c[idx(n)] || "").trim() : "");
        return { id: uid(), brand: g("brand") || g("company") || g("name"), proprietor: g("proprietor"), email: g("email"), address: g("address"), notes: g("notes"), verified: false, ai: null, status: "draft" as const }; }).filter((r) => r.brand);
      if (!rows.length) return toast.warning("No 'brand' column found.");
      setRecs(rows); setActive(0); toast.success(`Imported ${rows.length} recipients.`);
    };
    rd.readAsText(f); e.currentTarget.value = "";
  };

  const btn = (bg: string, fg = "#fff") => ({ background: bg, color: fg, border: "none", borderRadius: 8, padding: "8px 13px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", display: "inline-flex", gap: 7, alignItems: "center" } as const);
  const inp = { width: "100%", fontFamily: T.sans, fontSize: 12.5, padding: "8px 10px", borderRadius: 7, border: `1px solid ${T.line}`, boxSizing: "border-box" as const };
  const lbl = { fontSize: 10.5, fontWeight: 700, color: T.stone, marginBottom: 4, display: "block" };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(340px, 440px) 1fr", gap: 20, fontFamily: T.sans, color: T.ink }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ background: "#fff", border: `1px solid ${T.line}`, borderRadius: 12, padding: 14 }}>
          <div style={{ display: "grid", gap: 6 }}>
            {Object.entries(TEMPLATES).map(([k, t]: any) => (
              <button key={k} onClick={() => setType(k)} style={{ textAlign: "left", background: type === k ? "#F0F6F1" : "#fff", border: `1px solid ${type === k ? T.accent : T.line}`, borderRadius: 8, padding: "9px 11px", cursor: "pointer" }}>
                <div style={{ fontSize: 12.5, fontWeight: 700 }}>{t.label}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ background: "#fff", border: `1px solid ${T.line}`, borderRadius: 12, padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <b style={{ fontSize: 12.5 }}>Recipients ({recs.length})</b>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => csvRef.current?.click()} style={btn("#F1EEE6", T.ink2)}><Upload size={12} /> CSV</button>
              <button onClick={() => { setRecs((xs) => [...xs, { id: uid(), brand: "", proprietor: "", email: "", address: "", notes: "", verified: false, ai: null, status: "draft" }]); setActive(recs.length); }} style={btn(T.ink)}><Plus size={12} /> Add</button>
              <input ref={csvRef} type="file" accept=".csv" style={{ display: "none" }} onChange={onCsv} />
            </div>
          </div>
          {recs.length > 1 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, fontSize: 12 }}>
              <button onClick={() => setActive((a) => Math.max(0, a - 1))} style={btn("#F1EEE6", T.ink2)}><ChevronLeft size={14} /></button>
              <span style={{ color: T.stone }}>{active + 1} of {recs.length}</span>
              <button onClick={() => setActive((a) => Math.min(recs.length - 1, a + 1))} style={btn("#F1EEE6", T.ink2)}><ChevronRight size={14} /></button>
            </div>
          )}
          <div style={{ display: "grid", gap: 8 }}>
            <div><label style={lbl}>Brand / company</label><input style={inp} value={rec.brand} onChange={(e) => setRec({ brand: e.target.value })} /></div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1 }}><label style={lbl}>Proprietor</label><input style={inp} value={rec.proprietor} onChange={(e) => setRec({ proprietor: e.target.value })} /></div>
              <div style={{ flex: 1 }}><label style={lbl}>Email</label><input style={{ ...inp, borderColor: rec.ai?.email && !rec.verified ? T.warn : T.line }} value={rec.email} onChange={(e) => setRec({ email: e.target.value, verified: false })} /></div>
            </div>
            <div><label style={lbl}>Address</label><input style={inp} value={rec.address} onChange={(e) => setRec({ address: e.target.value })} /></div>
          </div>
          {rec.ai && (
            <div style={{ marginTop: 10, background: "#FBF6EC", border: `1px solid ${T.brass}`, borderRadius: 8, padding: 10 }}>
              <div style={{ display: "flex", gap: 7, fontSize: 11.5, fontWeight: 700, color: T.warn }}><AlertTriangle size={13} /> AI-proposed — verify (confidence: {rec.ai.confidence})</div>
              <label style={{ display: "flex", gap: 7, marginTop: 7, fontSize: 11.5 }}><input type="checkbox" checked={rec.verified} onChange={(e) => setRec({ verified: e.target.checked })} /> I have verified these details</label>
            </div>
          )}
          <div style={{ display: "flex", gap: 7, marginTop: 11, flexWrap: "wrap" }}>
            <button onClick={findDetails} disabled={busy} style={btn(T.brass)}>{busy ? <Loader2 size={14} className="ls-spin" /> : <Sparkles size={14} />} Find details</button>
            {recs.length > 1 && <button onClick={() => { setRecs((xs) => xs.filter((_, i) => i !== active)); setActive(0); }} style={btn("#F3E8E7", T.wax)}><Trash2 size={13} /></button>}
          </div>
        </div>

        <div style={{ background: "#fff", border: `1px solid ${T.line}`, borderRadius: 12, padding: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={send} disabled={busy} style={btn(rec.status === "ready" ? T.ok : T.accent)}><Send size={14} /> {rec.status === "ready" ? "Sent" : "Send"}</button>
          <button onClick={() => { const w = window.open("", "_blank"); if (w) { w.document.write(letterHtml(rec)); w.document.close(); w.print(); } }} style={btn(T.ink2)}><Printer size={14} /> PDF</button>
          <button onClick={() => saveHead(head)} style={btn("#F1EEE6", T.ink2)}><ShieldCheck size={14} /> Save letterhead</button>
        </div>
      </div>

      <div>
        <div style={{ fontSize: 11.5, color: T.stone, marginBottom: 8 }}>{subject}</div>
        <div style={{ background: T.paper, border: `1px solid ${T.paperEdge}`, borderRadius: 4, padding: "46px 52px", boxShadow: "0 20px 50px rgba(23,22,51,.12)", fontFamily: T.serif, lineHeight: 1.62, position: "relative", minHeight: 760 }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 5, background: T.accent }} />
          <div style={{ borderBottom: `1px solid ${T.line}`, paddingBottom: 14 }}>
            <div style={{ height: 46, width: 46, borderRadius: 6, background: T.accent, color: "#fff", display: "grid", placeItems: "center", fontWeight: 700, fontFamily: T.sans, marginBottom: 8 }}>M</div>
            <div style={{ fontSize: 19, fontWeight: 600 }}>{ORG}</div>
            <div style={{ fontFamily: T.sans, fontSize: 10.5, color: T.ink2, whiteSpace: "pre-line" }}>{head.address}</div>
            <div style={{ fontFamily: T.sans, fontSize: 10.5, color: T.ink2 }}>{head.email}</div>
          </div>
          <div style={{ fontFamily: T.sans, fontSize: 11, color: T.stone, marginTop: 20 }}>{today}</div>
          {rec.brand && <div style={{ marginTop: 12, fontWeight: 600, fontSize: 13.5 }}>{rec.brand}</div>}
          {rec.address && <div style={{ fontSize: 13.5, color: T.ink2 }}>{rec.address}</div>}
          <div style={{ marginTop: 20, fontSize: 14, fontWeight: 600 }}>{subject}</div>
          <p style={{ marginTop: 14 }}>Dear {greeting},</p>
          {paras.map((p, i) => <p key={i} style={{ margin: "0 0 12px" }}>{p}</p>)}
          <p style={{ fontStyle: "italic", color: T.ink2 }}>{tpl.cta}</p>
          <div style={{ marginTop: 26 }}><div style={{ fontFamily: T.serif, fontSize: 20, color: T.accent, transform: "rotate(-3deg)" }}>{head.signatory}</div><div style={{ fontWeight: 600 }}>{head.signatory}</div><div style={{ fontFamily: T.sans, fontSize: 11.5, color: T.stone }}>{head.signatoryTitle} · {ORG}</div></div>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 22, textAlign: "center" }}><div style={{ height: 1, width: "58%", background: T.line, margin: "0 auto 7px" }} /><div style={{ fontFamily: T.sans, fontSize: 10.5, fontWeight: 600, color: T.accent }}>{head.url}</div></div>
        </div>
      </div>
      <style>{`.ls-spin{animation:lsspin 1s linear infinite}@keyframes lsspin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
