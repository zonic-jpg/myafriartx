import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { X, Send, Sparkles, RefreshCw } from "lucide-react";

export type SponsoredItem = {
  id: string;
  kicker: string;
  title: string;
  summary: string;
  image: string;
  to: string;
};

export function AiChatPanel({
  open,
  onClose,
  sponsored,
}: {
  open: boolean;
  onClose: () => void;
  sponsored: SponsoredItem[];
}) {
  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat" }), []);
  const { messages, sendMessage, status, error } = useChat({ transport });
  const [input, setInput] = useState("");
  const [sponsorIdx, setSponsorIdx] = useState(0);
  const [sponsorTick, setSponsorTick] = useState(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Auto-flip sponsored pane every 20s
  useEffect(() => {
    if (!open || sponsored.length === 0) return;
    const id = setInterval(() => {
      setSponsorIdx((i) => (i + 1) % sponsored.length);
    }, 20000);
    return () => clearInterval(id);
  }, [open, sponsored.length, sponsorTick]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 60);
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  if (!open) return null;

  const isLoading = status === "submitted" || status === "streaming";
  const sponsor = sponsored[sponsorIdx];

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    sendMessage({ text });
    setInput("");
  };

  const loadNewSponsored = () => {
    setSponsorIdx((i) => (i + 1) % Math.max(sponsored.length, 1));
    setSponsorTick((t) => t + 1);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close chat"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <div className="relative flex h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-background shadow-2xl sm:h-[78vh] sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium tracking-tight">MyAfriArt Concierge</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Sponsored pane */}
        {sponsor && (
          <div className="border-b border-border bg-muted/40 px-5 py-3">
            <div className="flex items-center justify-between pb-2">
              <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Sponsored · {sponsor.kicker}
              </span>
              <button
                type="button"
                onClick={loadNewSponsored}
                className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground transition hover:border-foreground hover:text-foreground"
              >
                <RefreshCw className="h-3 w-3" />
                Load sponsored
              </button>
            </div>
            <a
              href={sponsor.to}
              className="group flex items-center gap-3 rounded-xl bg-background p-2 ring-1 ring-border transition hover:ring-foreground/40"
            >
              <img
                src={sponsor.image}
                alt={sponsor.title}
                className="h-14 w-14 flex-none rounded-lg object-cover"
                loading="lazy"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{sponsor.title}</p>
                <p className="line-clamp-1 text-xs text-muted-foreground">{sponsor.summary}</p>
              </div>
              <span className="text-xs text-muted-foreground group-hover:text-foreground">→</span>
            </a>
          </div>
        )}

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {messages.length === 0 && (
            <div className="pt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Ask about artists, pieces, auctions, or how artstage works.
              </p>
            </div>
          )}
          {messages.map((m: UIMessage) => {
            const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
            const isUser = m.role === "user";
            return (
              <div key={m.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap text-sm leading-relaxed ${
                    isUser
                      ? "rounded-2xl bg-primary px-4 py-2 text-primary-foreground"
                      : "text-foreground"
                  }`}
                >
                  {text}
                </div>
              </div>
            );
          })}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:120ms]" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:240ms]" />
              </div>
            </div>
          )}
          {error && <p className="text-xs text-destructive">Something went wrong. Try again.</p>}
        </div>

        {/* Composer */}
        <form onSubmit={onSubmit} className="border-t border-border px-5 py-3">
          <div className="flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 focus-within:border-foreground/60">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message the concierge…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              aria-label="Send"
              className="rounded-full bg-primary p-1.5 text-primary-foreground transition disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
