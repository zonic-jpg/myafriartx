/**
 * Zonic ADMINTESTER approval — MyAfriArtX.
 * Orbit standard: ~/Downloads/MyYangaX-COMPLETE/AUTH.md
 *
 * The queue used to live only in localStorage, which meant a tester's request
 * was recorded on the tester's own device and the owner's admin page had nothing
 * to read. `public.admin_access_requests` is now the source of truth (reached
 * through /api/admin-bridge); the local store is kept as an offline mirror so a
 * request is never lost when the bridge is unreachable.
 */
import { isUniformAdminPassword } from "./adminGate";
import { BridgeUnavailableError, callAdminBridge, type AccessRequest } from "./admin-bridge";

export const OWNER_EMAIL = "oadeagbo@gmail.com";
export const APPROVAL_STORE_KEY = "zonic_admintester_approval_v1";
export const AWAITING_MSG =
  "Awaiting approval — the owner must approve your admin access before you can sign in. You will be notified once approved.";

export function isSharedAdminPassword(password: unknown): boolean {
  return isUniformAdminPassword(String(password ?? ""));
}

export function isOwnerEmail(email: string): boolean {
  return String(email ?? "").trim().toLowerCase() === OWNER_EMAIL;
}

export function identityToEmail(identity: string): string {
  const raw = String(identity || "").trim();
  if (!raw) return "";
  if (raw.includes("@")) return raw.toLowerCase();
  const safe = raw.replace(/[^a-zA-Z0-9._+-]/g, "").toLowerCase() || "user";
  return `${safe}@admin.local`;
}

type Store = {
  pending: Array<{ email: string; identity?: string; app?: string; requestedAt: string }>;
  approved: Array<{ email: string; approvedAt: string; approvedBy: string }>;
  revoked: Array<{ email: string; revokedAt: string; revokedBy: string }>;
};

function loadStore(): Store {
  try {
    const raw = localStorage.getItem(APPROVAL_STORE_KEY);
    if (raw) return JSON.parse(raw) as Store;
  } catch {
    /* seed */
  }
  return { pending: [], approved: [], revoked: [] };
}

function saveStore(store: Store) {
  try {
    localStorage.setItem(APPROVAL_STORE_KEY, JSON.stringify(store));
  } catch {
    /* ignore */
  }
}

const norm = identityToEmail;

export function isApproved(email: string) {
  const e = norm(email);
  if (isOwnerEmail(e)) return true;
  if (loadStore().revoked.some((r) => norm(r.email) === e)) return false;
  return loadStore().approved.some((a) => norm(a.email) === e);
}

export function listPendingQueue(appFilter?: string) {
  const pending = loadStore().pending.filter((p) => !isApproved(p.email));
  return appFilter ? pending.filter((p) => !p.app || p.app === appFilter) : pending;
}

export function listApprovedAdmins() {
  return loadStore().approved;
}

export async function notifyOwnerPending(requesterEmail: string, appId: string) {
  try {
    const url = import.meta.env.VITE_ZONIC_NOTIFY_URL;
    if (url) {
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: OWNER_EMAIL, requester: requesterEmail, app: appId }),
      });
    }
  } catch {
    /* fail-open */
  }
}

export function queuePendingApproval(identity: string, appId = "myafriartx") {
  const email = norm(identity);
  if (!email || isOwnerEmail(email)) return { ok: true as const, status: "owner" as const };
  if (isApproved(email)) return { ok: true as const, status: "approved" as const };
  const store = loadStore();
  if (!store.pending.some((p) => norm(p.email) === email)) {
    store.pending.unshift({
      email,
      identity: String(identity || "").trim(),
      app: appId,
      requestedAt: new Date().toISOString(),
    });
    saveStore(store);
    void notifyOwnerPending(email, appId);
  }
  return { ok: false as const, status: "pending" as const, email, message: AWAITING_MSG };
}

export function resolveAdminGateLogin(identity: string, password: string, appId = "myafriartx") {
  if (!isSharedAdminPassword(password)) return { ok: false as const, status: "not_admin_password" as const };
  const email = norm(identity);
  if (!email) return { ok: false as const, status: "invalid" as const, message: "Enter any email with admin password." };
  if (isOwnerEmail(email)) return { ok: true as const, status: "owner" as const, email };
  if (loadStore().revoked.some((r) => norm(r.email) === email)) {
    return {
      ok: false as const,
      status: "revoked" as const,
      email,
      message: "Admin access was revoked. Contact the owner to request access again.",
    };
  }
  if (isApproved(email)) return { ok: true as const, status: "approved" as const, email };
  return queuePendingApproval(identity, appId);
}

export function approveAdmin(actorEmail: string, targetEmail: string) {
  if (!isOwnerEmail(actorEmail)) return { ok: false as const, error: "Only the owner can approve." };
  const email = norm(targetEmail);
  const store = loadStore();
  store.pending = store.pending.filter((p) => norm(p.email) !== email);
  store.revoked = store.revoked.filter((r) => norm(r.email) !== email);
  store.approved.unshift({ email, approvedAt: new Date().toISOString(), approvedBy: OWNER_EMAIL });
  saveStore(store);
  return { ok: true as const, email };
}

export function revokeAdmin(actorEmail: string, targetEmail: string) {
  if (!isOwnerEmail(actorEmail)) return { ok: false as const, error: "Only the owner can revoke." };
  const email = norm(targetEmail);
  if (isOwnerEmail(email)) return { ok: false as const, error: "Cannot revoke owner." };
  const store = loadStore();
  store.approved = store.approved.filter((a) => norm(a.email) !== email);
  store.pending = store.pending.filter((p) => norm(p.email) !== email);
  store.revoked.unshift({ email, revokedAt: new Date().toISOString(), revokedBy: OWNER_EMAIL });
  saveStore(store);
  return { ok: true as const, email };
}

/* ── Server-backed queue ──────────────────────────────────────────────────── */

export const REJECTED_MSG =
  "Admin access was declined. Contact the owner if you think this is a mistake.";

/**
 * Sign-in decision that consults the shared queue first. Falls back to the local
 * store (previous behaviour) when the bridge is unreachable, so a tester offline
 * or on a deployment without the function still gets a sensible answer.
 */
export async function resolveAdminGateLoginRemote(
  identity: string,
  password: string,
  appId = "myafriartx",
) {
  const local = resolveAdminGateLogin(identity, password, appId);
  if (local.status === "not_admin_password" || local.status === "invalid" || local.status === "owner") {
    return local;
  }

  const email = norm(identity);
  try {
    const res = await callAdminBridge<{ status: string }>("access.request", {
      email,
      identity: String(identity || "").trim(),
    });
    if (res.status === "owner" || res.status === "approved") {
      approveAdmin(OWNER_EMAIL, email);
      return { ok: true as const, status: "approved" as const, email };
    }
    if (res.status === "rejected") {
      return { ok: false as const, status: "revoked" as const, email, message: REJECTED_MSG };
    }
    return { ok: false as const, status: "pending" as const, email, message: AWAITING_MSG };
  } catch (e) {
    if (e instanceof BridgeUnavailableError) return local;
    return local;
  }
}

export type PendingEntry = {
  email: string;
  identity: string | null;
  requestedAt: string;
  status: "pending" | "approved" | "rejected";
  decidedAt: string | null;
  decidedBy: string | null;
  source: "server" | "device";
};

function localEntries(): PendingEntry[] {
  const store = loadStore();
  const pending: PendingEntry[] = store.pending.map((p) => ({
    email: norm(p.email),
    identity: p.identity ?? null,
    requestedAt: p.requestedAt,
    status: "pending",
    decidedAt: null,
    decidedBy: null,
    source: "device",
  }));
  const approved: PendingEntry[] = store.approved.map((a) => ({
    email: norm(a.email),
    identity: null,
    requestedAt: a.approvedAt,
    status: "approved",
    decidedAt: a.approvedAt,
    decidedBy: a.approvedBy,
    source: "device",
  }));
  return [...pending, ...approved];
}

/** Shared queue merged with anything this device recorded while offline. */
export async function listAccessRequests(): Promise<{
  entries: PendingEntry[];
  serverReachable: boolean;
  notice: string | null;
}> {
  const local = localEntries();
  try {
    const res = await callAdminBridge<{ requests: AccessRequest[] }>("access.list");
    const server: PendingEntry[] = (res.requests ?? []).map((r) => ({
      email: norm(r.email),
      identity: r.identity,
      requestedAt: r.requested_at,
      status: r.status,
      decidedAt: r.decided_at,
      decidedBy: r.decided_by,
      source: "server",
    }));
    const seen = new Set(server.map((s) => s.email));
    const merged = [...server, ...local.filter((l) => !seen.has(l.email))];
    merged.sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
    return { entries: merged, serverReachable: true, notice: null };
  } catch (e) {
    local.sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
    return {
      entries: local,
      serverReachable: false,
      notice:
        e instanceof BridgeUnavailableError
          ? e.message
          : "Showing this device's copy of the queue — the shared queue could not be loaded.",
    };
  }
}

export async function decideAccessRequest(email: string, decision: "approved" | "rejected") {
  if (decision === "approved") approveAdmin(OWNER_EMAIL, email);
  else revokeAdmin(OWNER_EMAIL, email);
  await callAdminBridge("access.decide", { email: norm(email), decision });
  return { ok: true as const };
}
