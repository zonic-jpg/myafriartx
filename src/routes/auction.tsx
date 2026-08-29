import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import SiteFooter from "@/components/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import {
  listAuctionLots,
  listLotBids,
  placeAuctionBid,
  getAuctionWinCheckout,
} from "@/lib/auction.functions";
import { initializePayment } from "@/lib/payments.functions";
import { localImageForKey } from "@/lib/local-image-assets";
import {
  type Lot,
  type Bid,
  money,
  minNextBid,
  increment,
  reserveMet,
  buyersPremium,
  countdown,
  BUYERS_PREMIUM,
} from "@/lib/auction-engine";

export const Route = createFileRoute("/auction")({
  component: AuctionFloor,
  head: () => ({
    meta: [{ title: "Live Auction — MyAfriart" }],
  }),
});

type LotRow = Lot & { reserveMet?: boolean };

function AuctionFloor() {
  const fetchLots = useServerFn(listAuctionLots);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["auction-lots"],
    queryFn: () => fetchLots(),
    refetchInterval: 15_000,
  });

  const [openId, setOpenId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("You");

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, s) => {
      setUserId(s?.user?.id ?? null);
      if (s?.user?.id) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", s.user.id)
          .maybeSingle();
        setDisplayName(prof?.display_name ?? "You");
      }
    });
    supabase.auth.getSession().then(async ({ data: sess }) => {
      setUserId(sess.session?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const lots = data?.lots ?? [];
  const open = lots.find((l) => l.id === openId) ?? null;

  return (
    <div className="auc">
      <header className="auc-top">
        <div className="auc-kicker">Live auction</div>
        <h1>Friday Evening Sale</h1>
        <p>
          Timed bidding with reserves, {Math.round(BUYERS_PREMIUM * 100)}% buyer&apos;s premium, and
          two-minute anti-sniping — persisted to Supabase.
        </p>
        {!userId && (
          <p className="mt-2 text-sm">
            <Link to="/login" className="underline">
              Sign in
            </Link>{" "}
            to place bids.
          </p>
        )}
      </header>

      {isLoading ? (
        <p className="p-8 text-center text-muted-foreground">Loading lots…</p>
      ) : !open ? (
        <div className="auc-grid">
          {lots.map((l) => (
            <button className={`lot ${l.status}`} key={l.id} onClick={() => setOpenId(l.id)}>
              <div className="lot-img">
                <img src={l.image || localImageForKey(l.id || l.title)} alt="" className="h-full w-full object-cover" />
                <span className="lot-code">{l.code}</span>
                <span className={`lot-status s-${l.status}`}>
                  {l.status === "live" ? "● Live" : l.status}
                </span>
              </div>
              <div className="lot-body">
                <div className="lot-artist">{l.artist}</div>
                <div className="lot-title">{l.title}</div>
                <div className="lot-est">
                  Est. {money(l.estimateLow)} – {money(l.estimateHigh)}
                </div>
                <div className="lot-bid-row">
                  <div>
                    <small>{l.bidCount ? "Current bid" : "Starting bid"}</small>
                    <b>{money(l.bidCount ? l.currentBid : l.startingBid)}</b>
                  </div>
                  <div className="lot-time">
                    {l.status === "live" ? countdown(l.endsAt) : l.status}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <LotDetail
          lot={open}
          userId={userId}
          displayName={displayName}
          onBack={() => setOpenId(null)}
          onRefresh={() => refetch()}
        />
      )}
      <SiteFooter />
    </div>
  );
}

function LotDetail({
  lot,
  userId,
  displayName,
  onBack,
  onRefresh,
}: {
  lot: LotRow;
  userId: string | null;
  displayName: string;
  onBack: () => void;
  onRefresh: () => void;
}) {
  const qc = useQueryClient();
  const fetchBids = useServerFn(listLotBids);
  const bidFn = useServerFn(placeAuctionBid);
  const winCheckout = useServerFn(getAuctionWinCheckout);
  const payFn = useServerFn(initializePayment);

  const { data: bidData } = useQuery({
    queryKey: ["auction-bids", lot.id],
    queryFn: () => fetchBids({ data: { lotId: lot.id } }),
    refetchInterval: 10_000,
  });

  const min = minNextBid(lot);
  const [amount, setAmount] = useState(min);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [, tick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => setAmount(minNextBid(lot)), [lot.currentBid, lot.bidCount, lot.id]);

  const leading = userId && lot.leadingBidderId === userId;
  const met = reserveMet(lot);
  const prem = buyersPremium(lot.currentBid || lot.startingBid);
  const closed = lot.status === "sold" || lot.status === "passed" || Date.now() >= lot.endsAt;
  const bids: Bid[] = bidData ?? [];

  const submit = async () => {
    if (!userId) {
      setMsg("Sign in to bid.");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await bidFn({ data: { lotId: lot.id, amount } });
      setMsg(
        res.extended
          ? "Bid placed — lot extended by 2 minutes (anti-sniping)."
          : "Bid placed successfully.",
      );
      onRefresh();
      qc.invalidateQueries({ queryKey: ["auction-bids", lot.id] });
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Bid failed");
    } finally {
      setBusy(false);
    }
  };

  const payHammer = async () => {
    if (!userId) return;
    setBusy(true);
    try {
      const win = await winCheckout({ data: { lotId: lot.id } });
      const pay = await payFn({
        data: {
          purpose: "auction_settlement",
          amountNgn: win.total,
          metadata: { lot_id: lot.id, title: win.title },
        },
      });
      if (pay.authorizationUrl) window.location.href = pay.authorizationUrl;
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="lotdetail">
      <button className="auc-back" onClick={onBack}>
        ‹ All lots
      </button>
      <div className="ld-grid">
        <div className="ld-img">
          <img src={lot.image || localImageForKey(lot.id || lot.title)} alt="" className="h-full w-full object-cover" />
          <span className="lot-code">{lot.code}</span>
        </div>
        <div className="ld-info">
          <div className="ld-artist">{lot.artist}</div>
          <h2>{lot.title}</h2>
          <div className="ld-medium">{lot.medium}</div>
          <p className="ld-desc">{lot.description}</p>

          <div className="ld-panel">
            <div className="ld-row">
              <span>{lot.bidCount ? "Current bid" : "Starting bid"}</span>
              <b>{money(lot.bidCount ? lot.currentBid : lot.startingBid)}</b>
            </div>
            <div className="ld-row sub">
              <span className={`reserve ${met ? "met" : ""}`}>
                {met ? "Reserve met" : "Reserve not met"}
              </span>
              <b className={closed ? "" : "live-time"}>
                {closed ? "Closed" : countdown(lot.endsAt)}
              </b>
            </div>

            {!closed && lot.status === "live" && (
              <>
                {leading && <div className="ld-leading">✓ You are the highest bidder</div>}
                <div className="ld-bidbox">
                  <div className="ld-steppers">
                    <button
                      type="button"
                      onClick={() =>
                        setAmount((a) =>
                          Math.max(min, a - increment(lot.currentBid || lot.startingBid)),
                        )
                      }
                    >
                      −
                    </button>
                    <div className="ld-amt">{money(amount)}</div>
                    <button
                      type="button"
                      onClick={() =>
                        setAmount((a) => a + increment(lot.currentBid || lot.startingBid))
                      }
                    >
                      +
                    </button>
                  </div>
                  <button className="ld-place" disabled={leading || busy} onClick={submit}>
                    Place bid
                  </button>
                </div>
              </>
            )}

            {lot.status === "sold" && leading && (
              <button className="ld-place mt-3" type="button" disabled={busy} onClick={payHammer}>
                Pay hammer + premium ({money(prem.total)})
              </button>
            )}

            {msg && <div className="ld-msg">{msg}</div>}

            <div className="ld-premium">
              <div className="ld-row total">
                <span>Total to pay (if you win)</span>
                <b>{money(prem.total)}</b>
              </div>
            </div>
          </div>

          {bids.length > 0 && (
            <div className="ld-history">
              <div className="ld-history-t">Bid history</div>
              {bids.map((b) => (
                <div className="ld-hist-row" key={b.id}>
                  <span>{b.bidderName}</span>
                  <span>{money(b.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
