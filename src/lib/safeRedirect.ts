/**
 * Post-sign-in redirect target. Same-site relative paths only (query string and
 * hash kept, e.g. /admin?tab=approvals) — never absolute / protocol-relative
 * URLs, and never a bounce back to the login page itself.
 */
export function safeRedirect(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!v.startsWith("/") || v.startsWith("//") || v.startsWith("/\\")) return null;
  if (/^\/(login|auth)(\/|\?|#|$)/.test(v)) return null;
  return v;
}
