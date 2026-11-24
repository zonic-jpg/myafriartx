import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteNav } from "@/components/SiteNav";
import { ImageDropzone, prepareImageForUpload, prepareDocumentForUpload } from "@/components/image-dropzone";
import { getMyVerification } from "@/lib/kyc.functions";
import { initializePayment } from "@/lib/payments.functions";
import {
  buybackAct,
  createBuybackOffer,
  getBuybackConfig,
  listBuybackMarket,
  listMyBuyback,
  uploadBuybackFile,
} from "@/lib/buyback.functions";
import { ARTIST_NOTE, BUYER_TERMS, HOW_IT_WORKS, SELLER_TERMS, STATUS_LABEL } from "@/lib/buyback-terms";

export const Route = createFileRoute("/buyback")({
  component: BuybackPage,
  head: () => ({ meta: [{ title: "Sell with a buyback option — MyAfriArt" }] }),
});

type Row = Record<string, any>;
type Tab = "market" | "sell" | "mine";
const ngn = (n: unknown) => `₦${Math.round(Number(n) || 0).toLocaleString()}`;
const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30";
const btn = "rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50";
const btnGhost = "rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50";

function msgOf(e: unknown, fallback = "Something went wrong. Please try again.") {
  const m = e instanceof Error ? e.message : "";
  return m && !/^(Failed to fetch|Load failed|NetworkError)/i.test(m) ? m : fallback;
}

function BuybackPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("market");
  const [kyc, setKyc] = useState<string | null>(null);
  const kycFn = useServerFn(getMyVerification);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
  }, []);
  useEffect(() => {
    if (!authed) return;
    kycFn().then((v) => setKyc(v.status)).catch(() => setKyc("unverified"));
  }, [authed]);

  if (authed === null) return <p className="p-8 text-center text-muted-foreground">Loading…</p>;
  if (!authed) {
    return (
      <div className="min-h-screen bg-background">
        <SiteNav tone="plain" />
        <div className="mx-auto max-w-lg p-8 text-center">
          <h1 className="text-2xl font-semibold">Sell with a buyback option</h1>
          <p className="mt-2 text-muted-foreground">Sign in to list a work or buy one.</p>
          <Link to="/login" className="mt-4 inline-block underline">Sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav tone="plain" />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <header>
          <h1 className="font-display text-3xl">Sell with a buyback option</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            A private sale between two members. The buyer owns the work outright. The seller may hold an option to buy it back at a
            fixed price before a set date.
          </p>
        </header>

        <section className="mt-6 grid gap-3 sm:grid-cols-3" aria-label="How it works">
          {HOW_IT_WORKS.map((r) => (
            <div key={r.who} className="rounded-xl border border-border p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">{r.who}</p>
              <p className="mt-1 text-sm text-muted-foreground">{r.does}</p>
            </div>
          ))}
        </section>

        {kyc && kyc !== "verified" && (
          <div className="mt-6 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
            Identity verification is required to list or buy a work.{" "}
            <Link to="/verification" className="font-medium underline">Verify now</Link>
          </div>
        )}

        <nav className="mt-8 flex gap-1 border-b border-border" role="tablist">
          {([["market", "On offer"], ["sell", "List a work"], ["mine", "My deals"]] as const).map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`-mb-px border-b-2 px-4 py-2 text-sm ${tab === id ? "border-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="mt-6">
          {tab === "market" && <Market onReserved={() => setTab("mine")} />}
          {tab === "sell" && <SellForm onDone={() => setTab("mine")} />}
          {tab === "mine" && <MyDeals />}
        </div>
      </main>
    </div>
  );
}

// ---------------- browse ----------------
function Market({ onReserved }: { onReserved: () => void }) {
  const listFn = useServerFn(listBuybackMarket);
  const actFn = useServerFn(buybackAct);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState("");
  const [pick, setPick] = useState<Row | null>(null);
  const [ok, setOk] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");

  const load = useCallback(() => {
    listFn().then(setRows).catch((e) => { setErr(msgOf(e)); setRows([]); });
  }, [listFn]);
  useEffect(load, [load]);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (rows ?? []).filter((r) => !t || `${r.title} ${r.artist_name} ${r.medium ?? ""}`.toLowerCase().includes(t));
  }, [rows, q]);

  async function reserve() {
    if (!pick) return;
    setBusy(true); setErr("");
    try {
      await actFn({ data: { id: pick.id, action: "reserve", acceptTerms: ok, note: note || undefined } });
      setPick(null); setOk(false); setNote("");
      onReserved();
    } catch (e) { setErr(msgOf(e)); } finally { setBusy(false); }
  }

  if (rows === null) return <p className="text-sm text-muted-foreground">Loading…</p>;
  return (
    <div>
      <input className={`${inputCls} max-w-sm`} placeholder="Search title, artist or medium" value={q} onChange={(e) => setQ(e.target.value)} />
      {err && <p className="mt-3 text-sm text-destructive">{err}</p>}
      {shown.length === 0 && <p className="mt-6 text-sm text-muted-foreground">No works are on offer right now.</p>}
      <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((r) => (
          <article key={r.id} className="overflow-hidden rounded-xl border border-border">
            {r.image_url && <img src={r.image_url} alt={r.title} loading="lazy" className="aspect-[4/3] w-full object-cover" />}
            <div className="space-y-1 p-4">
              <h3 className="font-medium">{r.title}</h3>
              <p className="text-sm text-muted-foreground">{r.artist_name}{r.year ? `, ${r.year}` : ""}{r.medium ? ` · ${r.medium}` : ""}</p>
              <p className="pt-1 text-lg font-semibold">{ngn(r.price_ngn)}</p>
              {r.buyback_price_ngn ? (
                <p className="rounded-md bg-muted px-2 py-1 text-xs">
                  Seller may buy back for {ngn(r.buyback_price_ngn)} within {r.buyback_days} days of your receipt. Optional for the seller, never a debt.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Ordinary sale, no buyback.</p>
              )}
              <p className="line-clamp-3 pt-1 text-xs text-muted-foreground">Provenance: {r.provenance}</p>
              <p className="text-xs text-muted-foreground">Seller: {r.seller_name}{r.has_proof ? " · proof of ownership on file" : ""}</p>
              {r.role === "seller" ? (
                <p className="pt-2 text-xs text-muted-foreground">This is your listing.</p>
              ) : (
                <button className={`${btn} mt-2 w-full`} onClick={() => { setPick(r); setErr(""); }}>Reserve</button>
              )}
            </div>
          </article>
        ))}
      </div>

      {pick && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-background p-6">
            <h2 className="text-lg font-semibold">Reserve “{pick.title}”</h2>
            <p className="mt-1 text-sm text-muted-foreground">{ngn(pick.price_ngn)} · paid to the seller directly. The reservation holds for 72 hours.</p>
            <ul className="mt-4 list-disc space-y-1 pl-5 text-sm">{BUYER_TERMS.map((t) => <li key={t}>{t}</li>)}</ul>
            {pick.buyback_price_ngn && (
              <label className="mt-4 block text-sm">
                Where should the seller send the buyback payment if they use the option? (your bank details)
                <textarea className={`${inputCls} mt-1`} rows={2} maxLength={600} value={note} onChange={(e) => setNote(e.target.value)} />
              </label>
            )}
            <label className="mt-4 flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" checked={ok} onChange={(e) => setOk(e.target.checked)} />
              I have read and accept these terms.
            </label>
            {err && <p className="mt-3 text-sm text-destructive">{err}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button className={btnGhost} onClick={() => setPick(null)}>Cancel</button>
              <button className={btn} disabled={!ok || busy} onClick={reserve}>{busy ? "Reserving…" : "Reserve this work"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------- list a work ----------------
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      {hint && <span className="ml-2 text-xs text-muted-foreground">{hint}</span>}
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border p-5">
      <h2 className="flex items-center gap-3 text-base font-semibold">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-xs text-primary-foreground">{n}</span>
        {title}
      </h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function SellForm({ onDone }: { onDone: () => void }) {
  const cfgFn = useServerFn(getBuybackConfig);
  const uploadFn = useServerFn(uploadBuybackFile);
  const createFn = useServerFn(createBuybackOffer);
  const payFn = useServerFn(initializePayment);
  const [cfg, setCfg] = useState<{ feeNgn: number; maxUpliftPercent: number; minDays: number; maxDays: number } | null>(null);
  useEffect(() => { cfgFn().then(setCfg).catch(() => setCfg({ feeNgn: 0, maxUpliftPercent: 20, minDays: 14, maxDays: 180 })); }, [cfgFn]);

  const [f, setF] = useState({
    title: "", artistName: "", iAmTheArtist: false, medium: "", year: "", w: "", h: "", d: "", edition: "", description: "",
    provenance: "", price: "", option: false, buybackPrice: "", days: 90, pay: "", terms: false,
  });
  const set = (p: Partial<typeof f>) => setF((s) => ({ ...s, ...p }));
  const [image, setImage] = useState<{ preview: string; url: string } | null>(null);
  const [proof, setProof] = useState<{ name: string; path: string } | null>(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  const price = Number(f.price.replace(/,/g, "")) || 0;
  const maxBuyback = cfg ? Math.floor(price * (1 + cfg.maxUpliftPercent / 100)) : price;
  const optionAllowed = !f.iAmTheArtist;

  async function pickImage(file: File) {
    setBusy("image"); setErr("");
    try {
      const p = await prepareImageForUpload(file);
      const r = await uploadFn({ data: { kind: "image", base64: p.base64, filename: p.filename } });
      setImage({ preview: p.base64, url: r.url as string });
    } catch (e) { setErr(msgOf(e, "Could not upload the photo.")); } finally { setBusy(""); }
  }
  async function pickProof(file: File | undefined) {
    if (!file) return;
    setBusy("proof"); setErr("");
    try {
      const p = await prepareDocumentForUpload(file);
      const r = await uploadFn({ data: { kind: "proof", base64: p.base64, filename: p.filename } });
      setProof({ name: file.name, path: r.path });
    } catch (e) { setErr(msgOf(e, "Could not upload the document.")); } finally { setBusy(""); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!image) return setErr("Add a photo of the work.");
    if (!f.terms) return setErr("Please accept the terms to continue.");
    setBusy("submit");
    try {
      const num = (s: string) => (s.trim() === "" ? null : Number(s));
      const res = await createFn({
        data: {
          title: f.title, artistName: f.artistName, iAmTheArtist: f.iAmTheArtist,
          medium: f.medium || null, year: num(f.year), widthCm: num(f.w), heightCm: num(f.h), depthCm: num(f.d),
          edition: f.edition || null, description: f.description || null, provenance: f.provenance,
          imageUrl: image.url, proofPath: proof?.path ?? null,
          priceNgn: price,
          buybackPriceNgn: f.option && optionAllowed ? Number(f.buybackPrice.replace(/,/g, "")) || 0 : null,
          buybackDays: f.option && optionAllowed ? f.days : null,
          paymentInstructions: f.pay, acceptTerms: true,
        },
      });
      if (res.status === "awaiting_fee") {
        const r = await payFn({ data: { purpose: "buyback_fee", metadata: { buyback_id: res.id } } });
        window.location.href = r.authorizationUrl;
        return;
      }
      onDone();
    } catch (e2) { setErr(msgOf(e2)); setBusy(""); }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-2xl space-y-5">
      <Step n={1} title="The work">
        <ImageDropzone value={image?.preview ?? null} onSelect={(file) => void pickImage(file)} busy={busy === "image"}
          title="Drag a photo of the work here, or click to choose" hint="One clear, straight-on photo · JPG, PNG or WebP" />
        <Field label="Title"><input className={inputCls} required minLength={2} maxLength={200} value={f.title} onChange={(e) => set({ title: e.target.value })} /></Field>
        <Field label="Artist"><input className={inputCls} required minLength={2} maxLength={160} value={f.artistName} onChange={(e) => set({ artistName: e.target.value })} /></Field>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1" checked={f.iAmTheArtist} onChange={(e) => set({ iAmTheArtist: e.target.checked, option: e.target.checked ? false : f.option })} />
          <span>I am the artist who made this work. <span className="text-muted-foreground">{ARTIST_NOTE}</span></span>
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Medium"><input className={inputCls} maxLength={120} value={f.medium} onChange={(e) => set({ medium: e.target.value })} placeholder="Oil on canvas" /></Field>
          <Field label="Year"><input className={inputCls} inputMode="numeric" value={f.year} onChange={(e) => set({ year: e.target.value.replace(/\D/g, "").slice(0, 4) })} /></Field>
          <Field label="Edition" hint="optional"><input className={inputCls} maxLength={80} value={f.edition} onChange={(e) => set({ edition: e.target.value })} placeholder="3 of 10" /></Field>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {([["Width cm", "w"], ["Height cm", "h"], ["Depth cm", "d"]] as const).map(([l, k]) => (
            <Field key={k} label={l}><input className={inputCls} inputMode="decimal" value={f[k]} onChange={(e) => set({ [k]: e.target.value.replace(/[^\d.]/g, "") } as any)} /></Field>
          ))}
        </div>
        <Field label="Description" hint="optional"><textarea className={inputCls} rows={3} maxLength={3000} value={f.description} onChange={(e) => set({ description: e.target.value })} /></Field>
      </Step>

      <Step n={2} title="Provenance and proof of ownership">
        <Field label="How did you come to own this work?" hint="where and when you got it, from whom">
          <textarea className={inputCls} rows={4} required minLength={20} maxLength={3000} value={f.provenance} onChange={(e) => set({ provenance: e.target.value })} />
        </Field>
        <Field label="Proof of ownership" hint={f.iAmTheArtist ? "optional for the artist" : "required: receipt, invoice or the artist’s certificate (PDF or photo)"}>
          <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => void pickProof(e.target.files?.[0])} className="block w-full text-sm" />
          {busy === "proof" && <span className="text-xs text-muted-foreground">Uploading…</span>}
          {proof && <span className="text-xs text-emerald-700">✓ {proof.name} uploaded (private, only our team can open it)</span>}
        </Field>
      </Step>

      <Step n={3} title="Price and buyback">
        <Field label="Selling price (₦)"><input className={inputCls} required inputMode="numeric" value={f.price} onChange={(e) => set({ price: e.target.value.replace(/[^\d]/g, "") })} /></Field>
        <label className={`flex items-start gap-2 text-sm ${optionAllowed ? "" : "opacity-50"}`}>
          <input type="checkbox" className="mt-1" disabled={!optionAllowed} checked={f.option && optionAllowed} onChange={(e) => set({ option: e.target.checked })} />
          <span>Keep an option to buy this work back{!optionAllowed && " (not available for an artist’s own work)"}</span>
        </label>
        {f.option && optionAllowed && cfg && (
          <div className="space-y-4 rounded-xl bg-muted/50 p-4">
            <Field label="Buyback price (₦)" hint={price ? `between ${ngn(price)} and ${ngn(maxBuyback)}` : "enter the selling price first"}>
              <input className={inputCls} inputMode="numeric" value={f.buybackPrice} onChange={(e) => set({ buybackPrice: e.target.value.replace(/[^\d]/g, "") })} />
            </Field>
            <Field label={`Buyback period: ${f.days} days`} hint={`counted from the day the buyer confirms receipt (${cfg.minDays} to ${cfg.maxDays})`}>
              <input type="range" className="w-full" min={cfg.minDays} max={cfg.maxDays} step={1} value={f.days} onChange={(e) => set({ days: Number(e.target.value) })} />
            </Field>
            <p className="text-xs text-muted-foreground">The buyback is your option, not a debt. If you do not use it in time, the buyer keeps the work and you owe nothing.</p>
          </div>
        )}
        <Field label="How should the buyer pay you?" hint="bank name, account name and number">
          <textarea className={inputCls} rows={2} required minLength={10} maxLength={600} value={f.pay} onChange={(e) => set({ pay: e.target.value })} />
          <span className="text-xs text-muted-foreground">Shown to the buyer only after they reserve and pay the buyer fee.</span>
        </Field>
      </Step>

      <Step n={4} title="Terms">
        <ul className="list-disc space-y-1 pl-5 text-sm">{SELLER_TERMS.map((t) => <li key={t}>{t}</li>)}</ul>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1" checked={f.terms} onChange={(e) => set({ terms: e.target.checked })} />
          I have read and accept these terms.
        </label>
        {cfg && cfg.feeNgn > 0 && <p className="text-sm">A flat listing fee of <strong>{ngn(cfg.feeNgn)}</strong> is paid next, before your listing goes to review.</p>}
      </Step>

      {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
      <button type="submit" className={`${btn} w-full py-3`} disabled={busy !== ""}>
        {busy === "submit" ? "Saving…" : cfg && cfg.feeNgn > 0 ? "Continue to pay listing fee" : "Submit for review"}
      </button>
    </form>
  );
}

// ---------------- my deals ----------------
function MyDeals() {
  const listFn = useServerFn(listMyBuyback);
  const actFn = useServerFn(buybackAct);
  const payFn = useServerFn(initializePayment);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState("");
  const [ref, setRef] = useState<Record<string, string>>({});
  const [carrier, setCarrier] = useState<Record<string, string>>({});

  const load = useCallback(() => { listFn().then(setRows).catch((e) => { setErr(msgOf(e)); setRows([]); }); }, [listFn]);
  useEffect(load, [load]);

  async function act(id: string, action: string, extra: Record<string, string> = {}) {
    setBusyId(id); setErr("");
    try { await actFn({ data: { id, action: action as any, ...extra } }); load(); }
    catch (e) { setErr(msgOf(e)); } finally { setBusyId(""); }
  }
  async function payFee(id: string, purpose: "buyback_fee" | "buyback_buyer_fee" | "buyback_exercise_fee") {
    setBusyId(id); setErr("");
    try { const r = await payFn({ data: { purpose, metadata: { buyback_id: id } } }); window.location.href = r.authorizationUrl; }
    catch (e) { setErr(msgOf(e)); setBusyId(""); }
  }

  if (rows === null) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">You have no listings or purchases yet.</p>;

  return (
    <div className="space-y-4">
      {err && <p className="text-sm text-destructive">{err}</p>}
      {rows.map((r) => {
        const seller = r.role === "seller";
        const buyer = r.role === "buyer";
        const b = busyId === r.id;
        const exerciseDue = Number(r.exercise_fee_ngn) > 0 && !r.exercise_fee_paid_at;
        return (
          <article key={r.id} className="rounded-xl border border-border p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-medium">{r.title} <span className="text-xs text-muted-foreground">· {r.short_code}</span></h3>
                <p className="text-sm text-muted-foreground">{seller ? "You are selling" : "You are buying"} · {ngn(r.price_ngn)}{r.buyback_price_ngn ? ` · buyback ${ngn(r.buyback_price_ngn)} in ${r.buyback_days} days` : ""}</p>
              </div>
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">{STATUS_LABEL[r.status] ?? r.status}</span>
            </div>

            <div className="mt-3 space-y-3 text-sm">
              {r.review_note && seller && <p className="text-muted-foreground">Note from our team: {r.review_note}</p>}

              {seller && r.status === "awaiting_fee" && (
                <div><button className={btn} disabled={b} onClick={() => payFee(r.id, "buyback_fee")}>Pay listing fee {ngn(r.fee_ngn)}</button>{" "}
                  <button className={btnGhost} disabled={b} onClick={() => act(r.id, "withdraw")}>Withdraw</button></div>
              )}
              {seller && (r.status === "pending_review" || r.status === "open") && (
                <div className="flex items-center gap-3">
                  <p className="text-muted-foreground">{r.status === "open" ? "Live. Waiting for a buyer." : "Our team is checking your proof of ownership."}</p>
                  <button className={btnGhost} disabled={b} onClick={() => act(r.id, "withdraw")}>Withdraw</button>
                </div>
              )}
              {buyer && r.status === "reserved" && (
                Number(r.buyer_fee_ngn) > 0 && !r.buyer_fee_paid_at ? (
                  <div className="space-y-2">
                    <p>Pay the flat buyer fee to see the seller’s payment details. Reserved until {r.reserved_until ? new Date(r.reserved_until).toLocaleString() : "—"}.</p>
                    <button className={btn} disabled={b} onClick={() => payFee(r.id, "buyback_buyer_fee")}>Pay buyer fee {ngn(r.buyer_fee_ngn)}</button>{" "}
                    <button className={btnGhost} disabled={b} onClick={() => act(r.id, "release")}>Release reservation</button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="rounded-lg bg-muted p-3 whitespace-pre-wrap">Pay the seller {ngn(r.price_ngn)}:{"\n"}{r.payment_instructions}</p>
                    <input className={inputCls} placeholder="Transfer reference" value={ref[r.id] ?? ""} onChange={(e) => setRef({ ...ref, [r.id]: e.target.value })} />
                    <button className={btn} disabled={b || !(ref[r.id] ?? "").trim()} onClick={() => act(r.id, "mark_paid", { reference: ref[r.id] })}>I have paid</button>{" "}
                    <button className={btnGhost} disabled={b} onClick={() => act(r.id, "release")}>Release reservation</button>
                  </div>
                )
              )}
              {seller && r.status === "reserved" && <p className="text-muted-foreground">Reserved by {r.buyer_name}. Waiting for their payment.</p>}
              {seller && r.status === "payment_sent" && (
                <div className="space-y-2">
                  <p>{r.buyer_name} says they paid you {ngn(r.price_ngn)}. Reference: <strong>{r.buyer_payment_ref}</strong></p>
                  <button className={btn} disabled={b} onClick={() => act(r.id, "confirm_payment")}>I have received the money</button>
                </div>
              )}
              {buyer && r.status === "payment_sent" && <p className="text-muted-foreground">Waiting for the seller to confirm your payment.</p>}
              {seller && r.status === "paid" && (
                <div className="grid gap-2 sm:grid-cols-3">
                  <input className={inputCls} placeholder="Courier (optional)" value={carrier[r.id] ?? ""} onChange={(e) => setCarrier({ ...carrier, [r.id]: e.target.value })} />
                  <input className={inputCls} placeholder="Tracking or delivery reference" value={ref[r.id] ?? ""} onChange={(e) => setRef({ ...ref, [r.id]: e.target.value })} />
                  <button className={btn} disabled={b} onClick={() => act(r.id, "hand_over", { carrier: carrier[r.id] ?? "", reference: ref[r.id] ?? "" })}>I have handed it over</button>
                </div>
              )}
              {buyer && r.status === "paid" && <p className="text-muted-foreground">Payment confirmed. Waiting for the seller to hand the work over.</p>}
              {buyer && r.status === "handed_over" && (
                <div className="space-y-2">
                  <p>On its way{r.carrier ? ` with ${r.carrier}` : ""}{r.tracking_ref ? ` (${r.tracking_ref})` : ""}.</p>
                  <button className={btn} disabled={b} onClick={() => act(r.id, "confirm_receipt")}>I have received the work</button>
                </div>
              )}
              {seller && r.status === "handed_over" && <p className="text-muted-foreground">Waiting for the buyer to confirm they received it.</p>}
              {seller && r.status === "sold" && r.buyback_price_ngn && (
                exerciseDue ? (
                  <div className="space-y-2">
                    <p>Your buyback option is open until {r.option_expires_at ? new Date(r.option_expires_at).toLocaleDateString() : "—"}. Pay the flat buyback fee to see where to send the buyback payment.</p>
                    <button className={btn} disabled={b} onClick={() => payFee(r.id, "buyback_exercise_fee")}>Pay buyback fee {ngn(r.exercise_fee_ngn)}</button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p>Your buyback option is open until {r.option_expires_at ? new Date(r.option_expires_at).toLocaleDateString() : "—"}. Pay the buyer {ngn(r.buyback_price_ngn)}:</p>
                    <p className="rounded-lg bg-muted p-3 whitespace-pre-wrap">{r.buyer_payout_note || "The buyer did not leave payment details. Message our team."}</p>
                    <input className={inputCls} placeholder="Transfer reference" value={ref[r.id] ?? ""} onChange={(e) => setRef({ ...ref, [r.id]: e.target.value })} />
                    <button className={btn} disabled={b || !(ref[r.id] ?? "").trim()} onClick={() => act(r.id, "exercise_send", { reference: ref[r.id] })}>I have paid the buyback price</button>
                  </div>
                )
              )}
              {buyer && r.status === "sold" && <p className="text-muted-foreground">This work is yours.{r.option_expires_at ? ` The seller may buy it back until ${new Date(r.option_expires_at).toLocaleDateString()}.` : ""}</p>}
              {buyer && r.status === "exercise_sent" && (
                <div className="space-y-2">
                  <p>The seller says they paid you the buyback price ({ngn(r.buyback_price_ngn)}). Reference: <strong>{r.exercise_ref}</strong></p>
                  <button className={btn} disabled={b} onClick={() => act(r.id, "confirm_exercise")}>I have received the money</button>
                </div>
              )}
              {seller && r.status === "exercise_sent" && <p className="text-muted-foreground">Waiting for the buyer to confirm the buyback payment.</p>}
              {r.status === "option_exercised" && <p className="text-muted-foreground">The buyback was completed. The work goes back to the seller.</p>}
              {r.status === "option_lapsed" && <p className="text-muted-foreground">The buyback period ended. The work stays with the buyer.</p>}
            </div>
          </article>
        );
      })}
    </div>
  );
}
