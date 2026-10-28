import { useEffect, useState } from "react";
import {
  activateServicePricing,
  isServicePricingVisible,
  listServicePricing,
  type ServicePricingMode,
  type ServicePricingRow,
} from "@/lib/service-pricing";

export function ServicePricingAdmin() {
  const [live, setLive] = useState<ServicePricingRow[] | null>(null);
  const [draft, setDraft] = useState<Record<string, ServicePricingRow>>({});
  const [msg, setMsg] = useState<Record<string, { ok: boolean; text: string }>>({});
  const [busy, setBusy] = useState("");

  const load = async () => {
    try {
      const rows = await listServicePricing();
      setLive(rows);
      setDraft(Object.fromEntries(rows.map((r) => [r.id, r])));
    } catch (e) {
      setLive([]);
      setMsg({ _: { ok: false, text: "Could not load pricing: " + (e as Error).message } });
    }
  };
  useEffect(() => {
    void load();
  }, []);

  const patch = (id: string, p: Partial<ServicePricingRow>) => setDraft((d) => ({ ...d, [id]: { ...d[id], ...p } }));

  const activate = async (id: string) => {
    setBusy(id);
    try {
      await activateServicePricing(draft[id]);
      setMsg((m) => ({ ...m, [id]: { ok: true, text: "Live now. Visitors see this immediately." } }));
      await load();
    } catch (e) {
      setMsg((m) => ({ ...m, [id]: { ok: false, text: (e as Error).message } }));
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-5">
      <h3 className="font-display text-lg">Service pricing</h3>
      <p className="text-sm text-muted-foreground">
        Free: open to everyone. Freemium: members free, guests get a short taste. Paid: members must unlock it once; admins
        always have access. Changes apply to the live site as soon as you press Activate.
      </p>
      {msg._ && <p className="text-sm text-destructive">{msg._.text}</p>}
      {live === null && <p className="text-sm text-muted-foreground">Loading…</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {(live ?? []).map((cat) => {
          const d = draft[cat.id] ?? cat;
          const changed = d.mode !== cat.mode || d.priceNgn !== cat.priceNgn || d.guestAllowance !== cat.guestAllowance;
          return (
            <div key={cat.id} className="space-y-3 rounded-md border border-border p-4">
              <div className="flex items-center justify-between gap-2">
                <strong>{cat.label}</strong>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  live: {cat.mode}
                  {changed ? " · unsaved change" : ""}
                </span>
              </div>
              <label className="block text-xs text-muted-foreground">
                Mode
                <select
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  value={d.mode}
                  onChange={(e) => patch(cat.id, { mode: e.target.value as ServicePricingMode })}
                >
                  <option value="free">Free</option>
                  <option value="freemium">Freemium</option>
                  <option value="paid">Paid</option>
                </select>
              </label>
              {d.mode === "freemium" && (
                <label className="block text-xs text-muted-foreground">
                  Guest allowance (free visits before sign-in)
                  <input
                    type="number"
                    min={0}
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    value={d.guestAllowance}
                    onChange={(e) => patch(cat.id, { guestAllowance: +e.target.value })}
                  />
                </label>
              )}
              {isServicePricingVisible(d) && d.mode === "paid" && (
                <label className="block text-xs text-muted-foreground">
                  One-time price (₦)
                  <input
                    type="number"
                    min={0}
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    value={d.priceNgn}
                    onChange={(e) => patch(cat.id, { priceNgn: +e.target.value })}
                  />
                </label>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={busy === cat.id || !changed}
                  className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
                  onClick={() => activate(cat.id)}
                >
                  {busy === cat.id ? "Applying…" : "Activate"}
                </button>
                {changed && (
                  <button type="button" className="rounded-md border border-border px-3 py-1.5 text-sm" onClick={() => patch(cat.id, cat)}>
                    Undo
                  </button>
                )}
              </div>
              {msg[cat.id] && (
                <p role="status" className={"text-xs " + (msg[cat.id].ok ? "text-muted-foreground" : "text-destructive")}>
                  {msg[cat.id].text}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
