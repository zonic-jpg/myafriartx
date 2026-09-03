import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Printer,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { enrichRecipient } from "@/lib/ai.functions";
import { callAdminBridge, type SentLetter } from "@/lib/admin-bridge";
import { publicMessage } from "@/lib/public-message";
import {
  LETTER_TEMPLATES,
  ORG,
  letterGreeting,
  letterTemplate,
  type LetterAudience,
} from "@/lib/letter-templates";

const T = {
  ink: "#171633",
  ink2: "#3A3960",
  paper: "#FAF8F3",
  paperEdge: "#EFEADD",
  brass: "#A67C34",
  wax: "#6E2B2B",
  stone: "#8A8577",
  line: "#DED8C8",
  ok: "#2F6B4F",
  warn: "#9A6414",
  bad: "#8E2B24",
  accent: "#2F7D4F",
  serif: '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif',
  sans: 'ui-sans-serif, system-ui, "Segoe UI", Roboto, sans-serif',
};

const DEFAULT_LOGO = "/media/myafriart-logo.png";
const DRAFT_KEY = "myafriart_letter_studio_drafts_v1";

type Letterhead = {
  address: string;
  email: string;
  url: string;
  signatory: string;
  signatoryTitle: string;
  logoUrl: string | null;
  seal: boolean;
};

const DEFAULT_HEAD: Letterhead = {
  address: "Plot 12, Creative Quarter,\nAbuja, FCT, Nigeria",
  email: "partnerships@zonicme.com",
  url: "myafriartx.netlify.app",
  signatory: "Olufemi Adeagbo",
  signatoryTitle: "Founder & Director",
  logoUrl: DEFAULT_LOGO,
  seal: true,
};

type SendState = "draft" | "sending" | "sent" | "failed";

type Rec = {
  id: string;
  brand: string;
  proprietor: string;
  email: string;
  address: string;
  notes: string;
  verified: boolean;
  ai: any;
  state: SendState;
  sentAt: string | null;
  error: string | null;
};

const uid = () => Math.random().toString(36).slice(2, 9);

const blankRec = (): Rec => ({
  id: uid(),
  brand: "",
  proprietor: "",
  email: "",
  address: "",
  notes: "",
  verified: false,
  ai: null,
  state: "draft",
  sentAt: null,
  error: null,
});

function loadDrafts(): Rec[] {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return [blankRec()];
    const parsed = JSON.parse(raw) as Rec[];
    return Array.isArray(parsed) && parsed.length ? parsed.map((r) => ({ ...blankRec(), ...r })) : [blankRec()];
  } catch {
    return [blankRec()];
  }
}

function absoluteUrl(url: string | null | undefined): string {
  const value = String(url || DEFAULT_LOGO);
  if (/^https?:\/\//i.test(value) || value.startsWith("data:")) return value;
  if (typeof window === "undefined") return value;
  try {
    return new URL(value, window.location.origin).href;
  } catch {
    return value;
  }
}

function stamp(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function LetterStudioAdmin() {
  const enrichFn = useServerFn(enrichRecipient);

  const [head, setHead] = useState<Letterhead>(DEFAULT_HEAD);
  const [type, setType] = useState<LetterAudience>("permission");
  const [recs, setRecs] = useState<Rec[]>(() =>
    typeof window === "undefined" ? [blankRec()] : loadDrafts(),
  );
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<SentLetter[]>([]);
  const [historyNotice, setHistoryNotice] = useState<string | null>(null);
  const csvRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  // Letterhead is shared, not per-browser. Anonymous admin-gate sessions can read
  // it directly now that app_settings exposes the 'letterhead' key to anon.
  useEffect(() => {
    let active = true;
    void (async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "letterhead")
        .maybeSingle();
      const stored = data?.value as Partial<Letterhead> | null;
      if (active && stored && typeof stored === "object") {
        setHead((prev) => ({ ...prev, ...stored, logoUrl: stored.logoUrl || DEFAULT_LOGO }));
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(recs));
    } catch {
      /* private mode */
    }
  }, [recs]);

  const loadHistory = useCallback(async () => {
    try {
      const res = await callAdminBridge<{ letters: SentLetter[] }>("letters.list");
      setHistory(res.letters ?? []);
      setHistoryNotice(null);
    } catch (e) {
      setHistory([]);
      setHistoryNotice(publicMessage(e, "Send history is unavailable right now."));
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const rec = recs[active] ?? recs[0] ?? blankRec();
  const tpl = letterTemplate(type);
  const setRec = (patch: Partial<Rec>) =>
    setRecs((xs) => xs.map((r, i) => (i === active ? { ...r, ...patch } : r)));

  const today = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const paras = useMemo(() => tpl.build(rec.brand || "your brand"), [tpl, rec.brand]);
  const greeting = letterGreeting(tpl, rec.proprietor, rec.brand);
  const subject = tpl.subject(rec.brand || "your brand");
  const logoSrc = head.logoUrl || DEFAULT_LOGO;

  const saveHead = async (next: Letterhead) => {
    setHead(next);
    try {
      await callAdminBridge("letterhead.save", { letterhead: next });
      toast.success("Letterhead saved for the whole team.");
    } catch (e) {
      toast.error(publicMessage(e, "Could not save the letterhead."));
    }
  };

  const onLogoFile = (file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("Choose an image file for the logo.");
    if (file.size > 400_000)
      return toast.error("Logo is too large — use an image under 400 KB so it renders in email.");
    const reader = new FileReader();
    reader.onload = () => void saveHead({ ...head, logoUrl: String(reader.result) });
    reader.readAsDataURL(file);
  };

  const findDetails = async () => {
    if (!rec.brand) return toast.warning("Add a brand name first.");
    setBusy(true);
    try {
      const j: any = await enrichFn({ data: { brand: rec.brand } });
      setRec({
        address: rec.address || j.address || "",
        proprietor: rec.proprietor || j.proprietorName || "",
        email: rec.email || j.email || "",
        ai: j,
        verified: false,
      });
      toast[j.email ? "success" : "warning"](
        j.email ? "AI proposed details — verify before sending." : "No public email found; add it manually.",
      );
    } catch (e) {
      toast.error(publicMessage(e, "Could not look up that brand."));
    } finally {
      setBusy(false);
    }
  };

  /** The emailed letter — same content as the preview, including the real logo. */
  const letterHtml = (r: Rec) => {
    const body = tpl.build(r.brand || "your brand");
    const g = letterGreeting(tpl, r.proprietor, r.brand);
    const subj = tpl.subject(r.brand || "your brand");
    const logo = absoluteUrl(logoSrc);
    return `<div style="font-family:Georgia,serif;color:#171633;max-width:640px;line-height:1.6">
      <div style="border-bottom:1px solid #DED8C8;padding-bottom:12px">
        <img src="${logo}" alt="${ORG}" width="140" style="display:block;width:140px;height:auto;max-height:56px;object-fit:contain;margin-bottom:10px" />
        <div style="font-size:19px;font-weight:600">${ORG}</div>
        <div style="font-size:11px;color:#3A3960;white-space:pre-line">${head.address}\n${head.email}</div>
      </div>
      <div style="font-size:11px;color:#8A8577;margin-top:16px">${today}</div>
      ${r.brand ? `<div style="margin-top:10px;font-weight:600">${r.brand}</div>` : ""}
      ${r.address ? `<div style="color:#3A3960">${r.address}</div>` : ""}
      <div style="margin-top:16px;font-weight:600">${subj}</div>
      <p>Dear ${g},</p>${body.map((x) => `<p>${x}</p>`).join("")}
      <p style="font-style:italic;color:#3A3960">${tpl.cta}</p>
      <p style="margin-top:24px">${head.signatory}<br>${head.signatoryTitle} · ${ORG}</p>
      <div style="text-align:center;color:#2F7D4F;font-size:11px;margin-top:24px;border-top:1px solid #DED8C8;padding-top:8px">${head.url}</div>
    </div>`;
  };

  const send = async () => {
    if (!rec.email) return toast.warning("Add a recipient email first.");
    if (rec.ai?.email && !rec.verified) return toast.warning("Verify the AI-proposed email before sending.");
    setRec({ state: "sending", error: null });
    try {
      const res = await callAdminBridge<{ status: string; sentAt?: string }>("letters.send", {
        audience: type,
        recipientBrand: rec.brand,
        to: rec.email,
        subject,
        html: letterHtml(rec),
      });
      setRec({ state: "sent", sentAt: res.sentAt ?? new Date().toISOString(), error: null });
      toast.success(`Letter sent to ${rec.email}.`);
      void loadHistory();
    } catch (e) {
      const reason = publicMessage(e, "The letter could not be sent.");
      setRec({ state: "failed", error: reason, sentAt: null });
      toast.error(reason);
      void loadHistory();
    }
  };

  const onCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const lines = String(reader.result).split(/\r?\n/).filter(Boolean);
      const cols = lines.shift()!.split(",").map((c) => c.trim().toLowerCase());
      const idx = (name: string) => cols.indexOf(name);
      const rows = lines
        .map((line) => {
          const cells = line.split(",");
          const get = (n: string) => (idx(n) >= 0 ? (cells[idx(n)] || "").trim() : "");
          return {
            ...blankRec(),
            brand: get("brand") || get("company") || get("name"),
            proprietor: get("proprietor"),
            email: get("email"),
            address: get("address"),
            notes: get("notes"),
          };
        })
        .filter((r) => r.brand);
      if (!rows.length) return toast.warning("No 'brand' column found.");
      setRecs(rows);
      setActive(0);
      toast.success(`Imported ${rows.length} recipients.`);
    };
    reader.readAsText(file);
    e.currentTarget.value = "";
  };

  const btn = (bg: string, fg = "#fff") =>
    ({
      background: bg,
      color: fg,
      border: "none",
      borderRadius: 8,
      padding: "8px 13px",
      fontSize: 12.5,
      fontWeight: 600,
      cursor: "pointer",
      display: "inline-flex",
      gap: 7,
      alignItems: "center",
    }) as const;
  const inp = {
    width: "100%",
    fontFamily: T.sans,
    fontSize: 12.5,
    padding: "8px 10px",
    borderRadius: 7,
    border: `1px solid ${T.line}`,
    boxSizing: "border-box" as const,
  };
  const lbl = { fontSize: 10.5, fontWeight: 700, color: T.stone, marginBottom: 4, display: "block" };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(340px, 440px) 1fr",
        gap: 20,
        fontFamily: T.sans,
        color: T.ink,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ background: "#fff", border: `1px solid ${T.line}`, borderRadius: 12, padding: 14 }}>
          <div style={{ ...lbl, marginBottom: 8 }}>Letter type</div>
          <div style={{ display: "grid", gap: 6 }}>
            {Object.values(LETTER_TEMPLATES).map((t) => (
              <button
                key={t.id}
                onClick={() => setType(t.id)}
                style={{
                  textAlign: "left",
                  background: type === t.id ? "#F0F6F1" : "#fff",
                  border: `1px solid ${type === t.id ? T.accent : T.line}`,
                  borderRadius: 8,
                  padding: "9px 11px",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: 12.5, fontWeight: 700 }}>{t.label}</div>
                <div style={{ fontSize: 11, color: T.stone, marginTop: 2 }}>{t.blurb}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ background: "#fff", border: `1px solid ${T.line}`, borderRadius: 12, padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <b style={{ fontSize: 12.5 }}>Recipients ({recs.length})</b>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => csvRef.current?.click()} style={btn("#F1EEE6", T.ink2)}>
                <Upload size={12} /> CSV
              </button>
              <button
                onClick={() => {
                  setRecs((xs) => [...xs, blankRec()]);
                  setActive(recs.length);
                }}
                style={btn(T.ink)}
              >
                <Plus size={12} /> Add
              </button>
              <input ref={csvRef} type="file" accept=".csv" style={{ display: "none" }} onChange={onCsv} />
            </div>
          </div>
          {recs.length > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
                fontSize: 12,
              }}
            >
              <button onClick={() => setActive((a) => Math.max(0, a - 1))} style={btn("#F1EEE6", T.ink2)}>
                <ChevronLeft size={14} />
              </button>
              <span style={{ color: T.stone }}>
                {active + 1} of {recs.length}
              </span>
              <button
                onClick={() => setActive((a) => Math.min(recs.length - 1, a + 1))}
                style={btn("#F1EEE6", T.ink2)}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
          <div style={{ display: "grid", gap: 8 }}>
            <div>
              <label style={lbl}>Brand / company</label>
              <input style={inp} value={rec.brand} onChange={(e) => setRec({ brand: e.target.value })} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={lbl}>Proprietor</label>
                <input
                  style={inp}
                  value={rec.proprietor}
                  onChange={(e) => setRec({ proprietor: e.target.value })}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={lbl}>Email</label>
                <input
                  style={{ ...inp, borderColor: rec.ai?.email && !rec.verified ? T.warn : T.line }}
                  value={rec.email}
                  onChange={(e) => setRec({ email: e.target.value, verified: false, state: "draft" })}
                />
              </div>
            </div>
            <div>
              <label style={lbl}>Address</label>
              <input style={inp} value={rec.address} onChange={(e) => setRec({ address: e.target.value })} />
            </div>
          </div>
          {rec.ai && (
            <div
              style={{
                marginTop: 10,
                background: "#FBF6EC",
                border: `1px solid ${T.brass}`,
                borderRadius: 8,
                padding: 10,
              }}
            >
              <div style={{ display: "flex", gap: 7, fontSize: 11.5, fontWeight: 700, color: T.warn }}>
                <AlertTriangle size={13} /> AI-proposed — verify (confidence: {rec.ai.confidence})
              </div>
              <label style={{ display: "flex", gap: 7, marginTop: 7, fontSize: 11.5 }}>
                <input
                  type="checkbox"
                  checked={rec.verified}
                  onChange={(e) => setRec({ verified: e.target.checked })}
                />{" "}
                I have verified these details
              </label>
            </div>
          )}
          <div style={{ display: "flex", gap: 7, marginTop: 11, flexWrap: "wrap" }}>
            <button onClick={findDetails} disabled={busy} style={btn(T.brass)}>
              {busy ? <Loader2 size={14} className="ls-spin" /> : <Sparkles size={14} />} Find details
            </button>
            {recs.length > 1 && (
              <button
                onClick={() => {
                  setRecs((xs) => xs.filter((_, i) => i !== active));
                  setActive(0);
                }}
                style={btn("#F3E8E7", T.wax)}
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>

        <div style={{ background: "#fff", border: `1px solid ${T.line}`, borderRadius: 12, padding: 14 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={send} disabled={rec.state === "sending"} style={btn(T.accent)}>
              {rec.state === "sending" ? <Loader2 size={14} className="ls-spin" /> : <Send size={14} />}
              {rec.state === "sending" ? "Sending…" : rec.state === "sent" ? "Send again" : "Send"}
            </button>
            <button
              onClick={() => {
                const w = window.open("", "_blank");
                if (w) {
                  w.document.write(letterHtml(rec));
                  w.document.close();
                  w.print();
                }
              }}
              style={btn(T.ink2)}
            >
              <Printer size={14} /> PDF
            </button>
            <button onClick={() => logoRef.current?.click()} style={btn("#F1EEE6", T.ink2)}>
              <Upload size={14} /> Logo
            </button>
            <input
              ref={logoRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onLogoFile(f);
                e.currentTarget.value = "";
              }}
            />
            <button onClick={() => void saveHead(head)} style={btn("#F1EEE6", T.ink2)}>
              <ShieldCheck size={14} /> Save letterhead
            </button>
          </div>

          {/* Honest send status: what happened, to whom, when — or exactly why not. */}
          <div style={{ marginTop: 12, fontSize: 12 }}>
            {rec.state === "draft" && (
              <span style={{ color: T.stone }}>Not sent yet.</span>
            )}
            {rec.state === "sending" && (
              <span style={{ color: T.ink2, display: "inline-flex", gap: 6, alignItems: "center" }}>
                <Loader2 size={13} className="ls-spin" /> Sending to {rec.email}…
              </span>
            )}
            {rec.state === "sent" && (
              <span style={{ color: T.ok, display: "inline-flex", gap: 6, alignItems: "center" }}>
                <CheckCircle2 size={13} /> Sent to {rec.email} · {stamp(rec.sentAt)}
              </span>
            )}
            {rec.state === "failed" && (
              <span style={{ color: T.bad, display: "inline-flex", gap: 6, alignItems: "flex-start" }}>
                <XCircle size={13} style={{ marginTop: 2, flexShrink: 0 }} />
                <span>Not sent to {rec.email} — {rec.error}</span>
              </span>
            )}
          </div>
        </div>

        <div style={{ background: "#fff", border: `1px solid ${T.line}`, borderRadius: 12, padding: 14 }}>
          <b style={{ fontSize: 12.5 }}>Send history</b>
          {historyNotice ? (
            <div style={{ fontSize: 11.5, color: T.warn, marginTop: 8 }}>{historyNotice}</div>
          ) : history.length === 0 ? (
            <div style={{ fontSize: 11.5, color: T.stone, marginTop: 8 }}>No letters sent yet.</div>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0", display: "grid", gap: 6 }}>
              {history.slice(0, 12).map((l) => (
                <li key={l.id} style={{ fontSize: 11.5, display: "flex", gap: 8, alignItems: "flex-start" }}>
                  {l.status === "sent" ? (
                    <CheckCircle2 size={13} style={{ color: T.ok, marginTop: 1, flexShrink: 0 }} />
                  ) : (
                    <XCircle size={13} style={{ color: T.bad, marginTop: 1, flexShrink: 0 }} />
                  )}
                  <span>
                    <b>{l.recipient_brand || l.recipient_email}</b> · {letterTemplate(l.audience).label} ·{" "}
                    {stamp(l.created_at)}
                    {l.status === "failed" && l.error_message ? (
                      <span style={{ color: T.bad }}> — {l.error_message}</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div>
        <div style={{ fontSize: 11.5, color: T.stone, marginBottom: 8 }}>{subject}</div>
        <div
          style={{
            background: T.paper,
            border: `1px solid ${T.paperEdge}`,
            borderRadius: 4,
            padding: "46px 52px",
            boxShadow: "0 20px 50px rgba(23,22,51,.12)",
            fontFamily: T.serif,
            lineHeight: 1.62,
            position: "relative",
            minHeight: 760,
          }}
        >
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 5, background: T.accent }} />
          <div style={{ borderBottom: `1px solid ${T.line}`, paddingBottom: 14 }}>
            <img
              src={logoSrc}
              alt={ORG}
              style={{
                display: "block",
                width: 150,
                height: 56,
                objectFit: "contain",
                objectPosition: "left center",
                marginBottom: 10,
              }}
            />
            <div style={{ fontSize: 19, fontWeight: 600 }}>{ORG}</div>
            <div style={{ fontFamily: T.sans, fontSize: 10.5, color: T.ink2, whiteSpace: "pre-line" }}>
              {head.address}
            </div>
            <div style={{ fontFamily: T.sans, fontSize: 10.5, color: T.ink2 }}>{head.email}</div>
          </div>
          <div style={{ fontFamily: T.sans, fontSize: 11, color: T.stone, marginTop: 20 }}>{today}</div>
          {rec.brand && <div style={{ marginTop: 12, fontWeight: 600, fontSize: 13.5 }}>{rec.brand}</div>}
          {rec.address && <div style={{ fontSize: 13.5, color: T.ink2 }}>{rec.address}</div>}
          <div style={{ marginTop: 20, fontSize: 14, fontWeight: 600 }}>{subject}</div>
          <p style={{ marginTop: 14 }}>Dear {greeting},</p>
          {paras.map((p, i) => (
            <p key={i} style={{ margin: "0 0 12px" }}>
              {p}
            </p>
          ))}
          <p style={{ fontStyle: "italic", color: T.ink2 }}>{tpl.cta}</p>
          <div style={{ marginTop: 26 }}>
            <div style={{ fontFamily: T.serif, fontSize: 20, color: T.accent, transform: "rotate(-3deg)" }}>
              {head.signatory}
            </div>
            <div style={{ fontWeight: 600 }}>{head.signatory}</div>
            <div style={{ fontFamily: T.sans, fontSize: 11.5, color: T.stone }}>
              {head.signatoryTitle} · {ORG}
            </div>
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 22, textAlign: "center" }}>
            <div style={{ height: 1, width: "58%", background: T.line, margin: "0 auto 7px" }} />
            <div style={{ fontFamily: T.sans, fontSize: 10.5, fontWeight: 600, color: T.accent }}>
              {head.url}
            </div>
          </div>
        </div>
      </div>
      <style>{`.ls-spin{animation:lsspin 1s linear infinite}@keyframes lsspin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
