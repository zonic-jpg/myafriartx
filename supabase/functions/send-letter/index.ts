// Sends one MyAfriArt letter by email. Called only by the site's own server (never the browser):
// the caller must present this project's server key, which is checked against the admin API.
// The sender address is fixed here; the site decides who may send (administrators only).
const FROM = "MyAfriArt <noreply@zonicme.com.ng>";
const EMAIL = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']{2,}$/;
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

async function isServerKey(key: string): Promise<boolean> {
  const base = Deno.env.get("SUPABASE_URL");
  if (!base || key.length < 20) return false;
  try {
    const r = await fetch(`${base}/auth/v1/admin/users?per_page=1`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    await r.body?.cancel();
    return r.status === 200;
  } catch (_) { return false; }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ ok: false, error: "method" }, 405);
  const key = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim() || (req.headers.get("apikey") || "").trim();
  if (!(await isServerKey(key))) return json({ ok: false, error: "not allowed" }, 403);
  let b: Record<string, unknown> = {};
  try { b = await req.json(); } catch (_) { return json({ ok: false, error: "bad request" }, 400); }
  const to = String(b.to || "").trim(), subject = String(b.subject || "").trim(), html = String(b.html || "");
  const replyTo = String(b.reply_to || "").trim();
  if (!EMAIL.test(to) || to.length > 254) return json({ ok: false, error: "The recipient address is not valid." });
  if (!subject || subject.length > 300) return json({ ok: false, error: "The subject is missing or too long." });
  if (!html || html.length > 100_000) return json({ ok: false, error: "The letter is empty or too long." });
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) return json({ ok: false, error: "Email sending is not set up." });
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [to], subject, html, ...(EMAIL.test(replyTo) ? { reply_to: replyTo } : {}) }),
    });
    const out = await r.json().catch(() => ({}));
    if (!r.ok || out?.error || !out?.id) return json({ ok: false, error: String(out?.message || out?.error?.message || `The email service answered ${r.status}.`).slice(0, 200) });
    return json({ ok: true, id: out.id });
  } catch (_) {
    return json({ ok: false, error: "The email service could not be reached." });
  }
});
