/**
 * Visitor-safe error text (Zonic orbit convention, ported from MyYangaX dcd484a).
 *
 * Internal auth plumbing leaks otherwise: a missing JWT surfaces as
 * "Unauthorized: No authorization header provided" and an RLS denial as
 * "new row violates row-level security policy for table ...". Neither means
 * anything to a visitor, and both look like the site is broken.
 *
 * Admins on a soft orbit session (no JWT) still see the raw message in the
 * console; visitor surfaces always get something they can act on.
 */

type Pattern = { test: RegExp; message: string };

const PATTERNS: Pattern[] = [
  {
    test: /unauthori[sz]ed|no authorization header|invalid token|jwt|not authenticated|auth session missing/i,
    message: "Your session has expired. Sign in again to continue.",
  },
  {
    test: /row-level security|rls|permission denied|forbidden|admin only/i,
    message: "You do not have permission to do that on this account.",
  },
  {
    test: /failed to fetch|networkerror|load failed|err_internet_disconnected/i,
    message: "Could not reach the server. Check your connection and try again.",
  },
  {
    test: /unexpected token|<!doctype|is not valid json|json\.parse/i,
    message: "That action is not available on this deployment yet.",
  },
  {
    test: /duplicate key|already exists|unique constraint/i,
    message: "That entry already exists.",
  },
  {
    test: /timeout|timed out|aborted/i,
    message: "That took too long and was stopped. Try again.",
  },
];

let diagnosticsAudience = false;

/** Allow raw errors through for signed-in admins who can act on them. */
export function setDiagnosticsAudience(isAdmin: boolean): void {
  diagnosticsAudience = !!isAdmin;
}

export function hasDiagnosticsAudience(): boolean {
  return diagnosticsAudience;
}

function rawMessage(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  const maybe = error as { message?: unknown; error?: unknown };
  if (typeof maybe.message === "string") return maybe.message;
  if (typeof maybe.error === "string") return maybe.error;
  return "";
}

/**
 * @param error   anything thrown or returned by Supabase / fetch / a server fn
 * @param fallback what to say when the error carries no useful text
 * @param force   bypass admin passthrough (public surfaces)
 */
export function publicMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
  force = false,
): string {
  const raw = rawMessage(error).trim();
  if (raw) console.error("[myafriartx]", raw, error);
  if (!raw) return fallback;

  if (diagnosticsAudience && !force) return raw;

  const matched = PATTERNS.find((p) => p.test.test(raw));
  if (matched) return matched.message;

  // Messages we wrote ourselves are already visitor-safe; anything with stack or
  // internal punctuation is not worth showing.
  if (raw.length <= 180 && !/\bat\s+\w+\s*\(|\bError:|\bstack\b/i.test(raw)) return raw;
  return fallback;
}
