/**
 * Server-only core of the owner notification (see signup-approval.functions.ts).
 * Kept separate from the server-fn wrapper so it can be unit-tested with fakes.
 *
 * Guarantees:
 *  - recipient is the founding owner constant, never caller-supplied;
 *  - one email per pending row: the row is claimed atomically by setting
 *    notified_at where it is still null (a second concurrent call claims nothing);
 *  - a global hourly cap stops floods;
 *  - soft-fails (never throws, returns { sent:false, reason }) when
 *    RESEND_API_KEY is absent or the provider errors (claim released on error).
 */
import { FOUNDING_OWNER_EMAIL } from "./foundingOwner";

export const APP_NAME = "MyAfriArt";
export const DEFAULT_APP_URL = "https://myafriartx.netlify.app";
export const APPROVALS_PATH = "/admin?tab=approvals";
export const HOURLY_CAP = 20;
const DEFAULT_FROM = "MyAfriArt <partnerships@myafriart.com>";

export type NotifyResult = { sent: boolean; reason?: string };
export type NotifyEnv = { resendKey?: string; from?: string; appUrl?: string };

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Minimal structural type for the bits of the supabase-js admin client used here. */
type Admin = { from: (table: string) => any };

export function approvalsLink(appUrl?: string): string {
  const base = (appUrl && /^https?:\/\//i.test(appUrl) ? appUrl : DEFAULT_APP_URL).replace(/\/+$/, "");
  return `${base}${APPROVALS_PATH}`;
}

export async function notifyOwnerForUser(
  admin: Admin,
  userId: string,
  kind: "signup" | "admin_request",
  env: NotifyEnv,
  fetchImpl: typeof fetch = fetch,
  now: () => number = Date.now,
): Promise<NotifyResult> {
  const notifiedCol = kind === "signup" ? "notified_at" : "admin_notified_at";

  const { data: row } = await admin
    .from("signup_approvals")
    .select("user_id,email,status,notified_at,admin_requested_at,admin_notified_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (!row) return { sent: false, reason: "nothing to notify" };
  if (kind === "signup" && (row.status !== "pending" || row.notified_at)) {
    return { sent: false, reason: "nothing to notify" };
  }
  if (kind === "admin_request" && (!row.admin_requested_at || row.admin_notified_at)) {
    return { sent: false, reason: "nothing to notify" };
  }
  // The owner never needs an email about themselves.
  if (String(row.email).toLowerCase() === FOUNDING_OWNER_EMAIL) return { sent: false, reason: "owner" };

  if (!env.resendKey) return { sent: false, reason: "email not configured (RESEND_API_KEY missing)" };

  // Global flood cap.
  const hourAgo = new Date(now() - 3_600_000).toISOString();
  const [a, b] = await Promise.all([
    admin.from("signup_approvals").select("user_id", { count: "exact", head: true }).gte("notified_at", hourAgo),
    admin.from("signup_approvals").select("user_id", { count: "exact", head: true }).gte("admin_notified_at", hourAgo),
  ]);
  if ((a.count ?? 0) + (b.count ?? 0) >= HOURLY_CAP) return { sent: false, reason: "rate limited" };

  // Claim atomically so concurrent calls cannot double-send.
  const { data: claimed } = await admin
    .from("signup_approvals")
    .update({ [notifiedCol]: new Date(now()).toISOString() })
    .eq("user_id", userId)
    .is(notifiedCol, null)
    .select("user_id");
  if (!claimed || claimed.length === 0) return { sent: false, reason: "already notified" };

  const release = () =>
    admin.from("signup_approvals").update({ [notifiedCol]: null }).eq("user_id", userId);

  const who = String(row.email);
  const link = approvalsLink(env.appUrl);
  const what = kind === "signup" ? "a new sign-up" : "an admin-access request";
  const html = `<div style="font-family:system-ui,sans-serif;max-width:480px">
    <h2 style="margin:0 0 8px">${esc(APP_NAME)}: approval needed</h2>
    <p><b>${esc(who)}</b> is waiting — ${what}.</p>
    <p><a href="${esc(link)}" style="display:inline-block;background:#111;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">Review &amp; approve</a></p>
    <p style="color:#666;font-size:12px">You'll be asked to sign in if needed, then land straight on the approvals page.<br>${esc(link)}</p></div>`;

  try {
    const res = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: env.from || DEFAULT_FROM,
        to: [FOUNDING_OWNER_EMAIL],
        subject: `${APP_NAME}: ${who} is waiting for approval`,
        html,
      }),
    });
    if (!res.ok) {
      await release();
      return { sent: false, reason: `email provider ${res.status}` };
    }
    return { sent: true };
  } catch {
    await release();
    return { sent: false, reason: "email provider unreachable" };
  }
}
