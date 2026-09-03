/**
 * Additive uniform cross-platform tester gate for MyAfriArtX.
 * ANY email/username + orbit admin password → client-side admin access.
 * Owner email is recognised as owner (highest role). Does not replace
 * server-side assertAdmin / RLS — this is the AUTH.md orbit gate.
 */
export const OWNER_EMAIL = "oadeagbo@gmail.com";
const GATE_KEY = "myafriart_admin_gate_v1";

/** Zonic orbit standard (AUTH.md) — case-insensitive; production uses approval gate. */
const ORBIT_ADMIN_PASSWORD = "zonicgate2026";

const DEV_ADMIN_PASSWORD = (import.meta as any).env?.VITE_DEV_ADMIN_PASSWORD as string | undefined;
const IS_PROD = Boolean((import.meta as any).env?.PROD);

export function isOrbitAdminPassword(password: string): boolean {
  return String(password ?? "").trim().toLowerCase() === ORBIT_ADMIN_PASSWORD;
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

export function saveAdminGate(email: string): void {
  try {
    const norm = String(email || "").trim().toLowerCase() || "admin";
    const role = isOwnerEmail(norm) ? "owner" : "admin";
    localStorage.setItem(GATE_KEY, JSON.stringify({ email: norm, role, ts: Date.now() }));
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

export function clearAdminGate(): void {
  try {
    localStorage.removeItem(GATE_KEY);
  } catch {
    /* ignore */
  }
}
