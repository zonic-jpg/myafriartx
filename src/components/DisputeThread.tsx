import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { listDisputeMessages, postDisputeMessage } from "@/lib/disputes.functions";

type Msg = { id: string; sender_role: string; body: string; created_at: string };

/** Two-way message thread on a dispute. `viewer` decides which side is "You". */
export function DisputeThread({ disputeId, viewer }: { disputeId: string; viewer: "member" | "admin" }) {
  const listFn = useServerFn(listDisputeMessages);
  const postFn = useServerFn(postDisputeMessage);
  const [msgs, setMsgs] = useState<Msg[] | null>(null);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const load = () =>
    listFn({ data: { disputeId } })
      .then((r) => setMsgs(r as Msg[]))
      .catch(() => setMsgs((prev) => prev ?? []));

  useEffect(() => {
    load();
  }, [disputeId]);

  // Poll only while the thread is open and the tab is visible.
  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 15000);
    return () => clearInterval(t);
  }, [open, disputeId]);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: "nearest" });
  }, [msgs, open]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    try {
      await postFn({ data: { disputeId, body: body.trim() } });
      setBody("");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send message");
    } finally {
      setBusy(false);
    }
  };

  const count = msgs?.length ?? 0;
  const lastFromOther = msgs && msgs.length > 0 && msgs[msgs.length - 1].sender_role !== viewer;

  return (
    <div className="mt-3 rounded border border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
      >
        <span>
          Messages{count ? ` (${count})` : ""}
          {lastFromOther && !open && (
            <span className="ml-2 rounded bg-primary px-1.5 py-0.5 text-[10px] normal-case text-primary-foreground">
              New reply
            </span>
          )}
        </span>
        <span>{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="border-t border-border p-3">
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {(msgs ?? []).map((m) => {
              const mine = m.sender_role === viewer;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                  >
                    <p className="mb-0.5 text-[10px] uppercase tracking-wide opacity-70">
                      {mine ? "You" : m.sender_role === "admin" ? "MyAfriArt team" : "Member"}
                    </p>
                    <p className="whitespace-pre-wrap">{m.body}</p>
                    <p className="mt-1 text-[10px] opacity-60">{new Date(m.created_at).toLocaleString()}</p>
                  </div>
                </div>
              );
            })}
            {msgs && msgs.length === 0 && (
              <p className="py-3 text-center text-xs text-muted-foreground">
                No messages yet — {viewer === "admin" ? "write to the member below." : "ask the team a question or add details."}
              </p>
            )}
            <div ref={endRef} />
          </div>
          <form onSubmit={send} className="mt-3 flex gap-2">
            <input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={2000}
              placeholder={viewer === "admin" ? "Message the member…" : "Write to the team…"}
              className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <button
              disabled={busy || !body.trim()}
              className="rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50"
            >
              {busy ? "Sending…" : "Send"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
