/**
 * Super-admin signup approvals (client side).
 *
 * Default behaviour is unchanged: sign-in is open. The founding owner can flip
 * "require approvals" on from Admin -> Approvals; new accounts then wait as
 * "pending" until the owner approves them (with a role). Server side lives in
 * supabase/migrations/20261004120000_signup_approvals.sql.
 *
 * Everything here FAILS OPEN: if the RPCs are missing (migration not applied
 * yet) or the network hiccups, a signed-in person is treated as approved — the
 * database, not this client, is the authority on what they can do.
 */
import { supabase } from "@/integrations/supabase/client";

export type ApprovalStatus = "approved" | "pending" | "rejected";
export type GrantableRole = "user" | "admin";

export type SignupRow = {
  user_id: string;
  email: string;
  requested_role: GrantableRole;
  status: ApprovalStatus;
  granted_role?: string | null;
  requested_at: string;
  decided_at?: string | null;
  admin_requested_at?: string | null;
  is_admin?: boolean;
  is_owner?: boolean;
};

export type SignupQueue = {
  requireApprovals: boolean;
  pending: SignupRow[];
  adminRequests: SignupRow[];
  members: SignupRow[];
  rejected: SignupRow[];
};

type RpcResult = { data: unknown; error: { message: string } | null };
type RpcClient = { rpc: (name: string, args?: Record<string, unknown>) => Promise<RpcResult> };
const client = () => supabase as unknown as RpcClient;

const rec = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
const rows = (v: unknown): SignupRow[] => (Array.isArray(v) ? (v as SignupRow[]) : []);

/** Where the owner's email link and in-app alerts point (real admin URL + tab deep link). */
export const APPROVALS_PATH = "/admin?tab=approvals";

/** Called after every sign-in. Never throws; unknown -> "approved" (fail open). */
export async function registerSignup(requestedRole: GrantableRole = "user"): Promise<ApprovalStatus> {
  try {
    const { data, error } = await client().rpc("register_signup", { _requested_role: requestedRole });
    if (error) return "approved";
    const s = rec(data).status;
    return s === "pending" || s === "rejected" ? s : "approved";
  } catch {
    return "approved";
  }
}

/** A signed-in non-admin asks the owner for content-management admin. */
export async function requestAdminAccess(): Promise<{ ok: boolean; status?: string; message?: string }> {
  try {
    const { data, error } = await client().rpc("request_admin_access");
    if (error) return { ok: false, message: error.message };
    const status = String(rec(data).status ?? "requested");
    if (status === "requested") void notifyOwner("admin_request");
    return { ok: true, status };
  } catch (err) {
    return { ok: false, message: (err as { message?: string })?.message };
  }
}

export async function fetchSignupQueue(): Promise<SignupQueue | null> {
  try {
    const { data, error } = await client().rpc("list_signup_approvals");
    if (error) return null;
    const q = rec(data);
    return {
      requireApprovals: q.require_approvals === true,
      pending: rows(q.pending),
      adminRequests: rows(q.admin_requests),
      members: rows(q.members),
      rejected: rows(q.rejected),
    };
  } catch {
    return null;
  }
}

async function call(name: string, args: Record<string, unknown>): Promise<{ ok: boolean; message?: string }> {
  try {
    const { data, error } = await client().rpc(name, args);
    if (error) return { ok: false, message: error.message };
    return { ok: rec(data).ok === true };
  } catch (err) {
    return { ok: false, message: (err as { message?: string })?.message };
  }
}

export const decideSignup = (userId: string, decision: "approve" | "reject", role: GrantableRole = "user") =>
  call("decide_signup", { _user_id: userId, _decision: decision, _role: role });

/** One-tap "Make admin" / "Remove admin" for an existing member. */
export const setMemberRole = (userId: string, role: GrantableRole) =>
  call("set_member_role", { _user_id: userId, _role: role });

export const setRequireApprovals = (on: boolean) => call("set_require_approvals", { _on: on });

/**
 * Ask the server to email the owner. The recipient is fixed server-side; the
 * caller can only say *what* is waiting. Fire-and-forget — the in-app queue is
 * the source of truth, the email is a convenience, and failure is silent.
 */
export async function notifyOwner(kind: "signup" | "admin_request"): Promise<void> {
  try {
    const { notifyOwnerApproval } = await import("@/lib/signup-approval.functions");
    await notifyOwnerApproval({ data: { kind } });
  } catch (err) {
    console.warn("[approvals] owner notification skipped", err);
  }
}
