// Key-free concierge: answers from the catalogue and routes to the right page,
// so visitors never see a setup message when no AI provider is configured.
const ROUTES = [
  { re: /(auction|bid|live)/i, text: "The Live Auction is at /auction. Open a lot, place a bid, and you'll see the countdown and current high bid live." },
  { re: /(sale|lounge|buy|purchase|price|cost|checkout)/i, text: "Browse works for sale in the Sale Lounge at /lounge. Open any piece to see its price, certificate and checkout." },
  { re: /(studio|room|wall|preview|stage|frame)/i, text: "Try the Studio at /studio: upload a photo of your room and place a work on your wall at true scale before you buy." },
  { re: /(event|exhibit|show|fair)/i, text: "Upcoming exhibitions and events are listed at /events." },
  { re: /(submit|sell|become.*artist|join.*artist|apply)/i, text: "Artists can apply and submit work at /submit. Verification is handled at /verification." },
  { re: /(verify|certificate|authentic|provenance|fake)/i, text: "Every piece carries a certificate you can check at /verify/cert/<code>, and /verification explains how artists are vetted." },
  { re: /(dispute|refund|problem|complain|return)/i, text: "For an order problem, open /disputes and describe what happened; the team will review it." },
  { re: /(sign ?in|log ?in|sign ?up|register|account)/i, text: "You can sign in or create an account at /login." },
];

export function conciergeFallback(messages, catalogue) {
  const last = [...(Array.isArray(messages) ? messages : [])].reverse().find((m) => m && m.role === "user");
  const q =
    (last?.parts ?? []).filter((p) => p?.type === "text").map((p) => p.text).join(" ").trim() ||
    (typeof last?.content === "string" ? last.content : "");
  const words = q.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);
  const lines = (Array.isArray(catalogue) ? catalogue : []).filter((l) => typeof l === "string");
  const hits = words.length
    ? lines
        .map((l) => ({ l, s: words.filter((w) => l.toLowerCase().includes(w)).length }))
        .filter((x) => x.s > 0)
        .sort((a, b) => b.s - a.s)
        .slice(0, 4)
        .map((x) => x.l)
    : [];
  const out = [];
  if (hits.length) out.push("Here's what matches on MyAfriArt right now:\n" + hits.map((h) => "- " + h).join("\n"));
  for (const r of ROUTES) if (r.re.test(q) && out.length < 3) out.push(r.text);
  if (!out.length) {
    out.push(
      "I can help you explore MyAfriArt. Pick a direction:\n- Discover artists and pieces on the home page\n- Stage a work on your own wall in the Studio (/studio)\n- Bid in the Live Auction (/auction)\n- Shop the Sale Lounge (/lounge)\n- See upcoming events (/events)\nTell me an artist, a style or a budget and I'll point you to it.",
    );
  }
  return out.join("\n\n");
}
