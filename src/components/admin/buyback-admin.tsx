import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  adminListBuyback,
  adminBuybackProofUrl,
  adminBuybackAct,
  getBuybackConfig,
  adminSetBuybackSettings,
  adminListCertArtists,
  adminSetArtistCertificate,
  adminCertificateReport,
  adminWithdrawCertificate,
} from "@/lib/buyback.functions";
import { STATUS_LABEL } from "@/lib/buyback-terms";

type Row = Record<string, any>;
const ngn = (n: unknown) => `₦${Number(n ?? 0).toLocaleString()}`;
const inputCls = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
const btn = "rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50";
const btn2 = "rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50";

/* ---------------- Buyback review + settings ---------------- */
export function BuybackAdmin() {
  const listFn = useServerFn(adminListBuyback);
  const proofFn = useServerFn(adminBuybackProofUrl);
  const actFn = useServerFn(adminBuybackAct);
  const qc = useQueryClient();
  const [filter, setFilter] = useState("pending_review");
  const [busy, setBusy] = useState("");
  const { data: rows = [], isLoading } = useQuery({ queryKey: ["admin", "buyback"], queryFn: () => listFn() });

  const shown = useMemo(
    () => (rows as Row[]).filter((r) => filter === "all" || r.status === filter),
    [rows, filter],
  );
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of rows as Row[]) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rows]);

  const act = async (id: string, action: string, needNote = false) => {
    let note: string | undefined;
    if (needNote) {
      note = window.prompt("Reason (shown to the seller):") ?? "";
      if (note.trim().length < 3) return;
    }
    setBusy(id + action);
    try {
      await actFn({ data: { id, action: action as any, note } });
      toast.success("Done");
      qc.invalidateQueries({ queryKey: ["admin", "buyback"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy("");
    }
  };
  const openProof = async (id: string) => {
    try {
      const { url } = await proofFn({ data: { id } });
      window.open(url, "_blank", "noopener");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open the document");
    }
  };

  const filters = ["pending_review", "awaiting_fee", "open", "reserved", "payment_sent", "paid", "handed_over", "sold", "exercise_sent", "option_exercised", "option_lapsed", "rejected", "cancelled", "all"];

  return (
    <div className="space-y-6">
      <BuybackSettings />
      <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
        The buyer and seller pay each other directly. MyAfriArt never holds sale money and only collects the flat fees set above.
        The wording of the terms is a draft and needs a lawyer's review before you open this to the public.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {filters.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1 text-xs ${filter === f ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            {f === "all" ? "All" : STATUS_LABEL[f] ?? f}
            {f !== "all" && counts[f] ? ` (${counts[f]})` : ""}
          </button>
        ))}
      </div>
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!isLoading && shown.length === 0 && <p className="text-sm text-muted-foreground">Nothing here.</p>}
      <div className="space-y-3">
        {shown.map((r) => (
          <div key={r.id} className="rounded-lg border p-4 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">
                  {r.title} <span className="text-xs text-muted-foreground">· {r.short_code}</span>
                </p>
                <p className="text-muted-foreground">
                  {r.artist_name}
                  {r.medium ? ` · ${r.medium}` : ""} · seller {r.seller_name} ({r.seller_type})
                  {r.buyer_name ? ` · buyer ${r.buyer_name}` : ""}
                </p>
                <p className="mt-1">
                  Price {ngn(r.price_ngn)}
                  {r.buyback_price_ngn ? ` · buyback ceiling ${ngn(r.buyback_price_ngn)} within ${r.buyback_days} days` : " · no buyback option"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Fees: listing {ngn(r.fee_ngn)}
                  {r.fee_paid_at ? " (paid)" : ""} · buyer {ngn(r.buyer_fee_ngn)}
                  {r.buyer_fee_paid_at ? " (paid)" : ""} · buyback {ngn(r.exercise_fee_ngn)}
                  {r.exercise_fee_paid_at ? " (paid)" : ""}
                </p>
              </div>
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">{STATUS_LABEL[r.status] ?? r.status}</span>
            </div>
            {r.provenance && <p className="mt-2 text-xs text-muted-foreground">Provenance: {r.provenance}</p>}
            {r.rejection_note && <p className="mt-1 text-xs text-destructive">Note: {r.rejection_note}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {r.has_proof && (
                <button type="button" className={btn2} onClick={() => openProof(r.id)}>
                  View proof of ownership
                </button>
              )}
              {r.status === "pending_review" && (
                <>
                  <button type="button" className={btn} disabled={!!busy} onClick={() => act(r.id, "approve")}>Approve</button>
                  <button type="button" className={btn2} disabled={!!busy} onClick={() => act(r.id, "reject", true)}>Reject</button>
                </>
              )}
              {r.status === "awaiting_fee" && (
                <button type="button" className={btn2} disabled={!!busy} onClick={() => act(r.id, "waive_fee")}>Waive listing fee</button>
              )}
              {["open", "reserved", "pending_review", "awaiting_fee"].includes(r.status) && (
                <button type="button" className={btn2} disabled={!!busy} onClick={() => act(r.id, "admin_cancel", true)}>Cancel listing</button>
              )}
              {["cancelled", "rejected"].includes(r.status) && (
                <button type="button" className={btn2} disabled={!!busy} onClick={() => act(r.id, "admin_reopen")}>Reopen</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BuybackSettings() {
  const cfgFn = useServerFn(getBuybackConfig);
  const saveFn = useServerFn(adminSetBuybackSettings);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin", "buyback-cfg"], queryFn: () => cfgFn() });
  const [f, setF] = useState({ feeNgn: "0", buyerFeeNgn: "0", exerciseFeeNgn: "0", maxUpliftPercent: "20", minDays: "14", maxDays: "180" });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (data) {
      setF({
        feeNgn: String(data.feeNgn), buyerFeeNgn: String(data.buyerFeeNgn), exerciseFeeNgn: String(data.exerciseFeeNgn),
        maxUpliftPercent: String(data.maxUpliftPercent), minDays: String(data.minDays), maxDays: String(data.maxDays),
      });
    }
  }, [data]);
  const field = (k: keyof typeof f, label: string, hint: string) => (
    <label className="block text-xs">
      <span className="font-medium">{label}</span>
      <input className={`${inputCls} mt-1`} inputMode="numeric" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value.replace(/[^\d.]/g, "") })} />
      <span className="text-muted-foreground">{hint}</span>
    </label>
  );
  const save = async () => {
    setSaving(true);
    try {
      await saveFn({
        data: {
          feeNgn: Math.round(Number(f.feeNgn || 0)), buyerFeeNgn: Math.round(Number(f.buyerFeeNgn || 0)),
          exerciseFeeNgn: Math.round(Number(f.exerciseFeeNgn || 0)), maxUpliftPercent: Number(f.maxUpliftPercent || 0),
          minDays: Math.round(Number(f.minDays || 14)), maxDays: Math.round(Number(f.maxDays || 180)),
        },
      });
      toast.success("Settings saved");
      qc.invalidateQueries({ queryKey: ["admin", "buyback-cfg"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="rounded-lg border p-4">
      <h3 className="font-medium">Flat fees and limits</h3>
      <p className="text-xs text-muted-foreground">Fees are collected through Flutterwave (Paystack as backup). Leave a fee at 0 to switch it off.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {field("feeNgn", "Seller listing fee (₦)", "Paid before the work is reviewed")}
        {field("buyerFeeNgn", "Buyer fee (₦)", "Paid to unlock the seller's payment details")}
        {field("exerciseFeeNgn", "Buyback-use fee (₦)", "Paid by the seller if they use the buyback")}
        {field("maxUpliftPercent", "Highest buyback uplift (%)", "Ceiling above the sale price")}
        {field("minDays", "Shortest buyback window (days)", "At least 14")}
        {field("maxDays", "Longest buyback window (days)", "At most 365")}
      </div>
      <button type="button" className={`${btn} mt-3`} disabled={saving} onClick={save}>{saving ? "Saving…" : "Save settings"}</button>
    </div>
  );
}

/* ---------------- Certificates ---------------- */
const DESIGNS = [
  { id: "classic", name: "Classic", note: "Gold double border, centred serif" },
  { id: "modern", name: "Modern", note: "Clean sans-serif, accent bars" },
  { id: "heritage", name: "Heritage", note: "Terracotta border, diamond band" },
] as const;

function DesignThumb({ id }: { id: string }) {
  const c = id === "classic" ? "#a8842a" : id === "modern" ? "#1d5a78" : "#b5461f";
  return (
    <svg viewBox="0 0 70 96" className="h-24 w-[70px] shrink-0 rounded-sm bg-white shadow-sm ring-1 ring-black/10" aria-hidden="true">
      {id === "classic" && (
        <>
          <rect x="3" y="3" width="64" height="90" fill="none" stroke={c} strokeWidth="1.2" />
          <rect x="6" y="6" width="58" height="84" fill="none" stroke={c} strokeWidth="0.5" />
          <rect x="18" y="16" width="34" height="3" fill={c} />
          <rect x="14" y="26" width="42" height="2" fill="#333" />
          <rect x="20" y="34" width="30" height="2" fill="#888" />
        </>
      )}
      {id === "modern" && (
        <>
          <rect x="0" y="0" width="70" height="5" fill={c} />
          <rect x="0" y="91" width="70" height="5" fill={c} />
          <rect x="8" y="14" width="2" height="30" fill={c} />
          <rect x="14" y="16" width="30" height="3" fill={c} />
          <rect x="14" y="26" width="38" height="2" fill="#333" />
          <rect x="14" y="34" width="28" height="2" fill="#888" />
        </>
      )}
      {id === "heritage" && (
        <>
          <rect x="3" y="3" width="64" height="90" fill="none" stroke={c} strokeWidth="1" />
          {Array.from({ length: 8 }).map((_, i) => (
            <rect key={i} x={9 + i * 7.4} y="7" width="3" height="3" fill={c} transform={`rotate(45 ${10.5 + i * 7.4} 8.5)`} />
          ))}
          <rect x="18" y="20" width="34" height="3" fill={c} />
          <rect x="14" y="30" width="42" height="2" fill="#333" />
          <rect x="20" y="38" width="30" height="2" fill="#888" />
        </>
      )}
      <rect x="25" y="62" width="20" height="20" fill="none" stroke="#999" strokeWidth="0.8" />
    </svg>
  );
}

export function CertificatesAdmin() {
  const [view, setView] = useState<"artists" | "report">("artists");
  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b">
        {(["artists", "report"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm ${view === v ? "border-primary font-medium" : "border-transparent text-muted-foreground"}`}
          >
            {v === "artists" ? "Artist settings" : "Issued certificates"}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        When an artist's work sells, a certificate is issued automatically with their brand name, logo, the title and the work's details. The sale price is never on it.
        Numbering runs on continuously for each artist, whichever design is chosen.
      </p>
      {view === "artists" ? <CertArtists /> : <CertReport />}
    </div>
  );
}

function CertArtists() {
  const listFn = useServerFn(adminListCertArtists);
  const { data: rows = [], isLoading } = useQuery({ queryKey: ["admin", "cert-artists"], queryFn: () => listFn() });
  const [q, setQ] = useState("");
  const shown = (rows as Row[]).filter((a) => !q || String(a.name).toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-3">
      <input className={`${inputCls} max-w-sm`} placeholder="Search artists" value={q} onChange={(e) => setQ(e.target.value)} />
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {shown.slice(0, 100).map((a) => (
        <CertArtistCard key={a.id} a={a} />
      ))}
      {shown.length > 100 && <p className="text-xs text-muted-foreground">Showing the first 100. Search to narrow.</p>}
    </div>
  );
}

function CertArtistCard({ a }: { a: Row }) {
  const saveFn = useServerFn(adminSetArtistCertificate);
  const qc = useQueryClient();
  const [enabled, setEnabled] = useState(!!a.cert_service_enabled);
  const [brand, setBrand] = useState<string>(a.cert_brand_name ?? "");
  const [logo, setLogo] = useState<string>(a.cert_logo_url ?? "");
  const [design, setDesign] = useState<string>(a.cert_design ?? "classic");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      await saveFn({ data: { artistId: a.id, enabled, brandName: brand || null, logoUrl: logo || "", design: design as any } });
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["admin", "cert-artists"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="rounded-lg border p-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <button type="button" className="text-left" onClick={() => setOpen(!open)}>
          <span className="font-medium">{a.name}</span>
          <span className="ml-2 text-xs text-muted-foreground">
            {a.cert_service_enabled ? `Certificates on · ${DESIGNS.find((d) => d.id === a.cert_design)?.name ?? "Classic"} · next no. ${a.cert_next_no}` : "Certificates off"}
          </span>
        </button>
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={enabled} onChange={(e) => { setEnabled(e.target.checked); setOpen(true); }} />
          Certificate service
        </label>
      </div>
      {open && (
        <div className="mt-3 space-y-3 border-t pt-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs">
              <span className="font-medium">Brand name on the certificate</span>
              <input className={`${inputCls} mt-1`} value={brand} maxLength={120} onChange={(e) => setBrand(e.target.value)} placeholder={a.name} />
            </label>
            <label className="block text-xs">
              <span className="font-medium">Logo link (PNG or JPG)</span>
              <input className={`${inputCls} mt-1`} value={logo} maxLength={600} onChange={(e) => setLogo(e.target.value)} placeholder="https://…" />
            </label>
          </div>
          <fieldset>
            <legend className="text-xs font-medium">Design (choose one)</legend>
            <div className="mt-2 grid gap-3 sm:grid-cols-3">
              {DESIGNS.map((d) => {
                const on = design === d.id;
                return (
                  <label
                    key={d.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${on ? "border-primary ring-2 ring-primary/30" : "hover:bg-muted/50"}`}
                  >
                    <DesignThumb id={d.id} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{d.name}</span>
                      <span className="block text-xs text-muted-foreground">{d.note}</span>
                    </span>
                    <input
                      type="radio"
                      name={`design-${a.id}`}
                      checked={on}
                      onChange={() => setDesign(d.id)}
                      className="h-5 w-5 accent-[var(--primary,#111)]"
                      aria-label={`${d.name} design`}
                    />
                  </label>
                );
              })}
            </div>
          </fieldset>
          <button type="button" className={btn} disabled={saving} onClick={save}>{saving ? "Saving…" : "Save"}</button>
        </div>
      )}
    </div>
  );
}

function CertReport() {
  const listFn = useServerFn(adminCertificateReport);
  const artistsFn = useServerFn(adminListCertArtists);
  const withdrawFn = useServerFn(adminWithdrawCertificate);
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({ queryKey: ["admin", "cert-report"], queryFn: () => listFn() });
  const { data: artists = [] } = useQuery({ queryKey: ["admin", "cert-artists"], queryFn: () => artistsFn() });
  const nameOf = useMemo(() => new Map((artists as Row[]).map((a) => [a.id, a.name as string])), [artists]);
  const [q, setQ] = useState("");
  const [gender, setGender] = useState("");
  const [status, setStatus] = useState("");
  const [design, setDesign] = useState("");
  const [country, setCountry] = useState("");
  const all = rows as Row[];
  const genders = useMemo(() => [...new Set(all.map((r) => r.gender_snapshot).filter(Boolean))] as string[], [all]);
  const countries = useMemo(() => [...new Set(all.map((r) => r.country_snapshot).filter(Boolean))] as string[], [all]);
  const shown = all.filter((r) => {
    const hay = `${r.serial} ${r.title} ${r.medium ?? ""} ${r.brand_name ?? ""} ${nameOf.get(r.artist_id) ?? ""}`.toLowerCase();
    return (
      (!q || hay.includes(q.toLowerCase())) &&
      (!gender || r.gender_snapshot === gender) &&
      (!status || r.status === status) &&
      (!design || r.design === design) &&
      (!country || r.country_snapshot === country)
    );
  });
  const csv = () => {
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const head = ["Serial", "Artist", "Title", "Medium", "Year", "Design", "Status", "Gender", "Country", "Issued"];
    const lines = shown.map((r) =>
      [r.serial, nameOf.get(r.artist_id) ?? r.brand_name, r.title, r.medium, r.year_text, r.design, r.status, r.gender_snapshot, r.country_snapshot, String(r.issued_at).slice(0, 10)]
        .map(esc).join(","),
    );
    const blob = new Blob([[head.map(esc).join(","), ...lines].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `certificates-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const withdraw = async (id: string) => {
    const reason = window.prompt("Reason for withdrawing this certificate:") ?? "";
    if (reason.trim().length < 3) return;
    try {
      await withdrawFn({ data: { id, reason } });
      toast.success("Certificate withdrawn");
      qc.invalidateQueries({ queryKey: ["admin", "cert-report"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not withdraw");
    }
  };
  const sel = "rounded-md border border-input bg-background px-2 py-2 text-sm";
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input className={`${inputCls} max-w-xs`} placeholder="Serial, artist, title, medium" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={sel} value={gender} onChange={(e) => setGender(e.target.value)} aria-label="Gender">
          <option value="">Any gender</option>
          {genders.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <select className={sel} value={country} onChange={(e) => setCountry(e.target.value)} aria-label="Country">
          <option value="">Any country</option>
          {countries.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <select className={sel} value={design} onChange={(e) => setDesign(e.target.value)} aria-label="Design">
          <option value="">Any design</option>
          {DESIGNS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select className={sel} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="">Any status</option>
          <option value="valid">Valid</option>
          <option value="withdrawn">Withdrawn</option>
        </select>
        <button type="button" className={btn2} onClick={csv} disabled={shown.length === 0}>Export CSV</button>
      </div>
      <p className="text-xs text-muted-foreground">{shown.length} of {all.length} certificates. Gender and country are for internal reporting only and never appear on a certificate.</p>
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/50">
            <tr>
              {["Serial", "Artist", "Title", "Medium", "Design", "Issued", "Status", ""].map((h) => (
                <th key={h} className="px-3 py-2 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.slice(0, 300).map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2 font-mono">
                  <a className="underline" href={`/verify/cert/${encodeURIComponent(r.serial)}`} target="_blank" rel="noreferrer">{r.serial}</a>
                </td>
                <td className="px-3 py-2">{nameOf.get(r.artist_id) ?? r.brand_name}</td>
                <td className="px-3 py-2">{r.title}</td>
                <td className="px-3 py-2">{r.medium ?? "—"}</td>
                <td className="px-3 py-2 capitalize">{r.design}</td>
                <td className="px-3 py-2">{String(r.issued_at).slice(0, 10)}</td>
                <td className="px-3 py-2">{r.status}</td>
                <td className="px-3 py-2">
                  {r.status === "valid" && <button type="button" className="underline" onClick={() => withdraw(r.id)}>Withdraw</button>}
                </td>
              </tr>
            ))}
            {shown.length === 0 && !isLoading && (
              <tr><td className="px-3 py-6 text-muted-foreground" colSpan={8}>No certificates yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
