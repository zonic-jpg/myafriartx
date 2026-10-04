import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, RefreshCw, ShieldCheck, ShieldPlus, X } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  decideSignup,
  fetchSignupQueue,
  setMemberRole,
  setRequireApprovals,
  type GrantableRole,
  type SignupQueue,
  type SignupRow,
} from "@/lib/signupApproval";

function when(iso?: string | null) {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

const btnPrimary =
  "inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50";
const btnGhost =
  "inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50";

/**
 * Owner-only approvals page (Admin -> Approvals; deep link /admin?tab=approvals).
 * One tap grants content-management admin; the "require approvals" switch gates
 * brand-new sign-ups. All writes are owner-only RPCs — this UI is a convenience.
 */
export function SignupApprovalsAdmin() {
  const [queue, setQueue] = useState<SignupQueue | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setQueue(await fetchSignupQueue());
    setLoading(false);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async (on: boolean) => {
    setBusy("toggle");
    const r = await setRequireApprovals(on);
    setBusy(null);
    if (!r.ok) return void toast.error(r.message ?? "Could not change the setting");
    toast.success(on ? "New sign-ups now need your approval" : "Sign-in is open to everyone again");
    void load();
  };

  const decide = async (row: SignupRow, decision: "approve" | "reject", role: GrantableRole = "user") => {
    setBusy(row.user_id);
    const r = await decideSignup(row.user_id, decision, role);
    setBusy(null);
    if (!r.ok) return void toast.error(r.message ?? "Could not save the decision");
    toast.success(
      decision === "reject"
        ? `${row.email} rejected`
        : role === "admin"
          ? `${row.email} is now an admin`
          : `${row.email} approved`,
    );
    void load();
  };

  const setRole = async (row: SignupRow, role: GrantableRole) => {
    setBusy(row.user_id);
    const r = await setMemberRole(row.user_id, role);
    setBusy(null);
    if (!r.ok) return void toast.error(r.message ?? "Could not change the role");
    toast.success(role === "admin" ? `${row.email} is now an admin` : `Admin removed from ${row.email}`);
    void load();
  };

  if (loading) return <Skeleton className="h-48 w-full" />;
  if (!queue) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
        Approvals are not available yet on this project (the database update has not been applied), or you are
        not signed in as the owner.
      </div>
    );
  }

  const row = "flex flex-col gap-3 rounded-lg border border-border bg-background p-3 sm:flex-row sm:items-center";

  return (
    <div className="space-y-5" id="signup-approvals">
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm">
            <h2 className="flex items-center gap-2 font-display text-lg">
              <ShieldCheck className="h-5 w-5 text-primary" aria-hidden /> Sign-in policy
            </h2>
            <p className="mt-1 font-medium">Require approval for new accounts</p>
            <p className="text-muted-foreground">
              Off (default): anyone can sign in. On: new accounts wait here until you approve them and choose a
              role. People already signed up are never locked out, and you are never gated.
            </p>
          </div>
          <Switch
            checked={queue.requireApprovals}
            disabled={busy === "toggle"}
            onCheckedChange={(v) => void toggle(v)}
            aria-label="Require approval for new accounts"
          />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg">Waiting for approval ({queue.pending.length})</h2>
          <button type="button" onClick={() => void load()} className={btnGhost}>
            <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Refresh
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {queue.pending.length === 0 && (
            <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
              Nobody is waiting.
            </p>
          )}
          {queue.pending.map((r) => (
            <div key={r.user_id} className={row}>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{r.email}</p>
                <p className="text-xs text-muted-foreground">
                  {r.requested_role === "admin" ? "Asked for admin access · " : ""}
                  {when(r.requested_at)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={busy === r.user_id} onClick={() => void decide(r, "approve", "admin")} className={btnPrimary}>
                  {busy === r.user_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldPlus className="h-3.5 w-3.5" />}
                  Approve as admin
                </button>
                <button type="button" disabled={busy === r.user_id} onClick={() => void decide(r, "approve", "user")} className={btnGhost}>
                  <Check className="h-3.5 w-3.5" aria-hidden /> Approve as user
                </button>
                <button type="button" disabled={busy === r.user_id} onClick={() => void decide(r, "reject")} className={`${btnGhost} text-destructive`}>
                  <X className="h-3.5 w-3.5" aria-hidden /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {queue.adminRequests.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-display text-lg">Asked for admin access ({queue.adminRequests.length})</h2>
          <div className="mt-3 space-y-2">
            {queue.adminRequests.map((r) => (
              <div key={r.user_id} className={row}>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{r.email}</p>
                  <p className="text-xs text-muted-foreground">Requested {when(r.admin_requested_at)}</p>
                </div>
                <button type="button" disabled={busy === r.user_id} onClick={() => void setRole(r, "admin")} className={btnPrimary}>
                  <ShieldPlus className="h-3.5 w-3.5" aria-hidden /> Make admin
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-display text-lg">Members ({queue.members.length})</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Everyone who has signed in. Admins get full content management; only you can change roles.
        </p>
        <div className="mt-3 space-y-2">
          {queue.members.map((r) => (
            <div key={r.user_id} className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">{r.email}</span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {r.is_owner ? "Owner" : r.is_admin ? "Admin" : "User"}
                </span>
                {!r.is_owner &&
                  (r.is_admin ? (
                    <button type="button" disabled={busy === r.user_id} onClick={() => void setRole(r, "user")} className={btnGhost}>
                      Remove admin
                    </button>
                  ) : (
                    <button type="button" disabled={busy === r.user_id} onClick={() => void setRole(r, "admin")} className={btnPrimary}>
                      Make admin
                    </button>
                  ))}
              </span>
            </div>
          ))}
          {queue.members.length === 0 && <p className="text-sm text-muted-foreground">No members yet.</p>}
        </div>
      </section>

      {queue.rejected.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-display text-lg">Rejected ({queue.rejected.length})</h2>
          <div className="mt-3 space-y-2">
            {queue.rejected.map((r) => (
              <div key={r.user_id} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate">{r.email}</span>
                <button type="button" disabled={busy === r.user_id} onClick={() => void decide(r, "approve", "user")} className={btnGhost}>
                  Approve as user
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
