const UNIFORM_ADMIN_PASSWORD = "ADMINTESTER1";
const OWNER_EMAIL$1 = "oadeagbo@gmail.com";
const GATE_KEY = "myafriart_admin_gate_v1";
const ADMIN_PASSWORDS$1 = [UNIFORM_ADMIN_PASSWORD, "admin123", "rubbaxadmin1"];
function isUniformAdminPassword(password) {
  const candidate = String(password ?? "").trim().toLowerCase();
  return ADMIN_PASSWORDS$1.some((p) => p.toLowerCase() === candidate);
}
function isOwnerEmail$1(email) {
  return String(email ?? "").trim().toLowerCase() === OWNER_EMAIL$1;
}
function saveAdminGate(email) {
  try {
    const norm2 = String(email || "").trim().toLowerCase() || "admin";
    const role = isOwnerEmail$1(norm2) ? "owner" : "admin";
    localStorage.setItem(GATE_KEY, JSON.stringify({ email: norm2, role, ts: Date.now() }));
  } catch {
  }
}
function adminGateActive() {
  try {
    return !!localStorage.getItem(GATE_KEY);
  } catch {
    return false;
  }
}
function clearAdminGate() {
  try {
    localStorage.removeItem(GATE_KEY);
  } catch {
  }
}
const OWNER_EMAIL = "oadeagbo@gmail.com";
const APPROVAL_STORE_KEY = "zonic_admintester_approval_v1";
const ADMIN_PASSWORDS = ["ADMINTESTER1", "admin123", "rubbaxadmin1"];
const AWAITING_MSG = "Awaiting approval — the owner must approve your admin access before you can sign in. You will be notified once approved.";
function isSharedAdminPassword(password) {
  const candidate = String(password ?? "").trim().toLowerCase();
  return ADMIN_PASSWORDS.some((p) => p.toLowerCase() === candidate);
}
function isOwnerEmail(email) {
  return String(email ?? "").trim().toLowerCase() === OWNER_EMAIL;
}
function identityToEmail(identity) {
  const raw = String(identity || "").trim();
  if (!raw) return "";
  if (raw.includes("@")) return raw.toLowerCase();
  const safe = raw.replace(/[^a-zA-Z0-9._+-]/g, "").toLowerCase() || "user";
  return `${safe}@admin.local`;
}
function loadStore() {
  try {
    const raw = localStorage.getItem(APPROVAL_STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
  }
  return { pending: [], approved: [], revoked: [] };
}
function saveStore(store) {
  try {
    localStorage.setItem(APPROVAL_STORE_KEY, JSON.stringify(store));
  } catch {
  }
}
const norm = identityToEmail;
function isApproved(email) {
  const e = norm(email);
  if (isOwnerEmail(e)) return true;
  if (loadStore().revoked.some((r) => norm(r.email) === e)) return false;
  return loadStore().approved.some((a) => norm(a.email) === e);
}
function listPendingQueue(appFilter) {
  const pending = loadStore().pending.filter((p) => !isApproved(p.email));
  return pending.filter((p) => !p.app || p.app === appFilter);
}
function listApprovedAdmins() {
  return loadStore().approved;
}
async function notifyOwnerPending(requesterEmail, appId) {
  try {
    const url = void 0;
    if (url) ;
  } catch {
  }
}
function queuePendingApproval(identity, appId = "myafriartx") {
  const email = norm(identity);
  if (!email || isOwnerEmail(email)) return { ok: true, status: "owner" };
  if (isApproved(email)) return { ok: true, status: "approved" };
  const store = loadStore();
  if (!store.pending.some((p) => norm(p.email) === email)) {
    store.pending.unshift({
      email,
      identity: String(identity || "").trim(),
      app: appId,
      requestedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    saveStore(store);
    void notifyOwnerPending(email, appId);
  }
  return { ok: false, status: "pending", email, message: AWAITING_MSG };
}
function resolveAdminGateLogin(identity, password, appId = "myafriartx") {
  if (!isSharedAdminPassword(password)) return { ok: false, status: "not_admin_password" };
  const email = norm(identity);
  if (!email) return { ok: false, status: "invalid", message: "Enter any email with admin password." };
  if (isOwnerEmail(email)) return { ok: true, status: "owner", email };
  if (loadStore().revoked.some((r) => norm(r.email) === email)) {
    return {
      ok: false,
      status: "revoked",
      email,
      message: "Admin access was revoked. Contact the owner to request access again."
    };
  }
  if (isApproved(email)) return { ok: true, status: "approved", email };
  return queuePendingApproval(identity, appId);
}
function approveAdmin(actorEmail, targetEmail) {
  if (!isOwnerEmail(actorEmail)) return { ok: false, error: "Only the owner can approve." };
  const email = norm(targetEmail);
  const store = loadStore();
  store.pending = store.pending.filter((p) => norm(p.email) !== email);
  store.revoked = store.revoked.filter((r) => norm(r.email) !== email);
  store.approved.unshift({ email, approvedAt: (/* @__PURE__ */ new Date()).toISOString(), approvedBy: OWNER_EMAIL });
  saveStore(store);
  return { ok: true, email };
}
function revokeAdmin(actorEmail, targetEmail) {
  if (!isOwnerEmail(actorEmail)) return { ok: false, error: "Only the owner can revoke." };
  const email = norm(targetEmail);
  if (isOwnerEmail(email)) return { ok: false, error: "Cannot revoke owner." };
  const store = loadStore();
  store.approved = store.approved.filter((a) => norm(a.email) !== email);
  store.pending = store.pending.filter((p) => norm(p.email) !== email);
  store.revoked.unshift({ email, revokedAt: (/* @__PURE__ */ new Date()).toISOString(), revokedBy: OWNER_EMAIL });
  saveStore(store);
  return { ok: true, email };
}
export {
  AWAITING_MSG as A,
  OWNER_EMAIL as O,
  isOwnerEmail$1 as a,
  listApprovedAdmins as b,
  approveAdmin as c,
  revokeAdmin as d,
  adminGateActive as e,
  clearAdminGate as f,
  isUniformAdminPassword as i,
  listPendingQueue as l,
  resolveAdminGateLogin as r,
  saveAdminGate as s
};
