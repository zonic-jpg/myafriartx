/**
 * Additive uniform cross-platform tester gate for MyAfriart.
 * ANY email/username + UNIFORM_ADMIN_PASSWORD → client-side admin access.
 * Does not touch Google / email+password / existing Supabase auth.
 */
export const UNIFORM_ADMIN_PASSWORD = "ADMINTESTER1";
const GATE_KEY = "myafriart_admin_gate_v1";

export function isUniformAdminPassword(password: string): boolean {
  return String(password ?? "") === UNIFORM_ADMIN_PASSWORD;
}

export function saveAdminGate(email: string): void {
  try {
    const norm = String(email || "").trim().toLowerCase() || "admin";
    localStorage.setItem(GATE_KEY, JSON.stringify({ email: norm, ts: Date.now() }));
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

export function clearAdminGate(): void {
  try {
    localStorage.removeItem(GATE_KEY);
  } catch {
    /* ignore */
  }
}
