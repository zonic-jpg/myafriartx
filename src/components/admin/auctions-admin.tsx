import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  adminListAuctionLots,
  adminSaveAuctionLot,
  adminRelistAuctionLot,
  adminCloseAuctionLot,
} from "@/lib/auction.functions";
import { publicMessage } from "@/lib/public-message";

type LotRow = {
  id: string;
  code: string | null;
  title: string;
  artist: string | null;
  status: string;
  starting_bid: number;
  reserve: number;
  current_bid: number;
  bid_count: number;
  ends_at: string | null;
};

const naira = (n: number) => "₦" + Number(n || 0).toLocaleString("en-NG");
const emptyForm = {
  title: "",
  artist: "",
  medium: "",
  description: "",
  imageUrl: "",
  startingBid: "",
  reserve: "",
  estimateLow: "",
  estimateHigh: "",
  days: "3",
};
const STATUS_LABEL: Record<string, string> = {
  live: "Open for bidding",
  upcoming: "Not started",
  passed: "No sale",
  sold: "Sold",
};

/** Admin → Auctions: schedule lots, reopen unsold ones, and end bidding. */
export function AuctionsAdmin() {
  const listFn = useServerFn(adminListAuctionLots);
  const saveFn = useServerFn(adminSaveAuctionLot);
  const relistFn = useServerFn(adminRelistAuctionLot);
  const closeFn = useServerFn(adminCloseAuctionLot);
  const qc = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [relistDays, setRelistDays] = useState("3");

  const { data: lots = [], isLoading } = useQuery({
    queryKey: ["admin", "auction-lots"],
    queryFn: () => listFn() as Promise<LotRow[]>,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "auction-lots"] });
  const num = (v: string) => (v.trim() === "" ? null : Math.round(Number(v.replace(/[,\s]/g, ""))));

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const startingBid = num(form.startingBid);
    const reserve = num(form.reserve) ?? startingBid;
    if (form.title.trim().length < 2) return toast.error("Give the lot a title.");
    if (startingBid == null || !Number.isFinite(startingBid) || startingBid < 0) {
      return toast.error("Enter a starting bid in naira.");
    }
    if (reserve == null || !Number.isFinite(reserve) || reserve < startingBid) {
      return toast.error("The reserve cannot be lower than the starting bid.");
    }
    setBusy(true);
    try {
      await saveFn({
        data: {
          title: form.title,
          artist: form.artist || null,
          medium: form.medium || null,
          description: form.description || null,
          imageUrl: form.imageUrl || null,
          startingBid,
          reserve,
          estimateLow: num(form.estimateLow),
          estimateHigh: num(form.estimateHigh),
          days: Number(form.days) || 3,
        },
      });
      toast.success("Lot is open for bidding");
      setForm(emptyForm);
      refresh();
    } catch (err) {
      toast.error(publicMessage(err as Error));
    } finally {
      setBusy(false);
    }
  };

  const act = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(done);
      refresh();
    } catch (err) {
      toast.error(publicMessage(err as Error));
    } finally {
      setBusy(false);
    }
  };

  const input = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";

  return (
    <div className="max-w-5xl space-y-8">
      <form onSubmit={create} className="rounded-md border border-border bg-card p-4">
        <h2 className="font-display text-xl">New lot</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A lot opens for bidding as soon as you save it and closes after the number of days you choose.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            Title
            <input className={input} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </label>
          <label className="text-sm">
            Artist
            <input className={input} value={form.artist} onChange={(e) => setForm({ ...form, artist: e.target.value })} />
          </label>
          <label className="text-sm">
            Medium and size
            <input className={input} value={form.medium} onChange={(e) => setForm({ ...form, medium: e.target.value })} placeholder="Oil on canvas, 90×120cm" />
          </label>
          <label className="text-sm">
            Picture link (optional, https://…)
            <input className={input} value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} inputMode="url" />
          </label>
          <label className="text-sm sm:col-span-2">
            Description
            <textarea className={input} rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </label>
          <label className="text-sm">
            Starting bid (₦)
            <input className={input} value={form.startingBid} onChange={(e) => setForm({ ...form, startingBid: e.target.value })} inputMode="numeric" required />
          </label>
          <label className="text-sm">
            Reserve (₦, kept private)
            <input className={input} value={form.reserve} onChange={(e) => setForm({ ...form, reserve: e.target.value })} inputMode="numeric" placeholder="Same as starting bid" />
          </label>
          <label className="text-sm">
            Estimate, low (₦)
            <input className={input} value={form.estimateLow} onChange={(e) => setForm({ ...form, estimateLow: e.target.value })} inputMode="numeric" />
          </label>
          <label className="text-sm">
            Estimate, high (₦)
            <input className={input} value={form.estimateHigh} onChange={(e) => setForm({ ...form, estimateHigh: e.target.value })} inputMode="numeric" />
          </label>
          <label className="text-sm">
            Open for
            <select className={input} value={form.days} onChange={(e) => setForm({ ...form, days: e.target.value })}>
              {[1, 2, 3, 5, 7, 14].map((d) => (
                <option key={d} value={d}>
                  {d} day{d === 1 ? "" : "s"}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button type="submit" disabled={busy} className="mt-4 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-60">
          {busy ? "Saving…" : "Open lot for bidding"}
        </button>
      </form>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-xl">Lots ({lots.length})</h2>
          <label className="text-sm text-muted-foreground">
            Reopen for{" "}
            <select className="rounded-md border border-border bg-background px-2 py-1 text-sm" value={relistDays} onChange={(e) => setRelistDays(e.target.value)}>
              {[1, 2, 3, 5, 7, 14].map((d) => (
                <option key={d} value={d}>
                  {d} day{d === 1 ? "" : "s"}
                </option>
              ))}
            </select>
          </label>
        </div>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : lots.length === 0 ? (
          <p className="text-sm text-muted-foreground">No lots yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border bg-card">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Lot</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Start / current</th>
                  <th className="px-3 py-2">Bids</th>
                  <th className="px-3 py-2">Closes</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {lots.map((l) => (
                  <tr key={l.id} className="border-t border-border">
                    <td className="px-3 py-2">
                      <div className="font-medium">{l.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {[l.code, l.artist].filter(Boolean).join(" · ")}
                      </div>
                    </td>
                    <td className="px-3 py-2">{STATUS_LABEL[l.status] ?? l.status}</td>
                    <td className="px-3 py-2">
                      {naira(l.starting_bid)}
                      {l.bid_count > 0 ? ` / ${naira(l.current_bid)}` : ""}
                    </td>
                    <td className="px-3 py-2">{l.bid_count}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {l.ends_at ? new Date(l.ends_at).toLocaleString() : "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {l.status === "live" ? (
                        <button type="button" disabled={busy} onClick={() => act(() => closeFn({ data: { id: l.id } }), "Bidding closed")} className="rounded border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-60">
                          End bidding now
                        </button>
                      ) : l.status !== "sold" ? (
                        <button type="button" disabled={busy} onClick={() => act(() => relistFn({ data: { id: l.id, days: Number(relistDays) || 3 } }), "Lot reopened for bidding")} className="rounded border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-60">
                          Reopen for bidding
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
