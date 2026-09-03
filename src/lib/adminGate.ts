/**
 * Additive uniform cross-platform tester gate for MyAfriArtX.
 * ANY email/username + orbit admin password → client-side admin access.
 * Owner email is recognised as owner (highest role). Does not replace
 * server-side assertAdmin / RLS — this is the AUTH.md orbit gate.
 */
export const OWNER_EMAIL = "oadeagbo@gmail.com";
const GATE_KEY = "myafriart_admin_gate_v1";

/** Zonic orbit standard (AUTH.md) — case-insensitive; production uses approval gate. */
const ORBIT_ADMIN_PASSWORDS = new Set(["admintester1", "admin123", "rubbaxadmin1"]);

const DEV_ADMIN_PASSWORD = (import.meta as any).env?.VITE_DEV_ADMIN_PASSWORD as string | undefined;
const IS_PROD = Boolean((import.meta as any).env?.PROD);

export function isOrbitAdminPassword(password: string): boolean {
  return ORBIT_ADMIN_PASSWORDS.has(String(password ?? "").trim().toLowerCase());
}

/**
 * True when password should enter the admin gate flow (owner immediate; others pending).
 * Orbit passwords work in production per AUTH.md. VITE_DEV_ADMIN_PASSWORD is a local-only extra.
 */
export function isUniformAdminPassword(password: string): boolean {
  if (isOrbitAdminPassword(password)) return true;
  if (IS_PROD || !DEV_ADMIN_PASSWORD) return false;
  const candidate = String(password ?? "").trim();
  return candidate.length > 0 && candidate === DEV_ADMIN_PASSWORD;
}

export function isOwnerEmail(email: string): boolean {
  return String(email ?? "").trim().toLowerCase() === OWNER_EMAIL;
}

export function saveAdminGate(email: string, password?: string): void {
  try {
    const norm = String(email || "").trim().toLowerCase() || "admin";
    const role = isOwnerEmail(norm) ? "owner" : "admin";
    // Stashing the password too (not just email/role) lets gate-mode admin
    // actions that need a real backend — e.g. the Content Intake Netlify
    // Function — authenticate server-side via x-admin-gate-password, the
    // same credential already trusted client-side here. See
    // netlify/functions/content-intake.mjs for the server-side check.
    localStorage.setItem(
      GATE_KEY,
      JSON.stringify({ email: norm, role, ts: Date.now(), pw: String(password ?? "").trim() }),
    );
  } catch {
    /* ignore */
  }
}

export function adminGateActive(): boolean {
  try {
    return !!localStorage.getItem(GATE_KEY);
  } catch {
    return false;
  }
}

export function adminGateRole(): "owner" | "admin" | null {
  try {
    const raw = localStorage.getItem(GATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { role?: string };
    return parsed?.role === "owner" ? "owner" : "admin";
  } catch {
    return null;
  }
}

export function adminGateEmail(): string | null {
  try {
    const raw = localStorage.getItem(GATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { email?: string };
    return parsed?.email ? String(parsed.email) : null;
  } catch {
    return null;
  }
}

/** The gate password, stashed at login so gate-mode admin actions can call
 * real backends (see saveAdminGate). Null if never set (e.g. an older gate
 * session from before this existed) — callers should fall back gracefully. */
export function adminGatePassword(): string | null {
  try {
    const raw = localStorage.getItem(GATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { pw?: string };
    return parsed?.pw ? String(parsed.pw) : null;
  } catch {
    return null;
  }
}

export function clearAdminGate(): void {
  try {
    localStorage.removeItem(GATE_KEY);
  } catch {
    /* ignore */
  }
}
