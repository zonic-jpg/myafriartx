import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  adminGetSubaccountsEnabled,
  adminSetSubaccountsEnabled,
  listFlutterwaveBanks,
  adminVerifyBankAccount,
  adminSetArtistSubaccount,
  adminClearArtistSubaccount,
  adminListArtistPayouts,
} from "@/lib/subaccounts.functions";

/**
 * Payouts admin — vet an artist's bank account with Flutterwave and create a
 * Flutterwave Subaccount for them, so future artwork sales split and settle
 * automatically on Flutterwave's own platform. We never store the account
 * number, and the whole feature stays off (checkout unaffected) until the
 * toggle below is switched on.
 */
export function PayoutsAdmin() {
  const qc = useQueryClient();
  const getEnabledFn = useServerFn(adminGetSubaccountsEnabled);
  const setEnabledFn = useServerFn(adminSetSubaccountsEnabled);
  const listBanksFn = useServerFn(listFlutterwaveBanks);
  const verifyFn = useServerFn(adminVerifyBankAccount);
  const setSubaccountFn = useServerFn(adminSetArtistSubaccount);
  const clearSubaccountFn = useServerFn(adminClearArtistSubaccount);
  const listPayoutsFn = useServerFn(adminListArtistPayouts);

  const { data: enabledData } = useQuery({
    queryKey: ["admin", "payouts", "enabled"],
    queryFn: () => getEnabledFn(),
  });
  const { data: banksData } = useQuery({
    queryKey: ["admin", "payouts", "banks"],
    queryFn: () => listBanksFn({ data: { country: "NG" } }),
    staleTime: 60 * 60 * 1000,
  });
  const { data: payoutsData, isLoading } = useQuery({
    queryKey: ["admin", "payouts", "artists"],
    queryFn: () => listPayoutsFn(),
  });

  const enabled = enabledData?.enabled ?? false;
  const banks = banksData?.banks ?? [];
  const artists = payoutsData?.artists ?? [];

  const [selectedArtistId, setSelectedArtistId] = useState<string>("");
  const [accountBank, setAccountBank] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [resolvedName, setResolvedName] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving] = useState(false);

  const toggleEnabled = async (next: boolean) => {
    try {
      await setEnabledFn({ data: { enabled: next } });
      toast.success(next ? "Flutterwave split payouts enabled" : "Flutterwave split payouts disabled");
      qc.invalidateQueries({ queryKey: ["admin", "payouts", "enabled"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update the toggle");
    }
  };

  const verify = async () => {
    if (!accountBank || accountNumber.length < 5) return;
    setVerifying(true);
    setResolvedName(null);
    try {
      const { account_name } = await verifyFn({ data: { account_number: accountNumber, account_bank: accountBank } });
      setResolvedName(account_name);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not verify this account");
    } finally {
      setVerifying(false);
    }
  };

  const saveSubaccount = async () => {
    if (!selectedArtistId || !resolvedName) return;
    setSaving(true);
    try {
      const { artistSplitPercent } = await setSubaccountFn({
        data: {
          artistId: selectedArtistId,
          account_number: accountNumber,
          account_bank: accountBank,
          business_name: resolvedName,
        },
      });
      toast.success(`Subaccount created — artist keeps ${artistSplitPercent}% per sale`);
      setAccountNumber("");
      setAccountBank("");
      setResolvedName(null);
      setSelectedArtistId("");
      qc.invalidateQueries({ queryKey: ["admin", "payouts", "artists"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create the subaccount");
    } finally {
      setSaving(false);
    }
  };

  const clearSubaccount = async (artistId: string) => {
    try {
      await clearSubaccountFn({ data: { artistId } });
      toast.success("Subaccount removed — this artist falls back to manual settlement");
      qc.invalidateQueries({ queryKey: ["admin", "payouts", "artists"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove the subaccount");
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium">Flutterwave split payouts</p>
            <p className="text-sm text-muted-foreground">
              While off, checkout behaves exactly as it does today. When on, any artwork whose artist
              has a verified subaccount below will split automatically on Flutterwave — we never touch
              the funds or the bank details.
            </p>
          </div>
          <button
            type="button"
            onClick={() => toggleEnabled(!enabled)}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              enabled ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {enabled ? "Enabled" : "Disabled"}
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-border p-4">
        <p className="font-medium">Vet an artist's payout account</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter the bank account the artist gave you. We resolve the account name with Flutterwave first
          so you can confirm it before anything is saved — the account number itself is never stored.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <select
            value={selectedArtistId}
            onChange={(e) => setSelectedArtistId(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">Select artist…</option>
            {artists.map((a: any) => (
              <option key={a.id} value={a.id}>
                {a.name}
                {a.flutterwave_subaccount_id ? " (already vetted)" : ""}
              </option>
            ))}
          </select>

          <select
            value={accountBank}
            onChange={(e) => {
              setAccountBank(e.target.value);
              setResolvedName(null);
            }}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">Select bank…</option>
            {banks.map((b: any) => (
              <option key={b.code} value={b.code}>
                {b.name}
              </option>
            ))}
          </select>

          <input
            value={accountNumber}
            onChange={(e) => {
              setAccountNumber(e.target.value.replace(/\D/g, ""));
              setResolvedName(null);
            }}
            placeholder="Account number"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />

          <button
            type="button"
            onClick={verify}
            disabled={verifying || !accountBank || accountNumber.length < 5}
            className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            {verifying ? "Verifying…" : "Verify account"}
          </button>
        </div>

        {resolvedName && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-muted/40 p-3 text-sm">
            <p>
              Flutterwave resolves this account to <b>{resolvedName}</b>. Confirm this matches the artist
              before saving.
            </p>
            <button
              type="button"
              onClick={saveSubaccount}
              disabled={saving || !selectedArtistId}
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {saving ? "Creating…" : "Confirm & create subaccount"}
            </button>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border p-4">
        <p className="font-medium">Vetted artists</p>
        {isLoading && <p className="mt-2 text-sm text-muted-foreground">Loading…</p>}
        <div className="mt-3 divide-y divide-border text-sm">
          {artists
            .filter((a: any) => a.flutterwave_subaccount_id)
            .map((a: any) => (
              <div key={a.id} className="flex items-center justify-between gap-3 py-2">
                <div>
                  <p className="font-medium">{a.name}</p>
                  <p className="text-muted-foreground">
                    {a.payout_verified_name} · ****{a.payout_account_last4} ·{" "}
                    {a.payout_updated_at ? new Date(a.payout_updated_at).toLocaleDateString() : "—"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => clearSubaccount(a.id)}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  Remove
                </button>
              </div>
            ))}
          {artists.filter((a: any) => a.flutterwave_subaccount_id).length === 0 && !isLoading && (
            <p className="py-2 text-muted-foreground">No artists vetted yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
