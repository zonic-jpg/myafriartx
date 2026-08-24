import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { recordEntryClick } from "@/lib/entry-clicks.functions";
import { useSessionId } from "@/hooks/use-session-id";
import { localImageForKey } from "@/lib/local-image-assets";
import {
  listListings,
  createListing,
  closeListing,
  openThread,
  listMyThreads,
  getThread,
  sendMessage,
  requestBrokerage,
  getBrokerFee,
} from "@/lib/lounge.functions";
import { getThreadEscrow } from "@/lib/escrow.functions";
import { initializePayment } from "@/lib/payments.functions";
import { toast } from "sonner";

const loungeSearchSchema = z.object({
  tab: fallback(z.enum(["sell", "buy", "threads"]), "sell").default("sell"),
});

export const Route = createFileRoute("/lounge")({
  validateSearch: zodValidator(loungeSearchSchema),
  head: () => ({
    meta: [
      { title: "The Art Lounge — MyAfriart" },
      {
        name: "description",
        content:
          "A private floor for registered buyers and sellers. Browse listings, message members, and use our broker service.",
      },
      { property: "og:title", content: "The Art Lounge — MyAfriart" },
      { property: "og:description", content: "A private floor for registered buyers and sellers." },
    ],
  }),
  component: LoungePage,
});

type Listing = Awaited<ReturnType<typeof listListings>>[number];
type ThreadDetail = Awaited<ReturnType<typeof getThread>>;
type ThreadSummary = Awaited<ReturnType<typeof listMyThreads>>[number];

function LoungePage() {
  const search = Route.useSearch();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [entered, setEntered] = useState(false);
  const navigate = useNavigate();
  const sessionId = useSessionId();
  const recordClick = useServerFn(recordEntryClick);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setAuthed(!!s);
      setUserId(s?.user?.id ?? null);
    });
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session);
      setUserId(data.session?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-black">
      {/* Doors */}
      <div
        className={`absolute inset-y-0 left-0 z-20 w-1/2 border-r border-amber-500/30 bg-gradient-to-r from-black via-zinc-900 to-stone-800 transition-transform duration-[1200ms] ease-[cubic-bezier(0.65,0,0.35,1)] ${entered ? "-translate-x-full" : "translate-x-0"}`}
      >
        <div className="absolute right-0 top-1/2 h-24 w-1 -translate-y-1/2 rounded-l bg-amber-400/60" />
      </div>
      <div
        className={`absolute inset-y-0 right-0 z-20 w-1/2 border-l border-amber-500/30 bg-gradient-to-l from-black via-zinc-900 to-stone-800 transition-transform duration-[1200ms] ease-[cubic-bezier(0.65,0,0.35,1)] ${entered ? "translate-x-full" : "translate-x-0"}`}
      >
        <div className="absolute left-0 top-1/2 h-24 w-1 -translate-y-1/2 rounded-r bg-amber-400/60" />
      </div>

      {/* Interior */}
      <div
        className={`relative z-10 h-full w-full overflow-auto bg-gradient-to-b from-stone-900 via-zinc-950 to-black text-stone-100 transition-opacity duration-700 ${entered ? "opacity-100" : "opacity-0"}`}
      >
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-amber-400/20 bg-black/70 px-3 py-2.5 backdrop-blur sm:px-4 sm:py-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.3em] text-amber-400 sm:text-[11px]">
              Sale Lounge
            </p>
            <h1 className="font-display text-lg text-amber-100 sm:text-xl md:text-2xl truncate">
              Welcome inside.
            </h1>
          </div>
          <div className="flex flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-2">
            <button
              onClick={() => window.location.reload()}
              className="rounded-md border border-amber-400/40 px-3 py-1.5 text-[11px] text-amber-200 hover:bg-amber-400/10"
              title="Reload page"
            >
              ↻ Refresh
            </button>
            <Link
              to="/studio"
              onClick={() => {
                if (!sessionId) return;
                recordClick({
                  data: {
                    entry_point: "stage_virtually",
                    location: "lounge_header",
                    session_id: sessionId,
                    user_id: userId,
                  },
                }).catch(() => {});
              }}
              className="rounded-md border border-emerald-400/40 bg-emerald-400/5 px-3 py-2 text-xs font-medium text-emerald-200 hover:bg-emerald-400/10 min-h-[40px] flex items-center sm:min-h-0"
            >
              Stage virtually →
            </Link>
            <Link
              to="/"
              className="rounded-md border border-amber-400/40 px-3 py-1.5 text-[11px] text-amber-200 hover:bg-amber-400/10"
            >
              ← Back
            </Link>
          </div>
        </div>

        {authed === null ? (
          <div className="p-10 text-center text-stone-400">Opening doors…</div>
        ) : !authed ? (
          <SignInGate onSignIn={() => navigate({ to: "/login" })} />
        ) : (
          <LoungeInterior initialTab={search.tab} />
        )}
      </div>
    </div>
  );
}

function SignInGate({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div className="mx-auto mt-16 max-w-md rounded-lg border border-amber-400/20 bg-white/5 p-8 text-center backdrop-blur">
      <h2 className="font-display text-2xl text-amber-100">Members only</h2>
      <p className="mt-3 text-sm text-stone-300">
        The lounge is reserved for registered members buying or selling art. Sign in to view private
        listings, message owners, and request brokerage with verification, delivery monitoring, and
        a certificate of authenticity.
      </p>
      <button
        onClick={onSignIn}
        className="mt-6 rounded-md bg-amber-400 px-5 py-2.5 text-sm font-medium text-black hover:bg-amber-300"
      >
        Sign in to enter
      </button>
    </div>
  );
}

function LoungeInterior({ initialTab }: { initialTab: "sell" | "buy" | "threads" }) {
  const fetchListings = useServerFn(listListings);
  const fetchThreads = useServerFn(listMyThreads);
  const openThreadFn = useServerFn(openThread);
  const closeListingFn = useServerFn(closeListing);
  const [tab, setTab] = useState<"sell" | "buy" | "threads">("sell");
  const [listings, setListings] = useState<Listing[]>([]);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState<null | "sell" | "buy">(null);
  const [me, setMe] = useState<string | null>(null);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  const refreshListings = () => {
    fetchListings({ data: { type: tab === "threads" ? "all" : tab } })
      .then(setListings)
      .catch(() => {});
  };
  const refreshThreads = () => {
    fetchThreads()
      .then(setThreads)
      .catch(() => {});
  };

  useEffect(() => {
    if (tab === "threads") refreshThreads();
    else refreshListings();
  }, [tab]);

  const filtered = useMemo(
    () => listings.filter((l) => tab === "threads" || l.type === tab),
    [listings, tab],
  );

  return (
    <div className="grid h-[calc(100vh-72px)] grid-cols-1 md:grid-cols-[360px_1fr]">
      {/* Left rail */}
      <aside className="overflow-y-auto border-r border-amber-400/10 bg-black/40 p-3">
        <div className="mb-3 flex gap-1 rounded-md border border-amber-400/20 p-1 text-xs">
          {(
            [
              ["sell", "Selling"],
              ["buy", "Buying"],
              ["threads", "My chats"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`flex-1 rounded px-2 py-1.5 ${tab === k ? "bg-amber-400 text-black" : "text-stone-300 hover:bg-white/5"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab !== "threads" && (
          <button
            onClick={() => setShowCreate(tab)}
            className="mb-3 w-full rounded-md border border-amber-400/40 px-3 py-2 text-xs font-medium text-amber-200 hover:bg-amber-400/10"
          >
            + Post {tab === "sell" ? "a piece for sale" : "a piece you're looking for"}
          </button>
        )}

        {tab === "threads" ? (
          <ThreadList threads={threads} activeId={activeThreadId} onPick={setActiveThreadId} />
        ) : (
          <ListingList
            listings={filtered}
            me={me}
            onMessage={async (listingId) => {
              try {
                const { id } = await openThreadFn({ data: { listing_id: listingId } });
                setActiveThreadId(id);
                setTab("threads");
                refreshThreads();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Something went wrong");
              }
            }}
            onClose={async (id) => {
              try {
                await closeListingFn({ data: { id } });
                refreshListings();
                toast.success("Listing closed");
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Something went wrong");
              }
            }}
          />
        )}
      </aside>

      {/* Right pane */}
      <section className="overflow-hidden bg-zinc-950/40">
        {activeThreadId && tab === "threads" ? (
          <ThreadView threadId={activeThreadId} onChanged={refreshThreads} />
        ) : (
          <EmptyState />
        )}
      </section>

      {showCreate && (
        <CreateListingModal
          kind={showCreate}
          onClose={() => setShowCreate(null)}
          onCreated={() => {
            setShowCreate(null);
            refreshListings();
          }}
        />
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full items-center justify-center p-10 text-center text-sm text-stone-500">
      Pick a listing on the left to start a private chat, or open “My chats” to continue an existing
      conversation.
    </div>
  );
}

function ListingList({
  listings,
  me,
  onMessage,
  onClose,
}: {
  listings: Listing[];
  me: string | null;
  onMessage: (id: string) => void;
  onClose: (id: string) => void;
}) {
  if (!listings.length)
    return <p className="px-2 py-6 text-center text-xs text-stone-500">No open listings yet.</p>;
  return (
    <ul className="space-y-2">
      {listings.map((l, index) => (
        <li key={l.id} className="rounded-md border border-white/5 bg-white/[0.03] p-3">
          <div className="flex items-start gap-3">
            <img
              src={localImageForKey(l.id || l.title, index)}
              alt=""
              className="h-14 w-14 rounded object-cover"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${l.type === "sell" ? "bg-emerald-500/20 text-emerald-300" : "bg-sky-500/20 text-sky-300"}`}
                >
                  {l.type === "sell" ? "Selling" : "Looking"}
                </span>
                <span className="truncate font-display text-sm text-amber-100">{l.title}</span>
              </div>
              <p className="mt-1 text-xs text-stone-400">
                {l.member_name} · {l.medium || "—"} ·{" "}
                {l.price != null ? `${l.currency} ${l.price}` : "open"}
              </p>
              {l.notes && <p className="mt-1 line-clamp-2 text-xs text-stone-400">{l.notes}</p>}
              <div className="mt-2 flex gap-2">
                {l.member_id === me ? (
                  <button
                    onClick={() => onClose(l.id)}
                    className="rounded border border-stone-600 px-2 py-1 text-[11px] text-stone-300 hover:bg-white/5"
                  >
                    Close listing
                  </button>
                ) : (
                  <button
                    onClick={() => onMessage(l.id)}
                    className="rounded bg-amber-400 px-2.5 py-1 text-[11px] font-medium text-black hover:bg-amber-300"
                  >
                    Message
                  </button>
                )}
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function ThreadList({
  threads,
  activeId,
  onPick,
}: {
  threads: ThreadSummary[];
  activeId: string | null;
  onPick: (id: string) => void;
}) {
  if (!threads.length)
    return <p className="px-2 py-6 text-center text-xs text-stone-500">No conversations yet.</p>;
  return (
    <ul className="space-y-1">
      {threads.map((t) => (
        <li key={t.id}>
          <button
            onClick={() => onPick(t.id)}
            className={`w-full rounded-md border px-3 py-2 text-left text-xs ${activeId === t.id ? "border-amber-400/60 bg-amber-400/10" : "border-white/5 bg-white/[0.03] hover:bg-white/5"}`}
          >
            <div className="font-display text-sm text-amber-100">
              {t.listing?.title ?? "(listing removed)"}
            </div>
            <div className="text-stone-400">
              with {t.other_name} · you are {t.you_are}
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

function CreateListingModal({
  kind,
  onClose,
  onCreated,
}: {
  kind: "sell" | "buy";
  onClose: () => void;
  onCreated: () => void;
}) {
  const create = useServerFn(createListing);
  const [title, setTitle] = useState("");
  const [medium, setMedium] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await create({
        data: {
          type: kind,
          title,
          medium: medium || null,
          price: price ? Number(price) : null,
          currency,
          notes: notes || null,
        },
      });
      toast.success("Listing posted");
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="w-full max-w-md space-y-3 rounded-lg border border-amber-400/30 bg-stone-900 p-5 text-sm text-stone-100"
      >
        <h3 className="font-display text-lg text-amber-100">
          {kind === "sell" ? "Post a piece for sale" : "Post a piece you're looking for"}
        </h3>
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="w-full rounded border border-white/10 bg-black/40 px-3 py-2"
        />
        <input
          value={medium}
          onChange={(e) => setMedium(e.target.value)}
          placeholder="Medium (e.g. Oil on canvas)"
          className="w-full rounded border border-white/10 bg-black/40 px-3 py-2"
        />
        <div className="flex gap-2">
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            type="number"
            min="0"
            placeholder={kind === "sell" ? "Asking price" : "Budget"}
            className="flex-1 rounded border border-white/10 bg-black/40 px-3 py-2"
          />
          <input
            value={currency}
            onChange={(e) => setCurrency(e.target.value.toUpperCase())}
            maxLength={4}
            className="w-20 rounded border border-white/10 bg-black/40 px-3 py-2"
          />
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (provenance, condition, what you're after…)"
          rows={3}
          className="w-full rounded border border-white/10 bg-black/40 px-3 py-2"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-white/20 px-3 py-1.5 text-xs"
          >
            Cancel
          </button>
          <button
            disabled={busy}
            className="rounded bg-amber-400 px-3 py-1.5 text-xs font-medium text-black disabled:opacity-50"
          >
            {busy ? "Posting…" : "Post"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ThreadView({ threadId, onChanged }: { threadId: string; onChanged: () => void }) {
  const fetchThread = useServerFn(getThread);
  const send = useServerFn(sendMessage);
  const reqBroker = useServerFn(requestBrokerage);
  const fetchFee = useServerFn(getBrokerFee);
  const fetchEscrow = useServerFn(getThreadEscrow);
  const payFn = useServerFn(initializePayment);
  const [detail, setDetail] = useState<ThreadDetail | null>(null);
  const [escrow, setEscrow] = useState<Record<string, unknown> | null>(null);
  const [body, setBody] = useState("");
  const [showBrokerForm, setShowBrokerForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [fee, setFee] = useState<number>(5);
  const [paying, setPaying] = useState(false);

  const refresh = () =>
    fetchThread({ data: { thread_id: threadId } })
      .then(setDetail)
      .catch(() => {});
  const refreshEscrow = () =>
    fetchEscrow({ data: { threadId } })
      .then(setEscrow)
      .catch(() => setEscrow(null));

  useEffect(() => {
    refresh();
    refreshEscrow();
    fetchFee().then((f) => setFee(f.fee_percent));
  }, [threadId]);

  useEffect(() => {
    const ch = supabase
      .channel(`thread:${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `thread_id=eq.${threadId}`,
        },
        () => refresh(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "broker_requests",
          filter: `thread_id=eq.${threadId}`,
        },
        () => refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [threadId]);

  if (!detail) return <div className="p-10 text-center text-sm text-stone-500">Loading…</div>;
  const { listing, messages, broker_request, other_name } = detail;
  const meId =
    detail.thread.buyer_id === detail.thread.seller_id
      ? null
      : detail.thread.you_are === "buyer"
        ? detail.thread.buyer_id
        : detail.thread.seller_id;
  const isBuyer = detail.thread.you_are === "buyer";
  const canEscrow =
    isBuyer &&
    listing?.type === "sell" &&
    listing.price != null &&
    Number(listing.price) > 0 &&
    !escrow;

  const onEscrowPay = async () => {
    if (!listing?.price || !listing.id) return;
    setPaying(true);
    try {
      const amountNgn = Math.round(Number(listing.price));
      const res = await payFn({
        data: {
          purpose: "artwork_purchase",
          amountNgn,
          metadata: {
            escrow: "true",
            thread_id: threadId,
            listing_id: listing.id,
            seller_id: detail.thread.seller_id,
            title: listing.title ?? "",
          },
        },
      });
      if (res.authorizationUrl) window.location.href = res.authorizationUrl;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Escrow payment failed");
    } finally {
      setPaying(false);
    }
  };

  const onSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    const text = body;
    setBody("");
    try {
      await send({ data: { thread_id: threadId, body: text } });
      refresh();
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
      setBody(text);
    }
  };

  const submitBroker = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("Enter a positive amount");
    try {
      await reqBroker({
        data: {
          thread_id: threadId,
          transaction_amount: amt,
          currency: listing?.currency || "USD",
        },
      });
      toast.success("Brokerage requested — an admin will review.");
      setShowBrokerForm(false);
      setAmount("");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-white/10 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-amber-400">Conversation</p>
            <h2 className="font-display text-lg text-amber-100">
              {listing?.title ?? "(listing removed)"}
            </h2>
            <p className="text-xs text-stone-400">
              with {other_name} ·{" "}
              {listing
                ? `${listing.type === "sell" ? "Selling" : "Looking"} · ${listing.price != null ? `${listing.currency} ${listing.price}` : "open price"}`
                : ""}
            </p>
          </div>
          <BrokerPanel request={broker_request} fee={fee} onAsk={() => setShowBrokerForm(true)} />
        </div>
        {escrow && (
          <div className="mt-3 rounded border border-emerald-400/30 bg-emerald-400/5 p-3 text-xs text-emerald-100">
            Escrow hold: ₦{Number(escrow.amount_ngn).toLocaleString()} · {String(escrow.status)}
          </div>
        )}
        {canEscrow && (
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              disabled={paying}
              onClick={onEscrowPay}
              className="rounded bg-emerald-500 px-3 py-1.5 text-xs font-medium text-black disabled:opacity-50"
            >
              {paying ? "Redirecting…" : `Pay via escrow · ${listing?.currency} ${listing?.price}`}
            </button>
            <span className="text-[10px] text-stone-500">Funds held until admin release</span>
          </div>
        )}
        {showBrokerForm && (
          <form
            onSubmit={submitBroker}
            className="mt-3 flex flex-wrap items-end gap-2 rounded border border-amber-400/30 bg-amber-400/5 p-3 text-xs"
          >
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-amber-300">
                Agreed amount
              </label>
              <input
                type="number"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1 rounded border border-white/10 bg-black/40 px-2 py-1 text-sm"
                placeholder="0.00"
              />
            </div>
            <div className="text-stone-300">
              Fee at <strong>{fee}%</strong> = {listing?.currency || "USD"}{" "}
              {((Number(amount || 0) * fee) / 100).toFixed(2)}
            </div>
            <button className="ml-auto rounded bg-amber-400 px-3 py-1.5 text-black">
              Submit request
            </button>
            <button
              type="button"
              onClick={() => setShowBrokerForm(false)}
              className="rounded border border-white/20 px-3 py-1.5"
            >
              Cancel
            </button>
          </form>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-2">
          {messages.map((m) => {
            const mine = m.sender_id === meId;
            return (
              <li key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-amber-400 text-black" : "bg-white/10 text-stone-100"}`}
                >
                  {m.body}
                  <div className={`mt-1 text-[10px] ${mine ? "text-black/60" : "text-stone-400"}`}>
                    {new Date(m.created_at).toLocaleString()}
                  </div>
                </div>
              </li>
            );
          })}
          {!messages.length && (
            <p className="py-10 text-center text-xs text-stone-500">No messages yet — say hello.</p>
          )}
        </ul>
      </div>

      <form onSubmit={onSend} className="border-t border-white/10 p-3">
        <div className="flex gap-2">
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write a message…"
            className="flex-1 rounded border border-white/10 bg-black/40 px-3 py-2 text-sm"
          />
          <button className="rounded bg-amber-400 px-4 py-2 text-sm font-medium text-black">
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

function BrokerPanel({
  request,
  fee,
  onAsk,
}: {
  request: ThreadDetail["broker_request"];
  fee: number;
  onAsk: () => void;
}) {
  if (!request) {
    return (
      <div className="text-right">
        <button
          onClick={onAsk}
          className="rounded border border-amber-400/40 px-3 py-1.5 text-xs text-amber-200 hover:bg-amber-400/10"
        >
          Request brokerage
        </button>
        <p className="mt-1 text-[10px] text-stone-500">
          Verification · delivery · certificate · {fee}% fee
        </p>
      </div>
    );
  }
  const labels: Record<string, string> = {
    requested: "Requested — awaiting admin",
    accepted: "Accepted",
    rejected: "Rejected",
    verified: "Verified",
    in_transit: "In transit",
    delivered: "Delivered",
    certified: "Certified",
    closed: "Closed",
  };
  return (
    <div className="rounded border border-amber-400/30 bg-amber-400/5 p-2 text-right text-xs text-amber-100">
      <div className="font-medium">{labels[request.status]}</div>
      <div className="text-stone-300">
        {request.currency} {Number(request.transaction_amount ?? 0).toFixed(2)} · fee{" "}
        {Number(request.fee_percent ?? 0)}% = {Number(request.fee_amount ?? 0).toFixed(2)}
      </div>
      {request.carrier && (
        <div className="text-stone-400">
          {request.carrier} {request.tracking_ref}
        </div>
      )}
      {request.certificate_url && (
        <a
          href={request.certificate_url}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-block rounded bg-amber-400 px-2 py-1 text-[11px] text-black"
        >
          Download certificate
        </a>
      )}
    </div>
  );
}
