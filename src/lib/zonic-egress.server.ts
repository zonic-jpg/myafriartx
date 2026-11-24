/**
 * Server-side report to the ZonicMe hub.
 * Fire-and-forget: it never delays or fails a request, and it carries no identity, no names and no prices
 * (the server cannot see the visitor's cross-app consent, so it sends only anonymous counts-style events).
 */
const INGEST = "https://qdhlbplzdblcvvaaluwu.supabase.co/functions/v1/zonic-hub-ingest";

export function zonicEmit(name: string, attrs: Record<string, string | number | boolean | null> = {}): void {
  try {
    const ts = new Date().toISOString();
    const body = {
      app: "myafriart",
      session: `srv-${Date.now().toString(36)}`,
      events: [{ name, ts, attrs, app: "myafriart" }],
    };
    void fetch(INGEST, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(4000),
    }).catch(() => undefined);
  } catch {
    /* never throw */
  }
}
