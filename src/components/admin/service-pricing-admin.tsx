import { useState } from "react";
import {
  MYAFRIARTX_SERVICE_CATALOG,
  activateServicePricing,
  getServiceDraft,
  isServicePricingVisible,
  listActiveServicePricing,
  saveServiceDraft,
  type ServicePricingMode,
} from "@/lib/service-pricing";

export function ServicePricingAdmin() {
  const [, tick] = useState(0);
  const refresh = () => tick((n) => n + 1);
  const live = listActiveServicePricing();

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-5">
      <h3 className="font-display text-lg">Service pricing</h3>
      <p className="text-sm text-muted-foreground">
        Free · Freemium · Paid per service. Save draft, then Activate. Pricing hidden when Free.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {MYAFRIARTX_SERVICE_CATALOG.map((cat) => {
          const draft = getServiceDraft(cat.id);
          const activeRow = live.find((s) => s.id === cat.id);
          const showPricing = isServicePricingVisible(draft);
          return (
            <div key={cat.id} className="rounded-md border border-border p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <strong>{cat.label}</strong>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  {draft.active === false ? "draft" : activeRow?.mode || "free"}
                </span>
              </div>
              <label className="block text-xs text-muted-foreground">
                Mode
                <select
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  value={draft.mode}
                  onChange={(e) => {
                    saveServiceDraft(cat.id, { mode: e.target.value as ServicePricingMode });
                    refresh();
                  }}
                >
                  <option value="free">Free</option>
                  <option value="freemium">Freemium</option>
                  <option value="paid">Paid</option>
                </select>
              </label>
              {draft.mode === "freemium" && (
                <label className="block text-xs text-muted-foreground">
                  Guest allowance
                  <input
                    type="number"
                    min={0}
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    value={draft.guestAllowance}
                    onChange={(e) => {
                      saveServiceDraft(cat.id, { guestAllowance: +e.target.value });
                      refresh();
                    }}
                  />
                </label>
              )}
              {showPricing && draft.mode === "paid" && (
                <label className="block text-xs text-muted-foreground">
                  Price (₦)
                  <input
                    type="number"
                    min={0}
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    value={draft.priceNgn}
                    onChange={(e) => {
                      saveServiceDraft(cat.id, { priceNgn: +e.target.value });
                      refresh();
                    }}
                  />
                </label>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-md border border-border px-3 py-1.5 text-sm"
                  onClick={() => {
                    saveServiceDraft(cat.id, draft);
                    refresh();
                  }}
                >
                  Save
                </button>
                <button
                  type="button"
                  className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"
                  onClick={() => {
                    activateServicePricing(cat.id);
                    refresh();
                  }}
                >
                  Activate
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
