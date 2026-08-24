/**
 * Additive uniform cross-platform tester gate for MyAfriArtX.
 * ANY email/username + UNIFORM_ADMIN_PASSWORD → client-side admin access.
 * The OWNER_EMAIL is additionally recognised as the owner (highest role) when
 * it signs in with the gate password. Does not touch Google / email+password /
 * existing Supabase auth.
 */
export const UNIFORM_ADMIN_PASSWORD = "ADMINTESTER1";
export const OWNER_EMAIL = "oadeagbo@gmail.com";
const GATE_KEY = "myafriart_admin_gate_v1";

/**
 * All passwords that unlock the admin gate for any email/username.
 * ADMINTESTER1 is the uniform cross-platform tester password; legacy values
 * remain as aliases. Matching is case-insensitive so admintester1 also works.
 */
export const ADMIN_PASSWORDS = [UNIFORM_ADMIN_PASSWORD, "admin123", "rubbaxadmin1"];

export function isUniformAdminPassword(password: string): boolean {
  const candidate = String(password ?? "").trim().toLowerCase();
  return ADMIN_PASSWORDS.some((p) => p.toLowerCase() === candidate);
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

export function clearAdminGate(): void {
  try {
    localStorage.removeItem(GATE_KEY);
  } catch {
    /* ignore */
  }
}
