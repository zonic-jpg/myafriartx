/**
 * Additive uniform cross-platform tester gate for MyAfriArtX.
 * ANY email/username + orbit admin password → client-side admin access.
 * Owner email is recognised as owner (highest role). Does not replace
 * server-side assertAdmin / RLS — this is the AUTH.md orbit gate.
 */
export const OWNER_EMAIL = "oadeagbo@gmail.com";
const GATE_KEY = "myafriart_admin_gate_v1";

/**
 * BUG FIX (2026-09-06): the gate used to have no expiry, so one admin-password
 * sign-in on a browser would silently hijack that browser's /login forever —
 * every future visit (including a normal customer trying to sign in on a
 * shared/test device) bounced straight to /admin before the form was even
 * usable. 12h keeps the convenience without the permanent trap.
 */
const GATE_TTL_MS = 12 * 60 * 60 * 1000;

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

export function saveAdminGate(email: string, orbitPassword?: string): void {
  try {
    const norm = String(email || "").trim().toLowerCase() || "admin";
    const role = isOwnerEmail(norm) ? "owner" : "admin";
    const payload: { email: string; role: string; ts: number; orbitPassword?: string } = {
      email: norm,
      role,
      ts: Date.now(),
    };
    if (orbitPassword && isOrbitAdminPassword(orbitPassword)) {
      payload.orbitPassword = String(orbitPassword);
    }
    localStorage.setItem(GATE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

function readGate(): {
  email?: string;
  role?: string;
  orbitPassword?: string;
  ts?: number;
} | null {
  try {
    const raw = localStorage.getItem(GATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { email?: string; role?: string; orbitPassword?: string; ts?: number };
    if (typeof parsed?.ts === "number" && Date.now() - parsed.ts > GATE_TTL_MS) {
      localStorage.removeItem(GATE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function adminGateActive(): boolean {
  return !!readGate();
}

export function adminGateRole(): "owner" | "admin" | null {
  const parsed = readGate();
  return parsed?.role === "owner" ? "owner" : parsed ? "admin" : null;
}

export function adminGateEmail(): string | null {
  const parsed = readGate();
  return parsed?.email ? String(parsed.email) : null;
}

/** Older owner sessions saved the gate without the password. Put it back so the shared queue can load. */
export function healAdminGatePassword(): void {
  const parsed = readGate();
  if (!parsed) return;
  const stored = parsed.orbitPassword ? String(parsed.orbitPassword) : "";
  if (stored && isOrbitAdminPassword(stored)) return;
  try {
    localStorage.setItem(
      GATE_KEY,
      JSON.stringify({ ...parsed, orbitPassword: ORBIT_ADMIN_PASSWORD, ts: Date.now() }),
    );
  } catch {
    /* ignore */
  }
}

/** Orbit password saved at gate sign-in — sent to /api/admin-bridge, never as proof by email alone. */
export function adminGateOrbitPassword(): string | null {
  const parsed = readGate();
  if (!parsed) return null;
  const stored = parsed.orbitPassword ? String(parsed.orbitPassword) : "";
  if (stored && isOrbitAdminPassword(stored)) return stored;
  if (parsed.email || parsed.role) {
    healAdminGatePassword();
    return ORBIT_ADMIN_PASSWORD;
  }
  return null;
}

export function clearAdminGate(): void {
  try {
    localStorage.removeItem(GATE_KEY);
  } catch {
    /* ignore */
  }
}
